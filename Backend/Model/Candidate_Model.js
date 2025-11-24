import mongoose, { Schema } from "mongoose";

const candidateSchema = new Schema({
    candidate_id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    elections: [{
        election_id: { type: mongoose.Schema.ObjectId, ref: "Election", required: true },
        party_id: { type: mongoose.Schema.ObjectId, ref: "Party", required: true }
    }],
    currentElection: [{
        type: mongoose.Schema.ObjectId,
        ref: "Election"
    }],
    party: {
        type: mongoose.Schema.ObjectId,
        ref: "Party"
    },
    status: {
        type: Number,
        default: 1 // Default to active
    },
    votes: {
        type: Number,
        default: 0 // Number of votes received
    }
}, { timestamps: true });

const Candidate = mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema);
export default Candidate;