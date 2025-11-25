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
        // 4. GENERATE RSA KEYS
        // -------------------------
        const { publicKey, privateKey } = await generateRSAKeyPair();

        // Store full PEM public key for compatibility with crypto APIs
        // NO LONGER STRIPPING HEADERS FOR HASHING

        // -------------------------
        // 5. CREATE TOKEN + AES KEY
        // -------------------------
        const token = generateToken();
        const { key: aesKey, salt } = await deriveAESKey(password);

        // Use the imported utility functions instead of recreating
        const tokenHash = hashToken(token);
        // FIX: Use full PEM public key for hashing (consistent with user registration)
        const publicKeyHash = hashPublicKey(publicKey);

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
                // FIX: Use full PEM public key for hashing (consistent with user registration)
                const userSpecificTokenHash = hashToken(token);
                const userSpecificPublicKeyHash = hashPublicKey(publicKey);

                // Debug: log registration hashes (short fingerprints)
                try {
                    const fp = (s) => (s && s.length > 12 ? `${s.slice(0, 6)}...${s.slice(-6)}` : s);
                    console.log(`REG_CREATE: user=${user._id} tokenHash=${fp(userSpecificTokenHash)} publicKeyHash=${fp(userSpecificPublicKeyHash)} format=fullPEM`);
                } catch (e) { }

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

// Get all elections
export const getAllElections = async (req, res) => {
    try {
        const elections = await Election.find()
            .populate('officers', 'name email')
            .populate('users.user', 'voterId name email pincode')
            .populate('candidates.candidate', 'candidate_id name')
            .select('-password -ecPublicKey -ecPrivateKey -ecPrivateKeyIV -ecPrivateKeyAuthTag -ecPrivateKeyAuthTag -ecprivateKeyDerivationSalt')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Elections retrieved successfully",
            elections: elections
        });

    } catch (error) {
        console.error("Get all elections error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * Update election status based on current time
 * Automatically sets status to:
 * - "Not Yet Started" if current time < startDateTime
 * - "Active" if startDateTime <= current time < endDateTime
 * - "Finished" if current time >= endDateTime
 */
export const updateElectionStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the election
        const election = await Election.findById(id);
        if (!election) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        const oldStatus = election.status;
        const now = new Date();
        const startTime = new Date(election.startDateTime);
        const endTime = new Date(election.endDateTime);

        let newStatus;
        if (now < startTime) {
            newStatus = "Not Yet Started";
        } else if (now >= startTime && now < endTime) {
            newStatus = "Active";
        } else {
            newStatus = "Finished";
        }

        // Check if status actually changed
        if (oldStatus === newStatus) {
            return res.status(200).json({
                success: true,
                message: `Election status is already: ${newStatus}`,
                statusChanged: false,
                election: {
                    _id: election._id,
                    eid: election.eid,
                    title: election.title,
                    status: election.status,
                    startDateTime: election.startDateTime,
                    endDateTime: election.endDateTime
                }
            });
        }

        // Update the status
        election.status = newStatus;
        await election.save();

        return res.status(200).json({
            success: true,
            message: `Election status updated from "${oldStatus}" to "${newStatus}"`,
            statusChanged: true,
            oldStatus: oldStatus,
            newStatus: newStatus,
            election: {
                _id: election._id,
                eid: election.eid,
                title: election.title,
                status: election.status,
                startDateTime: election.startDateTime,
                endDateTime: election.endDateTime
            }
        });
    } catch (error) {
        console.error("Error in updateElectionStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update election status",
            error: error.message
        });
    }
};

/**
 * Force start an election manually (admin override)
 * Sets election status to "Active" and start time to current time
 */
export const forceStartElection = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the election
        const election = await Election.findById(id);
        if (!election) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        const oldStatus = election.status;
        const oldStartTime = election.startDateTime;
        const now = new Date();

        // Force set to Active and update start time to now
        election.status = "Active";
        election.startDateTime = now;
        await election.save();

        return res.status(200).json({
            success: true,
            message: oldStatus === "Active"
                ? "Election is already Active"
                : `Election manually started - status changed from "${oldStatus}" to "Active" and start time set to now`,
            statusChanged: oldStatus !== "Active",
            oldStatus: oldStatus,
            newStatus: "Active",
            oldStartTime: oldStartTime,
            newStartTime: now,
            election: {
                _id: election._id,
                eid: election.eid,
                title: election.title,
                status: election.status,
                startDateTime: election.startDateTime,
                endDateTime: election.endDateTime
            }
        });
    } catch (error) {
        console.error("Error in forceStartElection:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to force start election",
            error: error.message
        });
    }
};

/**
 * Force finish an election manually (admin override)
 * Sets election status to "Finished" regardless of end time
 */
export const forceFinishElection = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the election
        const election = await Election.findById(id);
        if (!election) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        const oldStatus = election.status;

        // Force set to Finished
        election.status = "Finished";
        await election.save();

        return res.status(200).json({
            success: true,
            message: oldStatus === "Finished"
                ? "Election is already Finished"
                : `Election manually closed - status changed from "${oldStatus}" to "Finished"`,
            statusChanged: oldStatus !== "Finished",
            oldStatus: oldStatus,
            newStatus: "Finished",
            election: {
                _id: election._id,
                eid: election.eid,
                title: election.title,
                status: election.status,
                startDateTime: election.startDateTime,
                endDateTime: election.endDateTime
            }
        });
    } catch (error) {
        console.error("Error in forceFinishElection:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to force finish election",
            error: error.message
        });
    }
};