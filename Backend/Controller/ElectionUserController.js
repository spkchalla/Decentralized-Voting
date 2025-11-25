import Election from '../Model/Election_Model.js';
import User from '../Model/User_Model.js';
import IPFSRegistration from '../Model/IPFSRegistration_Model.js';
import Candidate from '../Model/Candidate_Model.js'; // Ensure Candidate model is registered
import Party from '../Model/Party_Model.js'; // Ensure Party model is registered
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateCryptoFields } from '../Utils/encryptUserData.js';
import { uploadToIPFS } from '../Utils/ipfsUtils.js';

// Get user's election dashboard
export const getUserElectionDashboard = async (req, res) => {
    try {
        // Defensive: ensure middleware attached a valid user
        if (!req.user) {
            console.error('getUserElectionDashboard: no user attached to request');
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no user found on request'
            });
        }

        const userId = req.user._id;
        console.log('Dashboard - User ID:', userId);

        // Find user to check verification status and pincode
        const user = await User.findById(userId).select('isVerified voterId name email pincode');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('Dashboard - User pincode:', user.pincode);

        // Find elections that match user's pincode OR where user is already registered
        const elections = await Election.find({
            $or: [
                { pinCodes: user.pincode },  // Active/upcoming elections for user's area
                { 'users.user': userId }      // Elections user is already registered for
            ]
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
            // userId is a string from req.user._id
            const userIdString = userId.toString();

            console.log(`\n=== Processing Election: ${election.title} ===`);
            console.log('Current userId (string):', userIdString);
            console.log('Users in election:', election.users.map(u => ({
                userId: u.user?._id?.toString() || u.user?.toString(),
                isAccepted: u.isAccepted
            })));

            const userData = election.users.find(userEntry => {
                // Handle both populated and non-populated user field
                const entryUserId = userEntry.user?._id?.toString() || userEntry.user?.toString();
                console.log(`Comparing: ${entryUserId} === ${userIdString}`, entryUserId === userIdString);
                return entryUserId === userIdString;
            });

            console.log(`Dashboard - Election ${election._id}:`, {
                userFound: !!userData,
                userEntry: userData,
                isAccepted: userData?.isAccepted
            });

            const isAccepted = userData ? userData.isAccepted : false;
            const registrationStatus = userData ?
                (userData.isAccepted ? 'registered' : 'pending') :
                'not_registered';

            console.log(`Final status for ${election.title}:`, { isAccepted, registrationStatus });

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
                // Registration logic - can register if not yet registered
                canRegister: !userData,
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

        console.log('Registration - All validations passed, using existing crypto fields...');

        // ✅ HYBRID APPROACH: Try to use existing crypto fields, fall back to generating new ones
        let tokenHash, publicKeyHash;
        let useExistingFields = true;

        try {
            // Attempt to use EXISTING crypto fields
            const saltBuffer = Buffer.from(user.privateKeyDerivationSalt, 'hex');
            const { deriveAESKey } = await import('../Utils/encryptUserData.js');
            const { key: aesKey } = await deriveAESKey(password, saltBuffer);

            // Decrypt the existing token and public key to get their hashes
            const { decryptUserData } = await import('../Utils/voteEncryptionUtil.js');

            console.log('🔍 Attempting to decrypt existing crypto fields...');
            const decryptedToken = decryptUserData(
                user.token,
                aesKey,
                user.tokenIV,
                user.tokenAuthTag
            );

            const decryptedPublicKey = decryptUserData(
                user.publicKey,
                aesKey,
                user.publicKeyIV,
                user.publicKeyAuthTag
            );

            // Generate hashes from existing token and public key
            const { hashToken, hashPublicKey } = await import('../Utils/encryptUserData.js');
            tokenHash = hashToken(decryptedToken);
            publicKeyHash = hashPublicKey(decryptedPublicKey);

            console.log('✅ Successfully using existing crypto fields');

        } catch (decryptError) {
            // Decryption failed - crypto fields were encrypted with different password
            // Fall back to generating NEW crypto fields (backward compatibility)
            console.warn('⚠️  Decryption failed, generating NEW crypto fields for this election');
            console.warn('⚠️  This is expected for users registered before the fix');

            useExistingFields = false;

            // Generate new cryptographic fields for this election
            const { generateCryptoFields } = await import('../Utils/encryptUserData.js');
            const cryptoFields = await generateCryptoFields(password);

            tokenHash = cryptoFields.tokenHash;
            publicKeyHash = cryptoFields.publicKeyHash;

            // Update user with new encrypted keys and token
            user.publicKey = cryptoFields.encryptedPublicKey;
            user.publicKeyIV = cryptoFields.publicKeyIV;
            user.publicKeyAuthTag = cryptoFields.publicKeyAuthTag;
            user.privateKey = cryptoFields.encryptedPrivateKey;
            user.privateKeyIV = cryptoFields.privateKeyIV;
            user.privateKeyAuthTag = cryptoFields.privateKeyAuthTag;
            user.token = cryptoFields.encryptedToken;
            user.tokenIV = cryptoFields.tokenIV;
            user.tokenAuthTag = cryptoFields.tokenAuthTag;
            user.privateKeyDerivationSalt = cryptoFields.salt;

            await user.save({ session });
            console.log('✅ User updated with new crypto materials');
        }

        console.log('Registration - Crypto fields ready:', useExistingFields ? 'EXISTING' : 'NEW');

        // Create IPFSRegistration record for this election
        try {
            const fp = (s) => (s && s.length > 12 ? `${s.slice(0, 6)}...${s.slice(-6)}` : s);
            console.log(`REG_USER_CREATE: user=${userId.toString()} tokenHash=${fp(tokenHash)} publicKeyHash=${fp(publicKeyHash)}`);
        } catch (e) { }

        const ipfsRegistration = new IPFSRegistration({
            tokenHash,
            publicKeyHash,
            hasVoted: false,
            election: electionId
        });

        await ipfsRegistration.save({ session });
        console.log('Registration - IPFSRegistration created');

        // ✅ FIX: DO NOT overwrite user's crypto fields!
        // The user already has encrypted keys and token from initial registration
        // We just need to mark them as accepted in the election

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

        // Enhanced error logging
        console.error('❌ ========================================');
        console.error('❌ REGISTRATION ERROR DETAILS:');
        console.error('❌ ========================================');
        console.error('Error message:', error.message);
        console.error('Error name:', error.name);
        console.error('Error stack:', error.stack);
        console.error('❌ ========================================');

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
            .populate({
                path: 'candidates.candidate',
                select: 'candidate_id name party',
                populate: {
                    path: 'party',
                    select: 'name symbol'
                }
            })
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
            userEntry => userEntry.user && userEntry.user._id && userEntry.user._id.toString() === userId.toString()
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