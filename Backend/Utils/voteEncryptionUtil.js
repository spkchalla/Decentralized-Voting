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
// In voteEncryptionUtil.js - update prepareEncryptedVote function
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
}) => {
  try {
    // Use server-side HMAC secret; do not accept from client
    const hmacSecretKey = process.env.HMAC_SECRET_KEY;
    if (!hmacSecretKey) {
      throw new Error("HMAC secret key not configured on server");
    }

    // Step 0: Derive AES key using Argon2
    const saltBuffer = Buffer.from(privateKeySalt, 'hex');
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
      throw new Error(`TokenDecryptionFailed: ${err.message}`);
    }

    // Step 2: Generate random BigInt and mask the ObjectId
    const idBigInt = objectIdHexToBigInt(candidateId);
    const randBigInt = randomBigIntBytes(16); // 128-bit random nonce
    const maskedBigInt = maskBigInt(idBigInt, randBigInt);
    const maskedHex = maskedBigInt.toString(16);
    const randHex = randBigInt.toString(16);

    // Step 3: Sign the canonical JSON { masked, rand }
    const decryptedPrivatePEM = decryptUserData(
      encryptedPrivateKey,
      aesKey,
      privateKeyIV,
      privateKeyAuthTag
    );
    
    const signedPayloadStr = JSON.stringify({ masked: maskedHex, rand: randHex });
    const signature = crypto.sign("sha256", Buffer.from(signedPayloadStr, 'utf8'), {
      key: decryptedPrivatePEM,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    });

    // Step 4: Hash the decrypted token
    const tokenHash = await hashToken(decryptedToken, hmacSecretKey);

    // Step 5: Use HYBRID encryption (AES + RSA) instead of direct RSA
    // Generate a random AES key for this vote
    const voteAesKey = crypto.randomBytes(32);
    const voteIV = crypto.randomBytes(12);
    
    // Create the vote payload
    const votePayload = {
      masked: maskedHex,
      rand: randHex
    };

    // Encrypt the vote payload with AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', voteAesKey, voteIV);
    
    // ✅ FIXED: Changed comma to period
    let encryptedVotePayload = cipher.update(JSON.stringify(votePayload), 'utf8', 'hex');
    encryptedVotePayload += cipher.final('hex');
    const voteAuthTag = cipher.getAuthTag();

    // Encrypt the AES key with RSA (election commission public key)
    const encryptedAesKey = crypto.publicEncrypt(
      {
        key: ensurePem(electionCommissionPublicKey),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      voteAesKey
    );

    // Create the wrapper structure that decryptVoteWrapper expects
    const voteWrapper = {
      encryptedKey: encryptedAesKey.toString('base64'),
      iv: voteIV.toString('hex'),
      authTag: voteAuthTag.toString('hex'),
      ciphertext: encryptedVotePayload
    };

    // Convert the wrapper to base64 for storage
    const encryptedVote = Buffer.from(JSON.stringify(voteWrapper)).toString('base64');

    // Debug log to verify the structure
    console.log(`VOTE_PREP_HYBRID: encryptedVote length=${encryptedVote.length}, wrapper keys=${Object.keys(voteWrapper).join(',')}`);

    // Return the required components
    return {
      encryptedVote,           // Base64 encoded wrapper with encrypted AES key + encrypted vote
      signedVote: signature.toString("base64"), // Signature over the vote payload
      tokenHash,               // Hashed token of user
    };
  } catch (err) {
    throw new Error(`prepareEncryptedVote Error: ${err.message}`);
  }
};