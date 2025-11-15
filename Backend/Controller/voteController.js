import bcrypt from "bcryptjs";
import { prepareEncryptedVote } from "../Utils/voteEncryptionUtil.js";
import { uploadToIPFS } from "../Utils/ipfsUtils.js";
import { deriveAESKey } from "../Utils/encryptUserData.js";
import { stringIdToNumber } from "../Utils/candidateIdConverter.js";
import IpfsVoteCID from "../Model/IPFS_Vote_CID_Model.js";
import User from "../Model/User_Model.js";
import Election from "../Model/Election_Model.js";

export const castVote = async (req, res) => {
    try {
        const {
            candidateId,
            password,
            hmacSecretKey,
            electionId,
            email // Only used for authentication, not stored
        } = req.body;

        // Validate required fields
        if (!electionId || !password || !email || !candidateId) {
            return res.status(400).json({
                success: false,
                error: "electionId, password, email, and candidateId are required"
            });
        }

        // Validate candidateId is a valid string format (e.g., "C001") and convert to number
        let numericCandidateId;
        try {
            // Convert string ID (e.g., "C001") to numeric ID (e.g., 1) for all calculations
            numericCandidateId = stringIdToNumber(candidateId);
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                error: parseError.message
            });
        }

        if (!hmacSecretKey) {
            return res.status(400).json({
                success: false,
                error: "hmacSecretKey is required"
            });
        }

        // Step 0: Fetch election and get the election commission public key from database
        const election = await Election.findById(electionId).select('ecPublicKey status');
        if (!election) {
            return res.status(404).json({
                success: false,
                error: "Election not found"
            });
        }

        if (!election.ecPublicKey) {
            return res.status(400).json({
                success: false,
                error: "Election public key not found"
            });
        }

        const electionCommissionPublicKey = election.ecPublicKey;

        // Step 1: Find user and verify password (authentication only)
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: "Invalid password"
            });
        }

        // Step 0: Derive AES key using Argon2
        const saltBuffer = Buffer.from(user.privateKeyDerivationSalt, 'hex');
        const { key: aesKey } = await deriveAESKey(password, saltBuffer);

        // Prepare all the required data for vote encryption
        const encryptedVoteData = await prepareEncryptedVote({
            candidateId: numericCandidateId,
            encryptedVoterPublicKey: user.publicKey,
            publicKeyIV: user.publicKeyIV,
            publicKeyAuthTag: user.publicKeyAuthTag,
            encryptedPrivateKey: user.privateKey,
            privateKeyIV: user.privateKeyIV,
            privateKeyAuthTag: user.privateKeyAuthTag,
            privateKeySalt: user.privateKeyDerivationSalt,
            password: password,
            electionCommissionPublicKey: electionCommissionPublicKey,
            encryptedToken: user.token,
            tokenIV: user.tokenIV,
            tokenAuthTag: user.tokenAuthTag,
            hmacSecretKey: hmacSecretKey,
        });

        // Extract the four required components
        const { 
            encryptedVote, 
            signedVote, 
            encryptedVoterPublicKey, 
            tokenHash 
        } = encryptedVoteData;
        
        // Prepare IPFS payload with ONLY the four anonymous components
        const ipfsPayload = { 
            encryptedVote, 
            signedVote, 
            encryptedVoterPublicKey, 
            tokenHash,
            electionId, // Only store election ID, no voter identification
        };
        
        // Anonymous filename - no voter identification
        const fileName = `vote_${electionId}_${Date.now()}.json`;

        // Upload to IPFS
        const { IpfsHash: cid, url } = await uploadToIPFS(ipfsPayload, fileName);

        // Store CID in database WITHOUT voter identification
        const ipfsVoteRecord = await IpfsVoteCID.create({
            cid: cid,
            link: url,
            electionId: electionId,
            // NO voterId, NO email stored - completely anonymous
            tokenHash: tokenHash // Only store token hash for duplicate prevention
        });

        res.status(200).json({
            success: true,
            data: {
                // The four required components:
                encryptedVote,
                signedVote,
                encryptedVoterPublicKey,
                tokenHash,
                ipfs: {
                    cid: cid,
                    url: url
                    // No databaseId returned to prevent tracking
                }
            },
            message: "Vote cast successfully and stored anonymously on IPFS"
        });
    } catch (err) {
        console.error("Error in castVote:", err);

        // Handle duplicate token hash (prevent double voting)
        if (err.code === 11000 && err.keyPattern && err.keyPattern.tokenHash) {
            return res.status(400).json({
                success: false,
                error: "Vote already cast for this token"
            });
        }

        // Handle validation errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        res.status(500).json({
            success: false,
            error: err.message,
        });
    }    
};

// REMOVED: getVoteStatus function - we don't track who voted