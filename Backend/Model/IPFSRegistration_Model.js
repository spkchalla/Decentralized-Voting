import mongoose from "mongoose";

const ipfsRegistrationSchema = new mongoose.Schema({

    tokenHash:{
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    publicKeyHash:{
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    hasVoted:{
        type: Boolean,
        required: true,
        default: false,
    },
    election:{
        type:mongoose.Schema.ObjectId,
        ref:'Election'
    }
});
export default mongoose.model("IPFSRegistration", ipfsRegistrationSchema);