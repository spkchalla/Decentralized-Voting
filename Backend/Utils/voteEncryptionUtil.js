import crypto, { publicDecrypt } from "crypto";
import { deriveAESKey, decryptUserData } from "./encryptUserData";

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


// To hash voter Public key using HMAC-SHA256
export const hashVoterPublicKey = async (voterPublicKey, secretKey) => {
    try {
        const voterPublicKey = decryptUserData(
            encryptedVoterPublicKey,
            aesKey,
            publicKey
            
        )
        return hmacSHA256(voterPublicKey, secretKey);
    } catch (err) {
        throw new Error(`hashVoterPublicKey Error: ${err.message}`);
    }
};
//-------------------------------------------------------------------------------------//

// Signing Vote (the masked one) along with rand
// export const signMaskedVote = async (maskedVote, rand, voterPrivateKeyComponents) => {
//     try {
//         const { d, n } = voterPrivateKeyComponents;

//         const combinedMaskedVote = `${maskedVote}:${rand}`;
//         const combinedBigInt = BigInt("0x" + Buffer.from(combinedMaskedVote).toString("hex"));

//         const signedVote = combinedBigInt ** BigInt(d) % BigInt(n);

//         return {
//             maskedVote,
//             rand,
//             signedMaskedVote: signedVote.toString(),
//         };
//     } catch (err) {
//         throw new Error(`signMaskedVote Error: ${err.message}`);
//     }
// };

//-------------------------------------------------------------------------------------//

//sign masked vote with voter's private key (pem)
export const signMaskedVote = async({
    maskedVote,
    rand,
    encryptedPrivateKey,
    privateKeyIV,
    privateKeySalt,
    password,
}) =>{
    try{
        const saltBuffer = Buffer.from(privateKeySalt, "hex");
        const { key: aesKey } = await deriveAESKey(password, saltBuffer);

        const decryptedPrivatePEM = decryptUserData(
            encryptedPrivateKey,
            aesKey,
            privateKeyIV,
            privateKeyAuthTag,
        );
        const maskedBuffer = Buffer.from(String(maskedVote), "utf8");

        const signature = crypto.sign("sha256", maskedBuffer, {
            key: decryptedPrivatePEM,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        });
        
        const signedVote = {
            maskedVote,
            rand,
            signature: signature.toString("base64"),
        };
        return signedVote;
    }catch(err){
        throw new Error(`signedMaskedVote Error: ${err.message}`);
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
    encryptedPrivateKey,
    privateKeyIV,
    privateKeyAuthTag,
    privateKeySalt,
    password,
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
        const signedVote = await signMaskedVote({
            maskedVote: masked,
            rand,
            encryptedPrivateKey,
            privateKeyIV,
            privateKeyAuthTag,
            privateKeySalt,
            password,
        });
        //const publicKeyHash = await hashVoterPublicKey(voterPublicKey, hmacSecretKey);
        const tokenHash = await hashToken(token, hmacSecretKey);
        const encryptedVote = await encryptWithElectionCommissionPublicKey(
            masked,
            electionCommissionPublicKey
        );
        const encryptedVoterPublicKey = await encryptWithElectionCommissionPublicKey(
            voterPublicKey,
            electionCommissionPublicKey
        );
        return {
            encryptedVote,
            signedVote,
            encryptedVoterPublicKey,
            //publicKeyHash,
            tokenHash,
        };
    } catch (err) {
        throw new Error(`prepareEncryptedVote Error: ${err.message}`);
    }
};
