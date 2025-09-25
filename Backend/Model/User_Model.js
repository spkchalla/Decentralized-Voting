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
        type: String, // Store encrypted public key
        required: true
    },
    publicKeyIV: {
        type: String, // Store IV for public key encryption
        required: true
    },
    publicKeyAuthTag: {
        type: String, // Store auth tag for public key encryption
        required: true
    },
    privateKey: {
        type: String, // Store encrypted private key
        required: true
    },
    privateKeyIV: {
        type: String, // Store IV for private key encryption
        required: true
    },
    privateKeyAuthTag: {
        type: String, // Store auth tag for private key encryption
        required: true
    },
    privateKeySalt: {
        type: String, // Store salt used for AES key derivation in hex
        required: true
    },
    token: {
        type: String, // Store encrypted token
        required: true
    },
    tokenIV: {
        type: String, // Store IV for token encryption
        required: true
    },
    tokenAuthTag: {
        type: String, // Store auth tag for token encryption
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
        eid: { type: mongoose.Schema.ObjectId, ref: "Election" },
        hasVoted: { type: Boolean, default: false }
    }]
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;