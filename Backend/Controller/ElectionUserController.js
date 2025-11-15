import Election from '../Model/Election_Model.js';
import User from '../Model/User_Model.js';
import IPFSRegistration from '../Model/IPFSRegistration_Model.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateCryptoFields } from '../Utils/encryptUserData.js';

// Get user's election dashboard
// Get user's election dashboard
export const getUserElectionDashboard = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log('Dashboard - User ID:', userId);

        // Find user to check verification status
        const user = await User.findById(userId).select('isVerified voterId name email');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find all elections where the user is included in the users array
        const elections = await Election.find({
            'users.user': userId
        })
        .populate({
            path: 'users.user',
            select: 'voterId name email isVerified'
        })
        .populate('candidates.candidate', 'candidate_id name')
        .populate('officers', 'name email')
        .select('-ecPublicKey -ecPrivateKey -ecPublicKeyIV -ecPrivateKeyIV -ecPublicKeyAuthTag -ecPrivateKeyAuthTag -ecprivateKeyDerivationSalt -password')
        .sort({ createdAt: -1 });

        console.log('Dashboard - Found elections count:', elections.length);
        
        // Debug: Check the actual structure of users array
        elections.forEach(election => {
            console.log(`Dashboard - Election ${election._id} users:`, 
                election.users.map(u => ({
                    user: u.user ? {
                        _id: u.user._id?.toString(),
                        voterId: u.user.voterId
                    } : 'NOT POPULATED',
                    isAccepted: u.isAccepted
                }))
            );
        });

        // Process elections data
        const processedElections = elections.map(election => {
            // Try different ways to find the user data
            const userData = election.users.find(userEntry => {
                if (userEntry.user && userEntry.user._id) {
                    return userEntry.user._id.toString() === userId;
                }
                // If population failed, check the raw ObjectId (only if user is not null)
                return userEntry.user && userEntry.user.toString() === userId;
            });

            console.log(`Dashboard - Election ${election._id}:`, {
                userFound: !!userData,
                userEntry: userData,
                userIdInElection: userData?.user?._id?.toString() || userData?.user?.toString(),
                currentUserId: userId
            });

            const isAccepted = userData ? userData.isAccepted : false;
            const registrationStatus = userData ? 
                (userData.isAccepted ? 'registered' : 'pending') : 
                'not_registered';

            return {
                _id: election._id,
                eid: election.eid,
                title: election.title,
                description: election.description,
                startDateTime: election.startDateTime,
                endDateTime: election.endDateTime,
                status: election.status,
                candidates: election.candidates,
                officers: election.officers,
                pinCodes: election.pinCodes,
                createdAt: election.createdAt,
                // User-specific data
                userStatus: {
                    isAccepted: isAccepted,
                    registrationStatus: registrationStatus
                },
                // Registration logic
                canRegister: userData ? !userData.isAccepted : false,
                needsVerification: !user.isVerified,
                // Voting logic
                canVote: election.status === 'Active' && isAccepted && user.isVerified,
                isUpcoming: election.status === 'Not Yet Started',
                isFinished: election.status === 'Finished',
                // Timing info
                isActive: election.status === 'Active',
                hasStarted: new Date(election.startDateTime) <= new Date(),
                hasEnded: new Date(election.endDateTime) < new Date()
            };
        });

        // Count different types of elections
        const pendingRegistrations = processedElections.filter(e => e.canRegister).length;
        const activeElections = processedElections.filter(e => e.isActive).length;
        const upcomingElections = processedElections.filter(e => e.isUpcoming).length;
        const finishedElections = processedElections.filter(e => e.isFinished).length;

        return res.status(200).json({
            success: true,
            message: 'Election dashboard retrieved successfully',
            user: {
                voterId: user.voterId,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified
            },
            elections: processedElections,
            summary: {
                totalElections: processedElections.length,
                pendingRegistrations,
                activeElections,
                upcomingElections,
                finishedElections,
                canVoteIn: processedElections.filter(e => e.canVote).length
            }
        });

    } catch (error) {
        console.error('Get user election dashboard error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const registerForElection = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { electionId, password } = req.body;

        console.log('Registration - User ID:', userId);
        console.log('Registration - User ID as string:', userId.toString());
        console.log('Registration - Election ID:', electionId);

        if (!electionId || !password) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Election ID and password are required'
            });
        }

        // Find user and check verification status
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('Registration - User found:', {
            userId: user._id.toString(),
            isVerified: user.isVerified
        });

        // Verify password with bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Registration - Password valid:', isPasswordValid);
        
        if (!isPasswordValid) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Please verify your account before registering for elections'
            });
        }

        // Find the election
        const election = await Election.findById(electionId).session(session);
        if (!election) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        console.log('Registration - Election found:', {
            electionId: election._id.toString(),
            title: election.title,
            totalUsers: election.users.length
        });

        console.log('Registration - Election users:', election.users.map(u => ({
            userId: u.user?.toString(),
            userIdType: typeof u.user,
            isAccepted: u.isAccepted
        })));

        console.log('Registration - Looking for user in election (as string):', userId.toString());

        // FIX: Compare as strings instead of ObjectId vs string
        const existingUser = election.users.find(
            userEntry => userEntry.user.toString() === userId.toString()
        );

        console.log('Registration - Found user in election:', existingUser);

        if (!existingUser) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'You are not eligible for this election. User not found in election users list.'
            });
        }

        // Check if already accepted
        if (existingUser.isAccepted) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'You are already registered for this election'
            });
        }

        // Check election status
        if (election.status === 'Finished') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'This election has already finished'
            });
        }

        console.log('Registration - All validations passed, generating crypto fields...');

        // Generate new cryptographic fields for this election using the provided password
        const {
            encryptedPublicKey,
            publicKeyIV,
            publicKeyAuthTag,
            encryptedPrivateKey,
            privateKeyIV,
            privateKeyAuthTag,
            encryptedToken,
            tokenIV,
            tokenAuthTag,
            salt,
            tokenHash,
            publicKeyHash
        } = await generateCryptoFields(password);

        console.log('Registration - Crypto fields generated');

        // Create IPFSRegistration record for this election
        const ipfsRegistration = new IPFSRegistration({
            tokenHash,
            publicKeyHash,
            hasVoted: false,
            election: electionId
        });

        await ipfsRegistration.save({ session });
        console.log('Registration - IPFSRegistration created');

        // Update user with new encrypted keys and token for this election
        user.publicKey = encryptedPublicKey;
        user.publicKeyIV = publicKeyIV;
        user.publicKeyAuthTag = publicKeyAuthTag;
        user.privateKey = encryptedPrivateKey;
        user.privateKeyIV = privateKeyIV;
        user.privateKeyAuthTag = privateKeyAuthTag;
        user.token = encryptedToken;
        user.tokenIV = tokenIV;
        user.tokenAuthTag = tokenAuthTag;
        user.privateKeyDerivationSalt = salt;

        await user.save({ session });
        console.log('Registration - User updated with new crypto materials');

        // Update user's acceptance status in election
        existingUser.isAccepted = true;
        await election.save({ session });
        console.log('Registration - Election user status updated to accepted');

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        console.log('Registration - Transaction committed successfully');

        // Get updated election data for response
        const updatedElection = await Election.findById(electionId)
            .populate('users.user', 'voterId name email isVerified')
            .populate('candidates.candidate', 'candidate_id name')
            .select('-ecPublicKey -ecPrivateKey -ecPublicKeyIV -ecPrivateKeyIV -ecPublicKeyAuthTag -ecPrivateKeyAuthTag -ecprivateKeyDerivationSalt -password');

        return res.status(200).json({
            success: true,
            message: 'Successfully registered for the election',
            election: {
                _id: updatedElection._id,
                eid: updatedElection.eid,
                title: updatedElection.title,
                status: updatedElection.status,
                userStatus: {
                    isAccepted: true,
                    registrationStatus: 'registered'
                },
                canVote: updatedElection.status === 'Active'
            }
        });

    } catch (error) {
        // Proper transaction handling
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        
        console.error('Register for election error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get specific election details for user
export const getElectionDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { electionId } = req.params;

        const election = await Election.findById(electionId)
            .populate('users.user', 'voterId name email isVerified')
            .populate('candidates.candidate', 'candidate_id name party')
            .populate('officers', 'name email')
            .select('-ecPublicKey -ecPrivateKey -ecPublicKeyIV -ecPrivateKeyIV -ecPublicKeyAuthTag -ecPrivateKeyAuthTag -ecprivateKeyDerivationSalt -password');

        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        // Check if user is part of this election
        const userData = election.users.find(
            userEntry => userEntry.user._id.toString() === userId
        );

        if (!userData) {
            return res.status(403).json({
                success: false,
                message: 'You are not eligible for this election'
            });
        }

        const user = await User.findById(userId);

        const electionDetails = {
            _id: election._id,
            eid: election.eid,
            title: election.title,
            description: election.description,
            startDateTime: election.startDateTime,
            endDateTime: election.endDateTime,
            status: election.status,
            candidates: election.candidates,
            officers: election.officers,
            createdAt: election.createdAt,
            // User-specific information
            userStatus: {
                isAccepted: userData.isAccepted,
                registrationStatus: userData.isAccepted ? 'registered' : 'pending'
            },
            canRegister: !userData.isAccepted && user.isVerified,
            canVote: election.status === 'Active' && userData.isAccepted && user.isVerified,
            needsVerification: !user.isVerified
        };

        return res.status(200).json({
            success: true,
            message: 'Election details retrieved successfully',
            election: electionDetails
        });

    } catch (error) {
        console.error('Get election details error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};