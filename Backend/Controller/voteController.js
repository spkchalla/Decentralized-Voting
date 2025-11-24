import bcrypt from "bcryptjs";
import { prepareEncryptedVote, decryptUserData } from "../Utils/voteEncryptionUtil.js";
import { uploadToIPFS } from "../Utils/ipfsUtils.js";
import { deriveAESKey } from "../Utils/encryptUserData.js";
import IpfsVoteCID from "../Model/IPFS_Vote_CID_Model.js";
import User from "../Model/User_Model.js";
import Election from "../Model/Election_Model.js";

export const castVote = async (req, res) => {
    try {
        const {
            candidateId,
            password,
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

        // candidateId should be a valid MongoDB ObjectId (24-character hex string)
        if (!/^[0-9a-fA-F]{24}$/.test(candidateId)) {
            return res.status(400).json({
                success: false,
                error: "candidateId must be a valid 24-character hex ObjectId string"
            });
        }

        // Get HMAC secret key from environment variable (server-side secret)
        const hmacSecretKey = process.env.HMAC_SECRET_KEY;
        if (!hmacSecretKey) {
            console.error('HMAC_SECRET_KEY not found in environment variables');
            return res.status(500).json({
                success: false,
                error: "Server configuration error"
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
            candidateId: candidateId,  // MongoDB ObjectId as string
            encryptedPrivateKey: user.privateKey,
            privateKeyIV: user.privateKeyIV,
            privateKeyAuthTag: user.privateKeyAuthTag,
            privateKeySalt: user.privateKeyDerivationSalt,
            password: password,
            electionCommissionPublicKey: electionCommissionPublicKey,
            encryptedToken: user.token,
            tokenIV: user.tokenIV,
            tokenAuthTag: user.tokenAuthTag,
        });

        // Extract required components
        const {
            encryptedVote,
            signedVote,
            tokenHash
        } = encryptedVoteData;

        // Decrypt the voter's public key to include in the vote payload
        // (Public key is not sensitive - it's needed for signature verification)
        const voterPublicKey = decryptUserData(
            user.publicKey,
            aesKey,
            user.publicKeyIV,
            user.publicKeyAuthTag
        );

        // Prepare IPFS payload with the four required fields
        const ipfsPayload = {
            encryptedVote,
            signedVote,
            tokenHash,
            voterPublicKey,  // Plain text public key (needed for signature verification)
        };

        // Anonymous filename - no voter identification
        const fileName = `vote.json`;

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
                // The required components:
                encryptedVote,
                signedVote,
                voterPublicKey,  // Plain text public key
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