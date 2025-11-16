import crypto from "crypto";
import { deriveAESKey } from "./encryptUserData.js";
import { objectIdHexToBigInt, randomBigIntBytes, maskBigInt, bigIntToObjectIdHex } from './objectIdUtils.js';
import { ensurePem } from './keyUtils.js';
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

// (Replaced) Use BigInt-based masking for ObjectId hex compatibility

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

    // Ensure PEM format for use with crypto
    const publicKeyForEncryption = ensurePem(electionCommissionPublicKey);

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
  encryptedVoterPublicKey,
  publicKeyIV,
  publicKeyAuthTag,
  encryptedPrivateKey,
  privateKeyIV,
  privateKeyAuthTag,
  privateKeySalt,
  password,
  electionCommissionPublicKey,
  encryptedToken,
  tokenIV,
  tokenAuthTag,
}) => {
  try {
    // Use server-side HMAC secret; do not accept from client
    const hmacSecretKey = process.env.HMAC_SECRET_KEY;
    if (!hmacSecretKey) {
      throw new Error("HMAC secret key not configured on server");
    }

    // Step 0: Derive AES key using Argon2
    const saltBuffer = Buffer.from(privateKeySalt, "hex");
    const { key: aesKey } = await deriveAESKey(password, saltBuffer);

    // Step 1: Decrypt the token
    let decryptedToken;
    try {
      decryptedToken = decryptUserData(
        encryptedToken,
        aesKey,
        tokenIV,
        tokenAuthTag
      );
    } catch (err) {
      // Provide a clear error so callers can surface a helpful message
      throw new Error(`TokenDecryptionFailed: ${err.message}`);
    }

    // Step 2: Generate random BigInt and mask the ObjectId (candidateId is hex string)
    const idBigInt = objectIdHexToBigInt(candidateId);
    const randBigInt = randomBigIntBytes(16); // 128-bit random nonce
    const maskedBigInt = maskBigInt(idBigInt, randBigInt);
    // represent as hex strings for serialization
    const maskedHex = maskedBigInt.toString(16);
    const randHex = randBigInt.toString(16);

    // Step 4: Sign the masked vote (just the masked vote number, not JSON)
    const decryptedPrivatePEM = decryptUserData(
      encryptedPrivateKey,
      aesKey,
      privateKeyIV,
      privateKeyAuthTag
    );
    
    // Sign canonical JSON including both masked and rand to bind them
    const signedPayloadStr = JSON.stringify({ masked: maskedHex, rand: randHex });
    const signature = crypto.sign("sha256", Buffer.from(signedPayloadStr, 'utf8'), {
      key: decryptedPrivatePEM,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    });

    // Step 5: Hash the decrypted token
    const tokenHash = await hashToken(decryptedToken, hmacSecretKey);

    // Debug: log short fingerprints (safe for short-term debug only)
    try {
      const fingerprint = (s) => (s && s.length > 12 ? `${s.slice(0,6)}...${s.slice(-6)}` : s);
      console.log(`VOTE_PREP: decryptedToken=${fingerprint(decryptedToken)} tokenHash=${fingerprint(tokenHash)}`);
    } catch (e) {
      // ignore logging errors
    }

    // Step 6: Encrypt the masked vote AND random together as JSON object
    // Build payload with hex strings and encrypt
    const votePayload = {
      masked: maskedHex,
      rand: randHex
    };

    const encryptedVote = await encryptWithElectionCommissionPublicKey(
      votePayload, // JSON with hex strings
      ensurePem(electionCommissionPublicKey)
    );

    // Return the required components in the correct format
    // Note: we no longer encrypt the voter's public key with the election commission public key
    return {
      encryptedVote,           // 1. encrypted JSON containing {masked: hex, rand: hex}
      signedVote: signature.toString("base64"), // 2. signature string (over JSON)
      tokenHash,               // 3. hashed token of user
    };
  } catch (err) {
    throw new Error(`prepareEncryptedVote Error: ${err.message}`);
  }
};
