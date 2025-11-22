import { uploadToIPFS } from '../Utils/ipfsUtils.js';

export const registerForElection = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;
        const { electionId, password } = req.body;

        // ... [existing validation code] ...

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
        try {
            const fp = (s) => (s && s.length > 12 ? `${s.slice(0,6)}...${s.slice(-6)}` : s);
            console.log(`REG_USER_CREATE: user=${userId.toString()} tokenHash=${fp(tokenHash)} publicKeyHash=${fp(publicKeyHash)}`);
        } catch (e) {}

        const ipfsRegistration = new IPFSRegistration({
            tokenHash,
            publicKeyHash,
            hasVoted: false,
            election: electionId
        });

        await ipfsRegistration.save({ session });
        console.log('Registration - IPFSRegistration created');

        // ✅ ADD THIS: Upload registration data to IPFS
        try {
            const ipfsData = {
                tokenHash: tokenHash,
                publicKeyHash: publicKeyHash,
                eid: election.eid  // Use the election's eid from the election object
            };

            const ipfsResult = await uploadToIPFS(ipfsData, `registration_${userId}_${electionId}`);
            
            // Update IPFSRegistration with IPFS data
            ipfsRegistration.ipfsHash = ipfsResult.IpfsHash;
            ipfsRegistration.ipfsUrl = ipfsResult.url;
            await ipfsRegistration.save({ session });
            
            console.log('Registration - IPFS upload successful:', ipfsResult.IpfsHash);
        } catch (ipfsError) {
            console.error('Registration - IPFS upload failed:', ipfsError);
            // Decide if you want to fail the entire registration or continue without IPFS
            throw new Error('Failed to upload registration to IPFS');
        }

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