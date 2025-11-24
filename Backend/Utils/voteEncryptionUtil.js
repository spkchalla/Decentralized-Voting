import crypto from "crypto";
import { deriveAESKey } from "./encryptUserData.js";
const AES_ALGO = "aes-256-gcm";

// HMAC-SHA256
export const hmacSHA256 = (data, secretKey) => {
  try {
    const hmac = crypto.createHmac("sha256", secretKey);
    hmac.update(data);
    return hmac.digest("hex");
  } catch (err) {
    throw new Error(`hmacSHA256 Error: ${err.message}`);
  }
};

// Generate Random no. for masking.
export const generateRandomInt = (max = 1000000) => {
  try {
    return crypto.randomInt(1, max);
  } catch (err) {
    throw new Error(`generateRandomInt Error: ${err.message}`);
  }
};

// Mask the candidate Id with the random number
export const maskVote = (candidateID, rand) => {
  try {
    if (!Number.isInteger(candidateID) || !Number.isInteger(rand)) {
      throw new Error("candidateID and rand must be INTEGERS!!");
    }
    return candidateID ^ rand;
  } catch (err) {
    throw new Error(`maskVote Error: ${err.message}`);
  }
};

// Add this decrypt function to voteEncryptionUtil.js
export const decryptUserData = (encryptedData, aesKey, iv, authTag) => {
  try {
    if (!Buffer.isBuffer(aesKey) || aesKey.length !== 32) {
      throw new Error("AES key must be a 32-byte Buffer");
    }

    const decipher = crypto.createDecipheriv(
      AES_ALGO,
      aesKey,
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

// Sign masked vote with voter's private key (pem)
export const signMaskedVote = async ({
  maskedVote,
  encryptedPrivateKey,
  privateKeyIV,
  privateKeyAuthTag,
  privateKeySalt,
  password,
}) => {
  try {
    const saltBuffer = Buffer.from(privateKeySalt, "hex");
    const { key: aesKey } = await deriveAESKey(password, saltBuffer);

    const decryptedPrivatePEM = decryptUserData(
      encryptedPrivateKey,
      aesKey,
      privateKeyIV,
      privateKeyAuthTag
    );

    const maskedVoteBuffer = Buffer.from(String(maskedVote), "utf8");

    const signature = crypto.sign("sha256", maskedVoteBuffer, {
      key: decryptedPrivatePEM,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    });

    return signature.toString("base64"); // Just the signature string
  } catch (err) {
    throw new Error(`signMaskedVote Error: ${err.message}`);
  }
};

// Hash token function
export const hashToken = async (token, secretKey) => {
  try {
    return hmacSHA256(token, secretKey);
  } catch (err) {
    throw new Error(`hashToken Error: ${err.message}`);
  }
};

// Encrypting the details with Election Commission public key
export const encryptWithElectionCommissionPublicKey = async (
  payload,
  electionCommissionPublicKey
) => {
  try {
    // Validate that electionCommissionPublicKey is provided
    if (!electionCommissionPublicKey) {
      throw new Error("electionCommissionPublicKey is required");
    }

    // Convert payload to JSON string and buffer
    const buffer = Buffer.from(JSON.stringify(payload));

    // Handle if public key is base64 encoded, convert to PEM format
    let publicKeyForEncryption = electionCommissionPublicKey;
    if (typeof electionCommissionPublicKey === 'string') {
      // Check if it's already in PEM format
      if (!electionCommissionPublicKey.includes('-----BEGIN')) {
        // If it looks like base64 or hex, try to convert it
        // Assume it's base64 encoded DER format and convert to PEM
        try {
          const keyBuffer = Buffer.from(electionCommissionPublicKey, 'base64');
          publicKeyForEncryption = `-----BEGIN PUBLIC KEY-----\n${keyBuffer.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
        } catch (conversionError) {
          // If conversion fails, use as-is and let crypto.publicEncrypt handle the error
          publicKeyForEncryption = electionCommissionPublicKey;
        }
      }
    }

    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyForEncryption,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer
    );

    return encrypted.toString("base64");
  } catch (err) {
    throw new Error(
      `encryptWithElectionCommissionPublicKey Error: ${err.message}`
    );
  }
};

// In voteEncryptionUtil.js - update the prepareEncryptedVote function
export const prepareEncryptedVote = async ({
  candidateId,
  encryptedPrivateKey,
  privateKeyIV,
  privateKeyAuthTag,
  privateKeySalt,
  password,
  electionCommissionPublicKey,
  encryptedToken,
  tokenIV,
  tokenAuthTag,
  hmacSecretKey,
}) => {
  try {
    if (!hmacSecretKey) {
      throw new Error("HMAC secret key is required");
    }

    // Step 0: Derive AES key using Argon2
    const saltBuffer = Buffer.from(privateKeySalt, "hex");
    const { key: aesKey } = await deriveAESKey(password, saltBuffer);

    // Step 1: Decrypt the token
    const decryptedToken = decryptUserData(
      encryptedToken,
      aesKey,
      tokenIV,
      tokenAuthTag
    );

    // Step 3: Generate random salt (for obfuscation, not XOR masking since we have ObjectId)
    const rand = generateRandomInt();
    // candidateId is now a MongoDB ObjectId string (24 hex chars)
    // We don't mask it with XOR since it's not a number, we just include it with random salt

    // Step 4: Create vote payload with candidateId and random salt
    const voteData = {
      candidateId: candidateId,  // MongoDB ObjectId string
      rand: rand                  // Random salt for additional obfuscation
    };

    // Convert voteData to string for signing
    const voteDataString = JSON.stringify(voteData);

    // Step 5: Sign the vote data
    const decryptedPrivatePEM = decryptUserData(
      encryptedPrivateKey,
      aesKey,
      privateKeyIV,
      privateKeyAuthTag
    );

    const voteDataBuffer = Buffer.from(voteDataString, "utf8");
    const signature = crypto.sign("sha256", voteDataBuffer, {
      key: decryptedPrivatePEM,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    });

    // Step 6: Hash the decrypted token
    const tokenHash = await hashToken(decryptedToken, hmacSecretKey);

    // Step 7: Encrypt the vote data (candidateId + rand) with EC's public key
    const encryptedVote = await encryptWithElectionCommissionPublicKey(
      voteData,  // Contains {candidateId, rand}
      electionCommissionPublicKey
    );

    // Return the required components
    return {
      encryptedVote,           // 1. encrypted JSON containing {candidateId, rand}
      signedVote: signature.toString("base64"), // 2. signature string only (not JSON)
      tokenHash,               // 3. hashed token of user
      // Note: voterPublicKey is NOT returned here - it's handled separately in voteController
    };
  } catch (err) {
    throw new Error(`prepareEncryptedVote Error: ${err.message}`);
  }
};
