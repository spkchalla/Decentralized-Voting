import Election from '../Model/Election_Model.js';
import { generateRSAKeyPair, generateToken, deriveAESKey, encryptUserData, hashToken, hashPublicKey } from '../Utils/encryptUserData.js';
import User from '../Model/User_Model.js';
import Candidate from '../Model/Candidate_Model.js';
import IPFSRegistration from '../Model/IPFSRegistration_Model.js';
import bcrypt from 'bcryptjs';
import { uploadToIPFS } from '../Utils/ipfsUtils.js';
import crypto from 'crypto';

export const createElection = async (req, res) => {
    try {
        const {
            title,
            description,
            startDateTime,
            endDateTime,
            officers = [],
            password,
            pinCodes,
            candidates = []
        } = req.body;

        // -------------------------
        // 1. VALIDATION
        // -------------------------
        if (!title || !startDateTime || !endDateTime || !password || !pinCodes) {
            return res.status(400).json({
                success: false,
                message: 'Title, startDateTime, endDateTime, password, and pinCodes are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        if (!Array.isArray(pinCodes) || pinCodes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'pinCodes must be a non-empty array'
            });
        }

        if (!Array.isArray(candidates)) {
            return res.status(400).json({
                success: false,
                message: 'candidates must be an array'
            });
        }

        const startDate = new Date(startDateTime);
        const endDate = new Date(endDateTime);
        const now = new Date();

        if (startDate >= endDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        if (startDate < now) {
            return res.status(400).json({
                success: false,
                message: 'Start date cannot be in the past'
            });
        }

        // -------------------------
        // 2. FIND USERS BY PINCODE
        // -------------------------
        const users = await User.find({ pincode: { $in: pinCodes } })
            .select('_id voterId name email pincode');

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No users found with the provided pincodes'
            });
        }

        const formattedUsers = users.map(user => ({
            user: user._id,
            isAccepted: false
        }));

        // -------------------------
        // 3. HASH ELECTION PASSWORD
        // -------------------------
        const hashedPassword = await bcrypt.hash(password, 12);

        // -------------------------
        // 4. GENERATE RSA KEYS AND STRIP PEM HEADERS
        // -------------------------
        const { publicKey, privateKey } = await generateRSAKeyPair();

        // Keep full PEM public key for compatibility with crypto APIs
        const cleanPublicKey = publicKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/\n/g, '')
            .trim();

        // -------------------------
        // 5. CREATE TOKEN + AES KEY
        // -------------------------
        const token = generateToken();
        const { key: aesKey, salt } = await deriveAESKey(password);

        // Use the imported utility functions instead of recreating
        const tokenHash = hashToken(token);
        const publicKeyHash = hashPublicKey(cleanPublicKey);

        const encryptedPrivateKey = encryptUserData(privateKey, aesKey);
        const encryptedToken = encryptUserData(token, aesKey);

        // -------------------------
        // 6. CREATE ELECTION ID
        // -------------------------
        const eid = `ELE${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

        let status = "Not Yet Started";
        if (startDate <= now && endDate > now) status = "Active";

        // -------------------------
        // 7. CREATE BASE ELECTION
        // -------------------------
        const election = new Election({
            eid,
            title,
            description,
            startDateTime: startDate,
            endDateTime: endDate,
            officers,
            status,
            ecPublicKey: publicKey, // Store full PEM for direct use by crypto
            ecPrivateKey: encryptedPrivateKey.encryptedUserData,
            ecPrivateKeyIV: encryptedPrivateKey.iv,
            ecPrivateKeyAuthTag: encryptedPrivateKey.authTag,
            ecprivateKeyDerivationSalt: salt.toString("hex"),
            pinCodes,
            users: formattedUsers,
            candidates: [],
            password: hashedPassword
        });

        await election.save();

        // -------------------------
        // 8. CREATE IPFS REGISTRATION FOR EACH USER
        // -------------------------
        const ipfsUploadResults = [];

        for (const user of users) {
            try {
                // Hash the plain token and public key for registration.
                // Note: this uses the plain (not encrypted) values and does NOT append the user ID.
                // If you need per-user-unique hashes, consider including userId deliberately.
                const userSpecificTokenHash = hashToken(token);
                const userSpecificPublicKeyHash = hashPublicKey(cleanPublicKey);

                // Create IPFSRegistration document
                const registration = new IPFSRegistration({
                    tokenHash: userSpecificTokenHash,
                    publicKeyHash: userSpecificPublicKeyHash,
                    hasVoted: false,
                    election: election._id
                });

                await registration.save();

                // Upload to IPFS - Only tokenHash, publicKeyHash, and eid
                const ipfsData = {
                    tokenHash: userSpecificTokenHash,
                    publicKeyHash: userSpecificPublicKeyHash,
                    eid: eid
                };

                const ipfsResult = await uploadToIPFS(ipfsData, `registration`);

                // Update IPFSRegistration with IPFS data
                registration.ipfsHash = ipfsResult.IpfsHash;
                registration.ipfsUrl = ipfsResult.url;
                await registration.save();

                ipfsUploadResults.push({
                    userId: user._id,
                    success: true,
                    ipfsHash: ipfsResult.IpfsHash,
                    url: ipfsResult.url,
                    registrationId: registration._id
                });

            } catch (err) {
                ipfsUploadResults.push({
                    userId: user._id,
                    success: false,
                    error: err.message
                });
            }
        }

        // -------------------------
        // 9. PROCESS CANDIDATES
        // -------------------------
        const formattedCandidates = [];

        for (const cand of candidates) {
            let candidate = null;

            if (typeof cand === "string") {
                candidate = await Candidate.findById(cand);
            } else if (cand._id) {
                candidate = await Candidate.findById(cand._id);
            } else if (cand.candidate_id) {
                candidate = await Candidate.findOne({ candidate_id: cand.candidate_id });
            }

            if (candidate) {
                formattedCandidates.push({
                    candidate: candidate._id,
                    votesCount: 0
                });

                const electionPartyData = {
                    election_id: election._id,
                    party_id: cand.party_id || candidate.party
                };

                if (!candidate.elections.some(e => e.election_id.toString() === election._id.toString())) {
                    candidate.elections.push(electionPartyData);
                }

                if (!candidate.currentElection.includes(election._id)) {
                    candidate.currentElection.push(election._id);
                }

                await candidate.save();
            }
        }

        election.candidates = formattedCandidates;
        await election.save();

        // -------------------------
        // 10. POPULATE AND RESPOND
        // -------------------------
        const populatedElection = await Election.findById(election._id)
            .populate('officers', 'name email')
            .populate('users.user', 'voterId name email pincode')
            .populate('candidates.candidate', 'candidate_id name')
            .select('-password -ecPublicKey -ecPrivateKey -ecPublicKeyIV -ecPrivateKeyIV -ecPublicKeyAuthTag -ecPrivateKeyAuthTag -ecprivateKeyDerivationSalt');

        return res.status(201).json({
            success: true,
            message: "Election created successfully",
            election: populatedElection,
            temporaryToken: token,
            usersFound: users.length,
            ipfsUploadSummary: {
                totalUsers: users.length,
                successfulUploads: ipfsUploadResults.filter(r => r.success).length,
                failedUploads: ipfsUploadResults.filter(r => !r.success).length,
                results: ipfsUploadResults
            }
        });

    } catch (error) {
        console.error("Election creation error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};