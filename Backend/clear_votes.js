import mongoose from 'mongoose';
import dotenv from 'dotenv';
import IpfsVoteCID from './Model/IPFS_Vote_CID_Model.js';
import IPFSRegistration from './Model/IPFSRegistration_Model.js';
import Candidate from './Model/Candidate_Model.js';

dotenv.config();

const clearDatabase = async () => {
    try {
        await mongoose.connect(process.env.Mongo_URL);
        console.log('Connected to MongoDB');

        // Clear votes
        const voteResult = await IpfsVoteCID.deleteMany({});
        console.log(`Deleted ${voteResult.deletedCount} corrupted votes`);

        // Clear registrations (so you can register again if needed, or just to reset status)
        // Actually, we should probably keep registrations but reset hasVoted
        // But if the registrations have bad tokenHashes (which they shouldn't, only votes do), 
        // let's just reset hasVoted for now.
        // Wait, if the user registers again, they might get a new tokenHash if we changed logic.
        // But the registration logic was fixed a while ago.
        // The issue is specifically the VOTE payload in IPFS having bad tokenHash.
        // So deleting votes is enough.

        // Reset hasVoted flag for all registrations
        const regResult = await IPFSRegistration.updateMany({}, { hasVoted: false });
        console.log(`Reset hasVoted status for ${regResult.modifiedCount} registrations`);

        // Reset candidate vote counts
        const candResult = await Candidate.updateMany({}, { votes: 0 });
        console.log(`Reset vote counts for ${candResult.modifiedCount} candidates`);

        console.log('✅ Database cleared of old votes. You can now cast a NEW vote!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
};

clearDatabase();
