import Election from '../Model/Election_Model.js';
import { generateRSAKeyPair,     generateToken, 
    deriveAESKey, 
    encryptUserData} from '../Utils/encryptUserData.js';
import User from '../Model/User_Model.js';
import Candidate from '../Model/Candidate_Model.js';
import bcrypt from 'bcryptjs';



export const createElection = async (req, res) => {
    try {
        const {
            title,
            description,
            startDateTime,
            endDateTime,
            officers = [],
            password,
            pinCodes, // PIN codes to search for users
            candidates = []  // Array of candidate IDs
        } = req.body;

        // Validate required fields
        if (!title || !startDateTime || !endDateTime || !password || !pinCodes) {
            return res.status(400).json({
                success: false,
                message: 'Title, startDateTime, endDateTime, password, and pinCodes are required'
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Validate PIN codes - should be an array
        if (!Array.isArray(pinCodes) || pinCodes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'pinCodes must be a non-empty array'
            });
        }

        // Validate candidates - should be an array
        if (!Array.isArray(candidates)) {
            return res.status(400).json({
                success: false,
                message: 'candidates must be an array'
            });
        }

        // Validate dates
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

        // Step 1: Search for users by pincode
        const users = await User.find({ pincode: { $in: pinCodes } }).select('_id');
        
        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No users found with the provided pincodes'
            });
        }

        // Format users for election schema
        const formattedUsers = users.map(user => ({
            user: user._id,
            isAccepted: false // Default to false
        }));

        // Step 2: Hash the password using bcrypt
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Step 3: Generate Election Commission RSA Key Pair
        const { publicKey, privateKey } = await generateRSAKeyPair();
        
        // Step 4: Generate token for the election
        const token = generateToken();

        // Step 5: Derive AES key from the provided password
        const { key: aesKey, salt } = await deriveAESKey(password);

        // Step 6: Encrypt only token, public key, and private key
        const encryptedPublicKeyData = encryptUserData(publicKey, aesKey);
        const encryptedPrivateKeyData = encryptUserData(privateKey, aesKey);
        const encryptedTokenData = encryptUserData(token, aesKey);

        // Step 7: Generate unique election ID
        const eid = `ELE${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

        // Step 8: Determine initial status
        let status = "Not Yet Started";
        if (startDate <= now && endDate > now) {
            status = "Active";
        }

        // Step 9: Create the election document first to get its ID
        const election = new Election({
            eid,
            title,
            description,
            startDateTime: startDate,
            endDateTime: endDate,
            officers,
            status,
            // Encrypted data only
            ecPublicKey: encryptedPublicKeyData.encryptedUserData,
            ecPublicKeyIV: encryptedPublicKeyData.iv,
            ecPublicKeyAuthTag: encryptedPublicKeyData.authTag,
            ecPrivateKey: encryptedPrivateKeyData.encryptedUserData,
            ecPrivateKeyIV: encryptedPrivateKeyData.iv,
            ecPrivateKeyAuthTag: encryptedPrivateKeyData.authTag,
            ecprivateKeyDerivationSalt: salt.toString('hex'),
            // PIN codes
            pinCodes,
            // Users found by pincode
            users: formattedUsers,
            candidates: [], // Initialize empty, will update after candidate processing
            // Hashed password
            password: hashedPassword
        });

        // Step 10: Save election to get the _id
        await election.save();

        // Step 11: Process candidates and update their records
        const formattedCandidates = [];
        
        for (const candidateData of candidates) {
            let candidate;
            
            if (typeof candidateData === 'string') {
                // If candidateData is a string (candidate ID)
                candidate = await Candidate.findById(candidateData);
            } else if (candidateData.candidate_id) {
                // If candidateData is an object with candidate_id
                candidate = await Candidate.findOne({ candidate_id: candidateData.candidate_id });
            } else if (candidateData._id) {
                // If candidateData is an object with _id
                candidate = await Candidate.findById(candidateData._id);
            }

            if (candidate) {
                // Add candidate to election with votesCount
                formattedCandidates.push({
                    candidate: candidate._id,
                    votesCount: 0
                });

                // Update candidate's elections array
                const electionPartyData = {
                    election_id: election._id,
                    party_id: candidateData.party_id || candidate.party // Use provided party_id or candidate's current party
                };

                // Add to elections array if not already present
                const existingElection = candidate.elections.find(
                    e => e.election_id.toString() === election._id.toString()
                );

                if (!existingElection) {
                    candidate.elections.push(electionPartyData);
                }

                // Add to currentElection if not already present
                if (!candidate.currentElection.includes(election._id)) {
                    candidate.currentElection.push(election._id);
                }

                await candidate.save();
            }
        }

        // Step 12: Update election with formatted candidates
        election.candidates = formattedCandidates;
        await election.save();

        // Step 13: Populate the election data for response
        const populatedElection = await Election.findById(election._id)
            .populate('officers', 'name email')
            .populate('users.user', 'voterId name email pincode')
            .populate('candidates.candidate', 'candidate_id name')
            .select('-password -ecPublicKey -ecPrivateKey -ecPublicKeyIV -ecPrivateKeyIV -ecPublicKeyAuthTag -ecPrivateKeyAuthTag -ecprivateKeyDerivationSalt');

        // Step 14: Prepare response
        const response = {
            success: true,
            message: 'Election created successfully',
            election: {
                eid: populatedElection.eid,
                title: populatedElection.title,
                description: populatedElection.description,
                startDateTime: populatedElection.startDateTime,
                endDateTime: populatedElection.endDateTime,
                status: populatedElection.status,
                officers: populatedElection.officers,
                users: populatedElection.users,
                candidates: populatedElection.candidates,
                pinCodes: populatedElection.pinCodes,
                createdAt: populatedElection.createdAt
            },
            temporaryToken: token,
            usersFound: users.length
        };

        return res.status(201).json(response);

    } catch (error) {
        console.error('Election creation error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Election with this ID already exists'
            });
        }

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};