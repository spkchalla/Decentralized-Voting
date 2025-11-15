import crypto from "crypto";
import { deriveAESKey } from "./encryptUserData.js";
import { bigIntToObjectIdHex, objectIdHexToBigInt } from "./objectIdUtils.js";
import { ensurePem } from "./keyUtils.js";

const AES_ALGO = "aes-256-gcm";

/**
 * Decrypt user data (AES-256-GCM)
 * Used to decrypt user's private key, token, etc.
 */
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
    throw new Error(`decryptUserData Error: ${error.message}`);
  }
};

/**
 * Decrypt the election's private key using election password
 * The private key is encrypted with AES derived from the election password
 */
export const decryptElectionPrivateKey = async (
  encryptedPrivateKey,
  salt,
  iv,
  authTag,
  electionPassword
) => {
  try {
    const saltBuffer = Buffer.from(salt, "hex");
    const { key: aesKey } = await deriveAESKey(electionPassword, saltBuffer);

    const decryptedPrivateKeyPEM = decryptUserData(
      encryptedPrivateKey,
      aesKey,
      iv,
      authTag
    );

    return decryptedPrivateKeyPEM;
  } catch (error) {
    throw new Error(`decryptElectionPrivateKey Error: ${error.message}`);
  }
};

/**
 * Decrypt the vote wrapper (RSA-encrypted AES key, then AES-encrypted payload)
 * Returns the decrypted { masked, rand } object
 */
export const decryptVoteWrapper = (encryptedVoteBase64, ecPrivateKeyPem) => {
  try {
    if (!encryptedVoteBase64 || !ecPrivateKeyPem) {
      throw new Error("encryptedVoteBase64 and ecPrivateKeyPem are required");
    }

    // Parse the wrapper from base64
    const wrapperJson = JSON.parse(
      Buffer.from(encryptedVoteBase64, "base64").toString("utf8")
    );

    const { encryptedKey, iv, authTag, ciphertext } = wrapperJson;
    if (!encryptedKey || !iv || !authTag || !ciphertext) {
      throw new Error(
        "Invalid wrapper structure: missing encryptedKey, iv, authTag, or ciphertext"
      );
    }

    // Decrypt the AES key using election private key (RSA-OAEP)
    const aesKeyBuffer = crypto.privateDecrypt(
      {
        key: ensurePem(ecPrivateKeyPem),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedKey, "base64")
    );

    // Decrypt the vote payload using AES-GCM
    const decipher = crypto.createDecipheriv(AES_ALGO, aesKeyBuffer, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    // Parse the decrypted JSON to get { masked, rand }
    const votePayload = JSON.parse(decrypted);
    return votePayload; // { masked, rand } as hex strings
  } catch (error) {
    throw new Error(`decryptVoteWrapper Error: ${error.message}`);
  }
};

/**
 * Verify the vote signature
 * The signature is over the canonical JSON { masked, rand }
 * Verify using the voter's public key
 */
export const verifyVoteSignature = (
  signatureBase64,
  voterPublicKeyPem,
  maskedHex,
  randHex
) => {
  try {
    if (!signatureBase64 || !voterPublicKeyPem) {
      throw new Error("Signature and voterPublicKeyPem are required");
    }

    // Reconstruct the canonical JSON that was signed
    const signedPayloadStr = JSON.stringify({ masked: maskedHex, rand: randHex });

    // Verify the signature
    const verified = crypto.verify(
      "sha256",
      Buffer.from(signedPayloadStr, "utf8"),
      {
        key: ensurePem(voterPublicKeyPem),
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      },
      Buffer.from(signatureBase64, "base64")
    );

    return verified;
  } catch (error) {
    throw new Error(`verifyVoteSignature Error: ${error.message}`);
  }
};

/**
 * Demask the vote to recover the original candidate ObjectId
 * candidateBigInt = maskedBigInt ^ randBigInt
 * Convert back to 24-char hex ObjectId
 */
export const demaskVote = (maskedHex, randHex) => {
  try {
    if (!maskedHex || !randHex) {
      throw new Error("maskedHex and randHex are required");
    }

    const maskedBigInt = BigInt("0x" + maskedHex);
    const randBigInt = BigInt("0x" + randHex);

    // Recover original candidateId: candidateId = masked XOR rand
    const candidateBigInt = maskedBigInt ^ randBigInt;

    // Convert back to 24-char hex ObjectId
    const candidateObjectIdHex = bigIntToObjectIdHex(candidateBigInt);

    return candidateObjectIdHex;
  } catch (error) {
    throw new Error(`demaskVote Error: ${error.message}`);
  }
};

/**
 * Complete vote decryption and validation pipeline
 * Returns candidate ObjectId if valid, throws on error
 */
export const decryptAndVerifyVote = async (
  encryptedVoteBase64,
  signedVoteBase64,
  voterPublicKey,
  ecPrivateKeyPem
) => {
  try {
    // Step 1: Decrypt the vote wrapper
    const { masked, rand } = decryptVoteWrapper(
      encryptedVoteBase64,
      ecPrivateKeyPem
    );

    // Step 2: Verify the signature
    const isValid = verifyVoteSignature(
      signedVoteBase64,
      voterPublicKey,
      masked,
      rand
    );

    if (!isValid) {
      throw new Error("Vote signature verification failed");
    }

    // Step 3: Demask to get candidate ObjectId
    const candidateObjectIdHex = demaskVote(masked, rand);

    return candidateObjectIdHex;
  } catch (error) {
    throw new Error(`decryptAndVerifyVote Error: ${error.message}`);
  }
};
