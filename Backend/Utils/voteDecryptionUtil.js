import crypto from "crypto";
import argon2 from "argon2";
import { deriveAESKey } from "./encryptUserData.js";
import { decryptUserData } from "./voteEncryptionUtil.js";

/**
 * Decrypt the election commission's private key using the election password
 */
export const decryptElectionPrivateKey = async (
    encryptedPrivateKey,
    salt,
    iv,
    authTag,
    electionPassword
) => {
    try {
        // Derive AES key from election password
        const saltBuffer = Buffer.from(salt, "hex");
        const { key: aesKey } = await deriveAESKey(electionPassword, saltBuffer);

        // Decrypt the private key
        const decryptedPrivateKey = decryptUserData(
            encryptedPrivateKey,
            aesKey,
            iv,
            authTag
        );

        return decryptedPrivateKey;
    } catch (error) {
        throw new Error(`Failed to decrypt election private key: ${error.message}`);
    }
};

/**
 * Decrypt vote with EC's private key
 */
export const decryptWithElectionCommissionPrivateKey = async (
    encryptedData,
    electionCommissionPrivateKey
) => {
    const buffer = Buffer.from(encryptedData, "base64");
    const decrypted = crypto.privateDecrypt(
        {
            key: electionCommissionPrivateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        buffer
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
 * Verify vote signature using voter's public key
 */
export const verifyVoteSignature = (
    signedVoteBase64,
    voterPublicKey,
    voteDataString
) => {
    try {
        const signature = Buffer.from(signedVoteBase64, "base64");
        const voteDataBuffer = Buffer.from(voteDataString, "utf8");

        const isValid = crypto.verify(
            "sha256",
            voteDataBuffer,
            {
                key: voterPublicKey,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
            },
            signature
        );

        return isValid;
    } catch (error) {
        throw new Error(`Signature verification failed: ${error.message}`);
    }
};

/**
 * Decrypt and verify a vote
 * Returns the candidateId if successful
 */
export const decryptAndVerifyVote = async (
    encryptedVoteBase64,
    signedVoteBase64,
    voterPublicKey,
    ecPrivateKeyPem
) => {
    try {
        // Step 1: Decrypt the vote data using EC's private key
        const voteData = await decryptWithElectionCommissionPrivateKey(
            encryptedVoteBase64,
            ecPrivateKeyPem
        );

        // voteData should contain {candidateId, rand}
        const { candidateId, rand } = voteData;

        if (!candidateId || rand === undefined) {
            throw new Error("Invalid vote data structure");
        }

        // Step 2: Verify the signature
        const voteDataString = JSON.stringify({ candidateId, rand });
        const isValid = verifyVoteSignature(
            signedVoteBase64,
            voterPublicKey,
            voteDataString
        );

        if (!isValid) {
            throw new Error("Vote signature verification failed");
        }

        // Step 3: Return the candidateId (it's already a MongoDB ObjectId string)
        return candidateId;
    } catch (error) {
        throw new Error(`decryptAndVerifyVote Error: ${error.message}`);
    }
};
