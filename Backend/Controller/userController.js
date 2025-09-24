import User from "../Model/User_Model.js";
import bcrypt from "bcryptjs";
import { generateRSAKeyPair } from "../Utils/rsaKeyGeneration.js";
import { sendOtpToEmail, verifyOTP } from "../Utils/OTP.js";
import { randomUUID } from "crypto";
import { encryptPrivateKey, deriveAESKey } from "../Utils/encryptPrivateKey.js";

// Helper: generate unique voter ID using UUID
const generateVoterId = () => "VOTER-" + randomUUID().slice(0, 8);

// Step 1: Register + send OTP
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const { publicKey, privateKey } = await generateRSAKeyPair();

        const voterId = generateVoterId();

        // Derive AES key from user's password
        const { key: aesKey, salt } = await deriveAESKey(password);

        // Encrypt private key using AES key
        const { encryptedData: encryptedPrivateKey, iv } = encryptPrivateKey(privateKey, aesKey);

        // ---- Print to console for debugging ----
console.log("Original Private Key:\n", privateKey);
console.log("Encrypted Private Key:\n", encryptedPrivateKey);
console.log("AES IV:\n", iv);
console.log("AES Salt:\n", salt.toString('hex'));


        const newUser = new User({
            voterId,
            name,
            email,
            password: hashedPassword,
            publicKey,
            privateKey: encryptedPrivateKey, // store encrypted
            privateKeyIv: iv,               // store IV
            aesSalt: salt.toString('hex'),  // store salt to derive AES key later
            isVerified: false,
        });

        await newUser.save();

        // Send hashed OTP via utility
        await sendOtpToEmail(newUser);

        res.status(201).json({ message: "User registered, OTP sent", userId: newUser._id });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Step 2: Verify OTP
export const verifyUserOtp = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        try {
            await verifyOTP(user, otp);
            res.status(200).json({ message: "User verified successfully", voterId: user.voterId });
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }
    } catch (error) {
        console.error("Verify error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Resend OTP
export const resendOtp = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.isVerified) {
            return res.status(400).json({ message: "User already verified" });
        }

        await sendOtpToEmail(user, "Resent OTP for Decentralized-Voting System");

        res.status(200).json({ message: "OTP resent successfully" });
    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get all voters (only verified)
export const getAllVoters = async (req, res) => {
    try {
        const voters = await User.find({ isVerified: true }).select("-password -privateKey -aesSalt -privateKeyIv -otp");
        res.status(200).json(voters);
    } catch (error) {
        console.error("Fetch voters error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get single voter
export const getVoterById = async (req, res) => {
    try {
        const { id } = req.params;
        const voter = await User.findById(id).select("-password -privateKey -aesSalt -privateKeyIv -otp");
        if (!voter) return res.status(404).json({ message: "Voter not found" });
        res.status(200).json(voter);
    } catch (error) {
        console.error("Fetch voter error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
