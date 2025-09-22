import mongoose, { Schema } from "mongoose";

const otpSchema = new Schema({
    personType: {
        type: String,
        enum: ["User", "Admin"], // identifies who the OTP belongs to
        required: true
    },
    person: {
        type: mongoose.Schema.ObjectId,
        refPath: "personType", // dynamically reference User or Admin
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

// Index to automatically delete expired OTPs (optional but recommended)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.models.OTP || mongoose.model("OTP", otpSchema);
export default OTP;
