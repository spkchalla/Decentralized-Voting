import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    voterId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    publicKey: {
        type: String,
        required: true
    },
    publicKeyIV: {
        type: String,
        required: true
    },
    publicKeyAuthTag: {
        type: String,
        required: true
    },
    privateKey: {
        type: String,
        required: true
    },
    privateKeyIV: {
        type: String,
        required: true
    },
    privateKeyAuthTag: {
        type: String,
        required: true
    },
    privateKeyDerivationSalt: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    },
    tokenIV: {
        type: String,
        required: true
    },
    tokenAuthTag: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        code: { type: String },
        expiresAt: { type: Date }
    },
    pastElections: [{
        eid: { type: mongoose.Schema.Types.ObjectId, ref: "Election" },
        hasVoted: { type: Boolean, default: false }
    }],
    pincode:{
        type:Number,
        requred:true
    }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;