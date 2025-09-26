import mongoose, { Schema } from "mongoose";

const approvalSchema = new Schema({
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
    otp: {
        code: { type: String },
        expiresAt: { type: Date }
    },
    status: {
        type: String,
        enum: ["Accepted", "Pending", "Rejected"],
        default: "Pending"
    },
    pincode: {
        type: Number,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Approval = mongoose.models.Approval || mongoose.model("Approval", approvalSchema);
export default Approval;