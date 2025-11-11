import crypto from "crypto";

//HMAC-SHA256

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

// HMAC-SHA256 function to replace bcrypt
export const hmacSHA256 = (data, secretKey) => {
    try {
        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(data);
        return hmac.digest('hex');
    } catch (err) {
        throw new Error(`hmacSHA256 Error: ${err.message}`);
    }
};

// To hash token using HMAC-SHA256
export const hashToken = async (token, secretKey) => {
    try {
        return hmacSHA256(token, secretKey);
    } catch (err) {
        throw new Error(`hashToken Error: ${err.message}`);
    }
};

// To hash voter Public key using HMAC-SHA256
export const hashVoterPublicKey = async (voterPublicKey, secretKey) => {
    try {
        return hmacSHA256(voterPublicKey, secretKey);
    } catch (err) {
        throw new Error(`hashVoterPublicKey Error: ${err.message}`);
    }
};

// Signing Vote (the masked one) along with rand
export const signMaskedVote = async (maskedVote, rand, voterPrivateKeyComponents) => {
    try {
        const { d, n } = voterPrivateKeyComponents;

        const combinedMaskedVote = `${maskedVote}:${rand}`;
        const combinedBigInt = BigInt("0x" + Buffer.from(combinedMaskedVote).toString("hex"));

        const signedVote = combinedBigInt ** BigInt(d) % BigInt(n);

        return {
            maskedVote,
            rand,
            signedMaskedVote: signedVote.toString(),
        };
    } catch (err) {
        throw new Error(`signMaskedVote Error: ${err.message}`);
    }
};

// Encrypting the details with EC pub key
export const encryptWithElectionCommissionPublicKey = async (payload, electionCommissionPublicKey) => {
    try {
        const buffer = Buffer.from(JSON.stringify(payload));

        const encrypted = crypto.publicEncrypt(
            {
                key: electionCommissionPublicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            buffer
        );

        return encrypted.toString("base64");
    } catch (err) {
        throw new Error(`encryptWithElectionCommissionPublicKey Error: ${err.message}`);
    }
};

// Preparing the complete payload of the encrypted vote along with peripherals
export const prepareEncryptedVote = async ({
    candidateId,
    voterPublicKey,
    voterPrivateKeyComponents,
    electionCommissionPublicKey,
    token,
    hmacSecretKey // New parameter required for HMAC
}) => {
    try {
        if (!hmacSecretKey) {
            throw new Error("HMAC secret key is required");
        }

        const rand = await generateRandomInt();
        const masked = await maskVote(candidateId, rand);
        const signed = await signMaskedVote(masked, rand, voterPrivateKeyComponents);
        const publicKeyHash = await hashVoterPublicKey(voterPublicKey, hmacSecretKey);
        const tokenHash = await hashToken(token, hmacSecretKey);
        const encryptedVote = await encryptWithElectionCommissionPublicKey(
            signed,
            electionCommissionPublicKey
        );
        const encryptedVoterPublicKey = await encryptWithElectionCommissionPublicKey(
            voterPublicKey,
            electionCommissionPublicKey
        );
        return {
            encryptedVote,
            encryptedVoterPublicKey,
            publicKeyHash,
            tokenHash,
        };
    } catch (err) {
        throw new Error(`prepareEncryptedVote Error: ${err.message}`);
    }
};