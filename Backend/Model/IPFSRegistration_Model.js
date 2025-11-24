import mongoose from "mongoose";

const ipfsRegistrationSchema = new mongoose.Schema({

    tokenHash: {
        type: String,
        required: true,
        index: true,
    },
    publicKeyHash: {
        type: String,
        required: true,
        index: true,
    },
    hasVoted: {
        type: Boolean,
        required: true,
        default: false,
    },
    election: {
        type: mongoose.Schema.ObjectId,
        ref: 'Election',
        required: true,
        index: true,
    }
});

// Compound unique index: same tokenHash can exist for different elections
ipfsRegistrationSchema.index({ tokenHash: 1, election: 1 }, { unique: true });

// Compound unique index: same publicKeyHash can exist for different elections
ipfsRegistrationSchema.index({ publicKeyHash: 1, election: 1 }, { unique: true });

export default mongoose.model("IPFSRegistration", ipfsRegistrationSchema);