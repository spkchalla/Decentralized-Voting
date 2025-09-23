import mongoose, { Schema } from "mongoose";

const electionSchema = new Schema({
    eid: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    startDateTime: {
        type: Date,
        required: true
    },
    endDateTime: {
        type: Date,
        required: true
    },
    users: [{
        type: mongoose.Schema.ObjectId,
        ref: "User"
    }],
    candidates: [{
        candidate: { type: mongoose.Schema.ObjectId, ref: "Candidate" },
        votesCount: { type: Number, default: 0 }
    }],
    officers: [{
        type: mongoose.Schema.ObjectId,
        ref: "Admin"
    }],
    status: {
        type: String,
        enum: ["Active", "Not Yet Started", "Finished"],
        default: "Not Yet Started"
    }
}, { timestamps: true });

const Election = mongoose.models.Election || mongoose.model("Election", electionSchema);
export default Election;
