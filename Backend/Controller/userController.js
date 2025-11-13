import User from "../Model/User_Model.js";
import bcrypt from "bcryptjs";
import { generateRSAKeyPair } from "../Utils/rsaKeyGeneration.js";
import { sendOtpToEmail, verifyOTP } from "../Utils/OTP.js";
import { randomUUID } from "crypto";
import { deriveAESKey, encryptUserData } from "../Utils/encryptUserData.js";
import { generateToken } from "../Utils/tokenGeneration.js";

// Helper: generate unique voter ID using UUID
const generateVoterId = () => "VOTER-" + randomUUID().slice(0, 8);

// This is not the exact user. PLease go to approvalController this has been deactivated. 
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate RSA key pair
        const { publicKey, privateKey } = await generateRSAKeyPair();

        // Generate voter ID
        const voterId = generateVoterId();

        // Generate token
        const token = generateToken();

        // Derive AES key from user's password
        const { key: aesKey, salt } = await deriveAESKey(password);

        // Encrypt private key
        const { encryptedUserData: encryptedPrivateKey, iv: privateKeyIV, authTag: privateKeyAuthTag } = encryptUserData(privateKey, aesKey);

        // Encrypt public key
        const { encryptedUserData: encryptedPublicKey, iv: publicKeyIV, authTag: publicKeyAuthTag } = encryptUserData(publicKey, aesKey);

        // Encrypt token
        const { encryptedUserData: encryptedToken, iv: tokenIV, authTag: tokenAuthTag } = encryptUserData(token, aesKey);

        // Debug logging
        console.log("Original Private Key:\n", privateKey);
        console.log("Encrypted Private Key:\n", encryptedPrivateKey);
        console.log("Private Key IV:\n", privateKeyIV);
        console.log("Private Key Auth Tag:\n", privateKeyAuthTag);
        console.log("Original Public Key:\n", publicKey);
        console.log("Encrypted Public Key:\n", encryptedPublicKey);
        console.log("Public Key IV:\n", publicKeyIV);
        console.log("Public Key Auth Tag:\n", publicKeyAuthTag);
        console.log("Original Token:\n", token);
        console.log("Encrypted Token:\n", encryptedToken);
        console.log("Token IV:\n", tokenIV);
        console.log("Token Auth Tag:\n", tokenAuthTag);
        console.log("AES Salt:\n", salt.toString('hex'));

        // Create new user
        const newUser = new User({
            voterId,
            name,
            email,
            password: hashedPassword,
            publicKey: encryptedPublicKey,
            publicKeyIV,
            publicKeyAuthTag,
            privateKey: encryptedPrivateKey,
            privateKeyIV,
            privateKeyAuthTag,
            privateKeyDerivationSalt: salt.toString('hex'),
            token: encryptedToken,
            tokenIV,
            tokenAuthTag,
            isVerified: false,
        });

        await newUser.save();

        // Send OTP
        await sendOtpToEmail(newUser);

        res.status(201).json({ message: "User registered, OTP sent", userId: newUser._id });
    } catch (error) {
        console.error("Register error:", error.message);
        res.status(500).json({ message: `Server error: ${error.message}` });
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
        const voters = await User.find({ isVerified: true }).select("-password -privateKey -privateKeyIV -privateKeyAuthTag -priv -publicKey -publicKeyIV -publicKeyAuthTag -token -tokenIV -tokenAuthTag -otp");
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
        const voter = await User.findById(id).select("-password -privateKey -privateKeyIV -privateKeyAuthTag -priv -publicKey -publicKeyIV -publicKeyAuthTag -token -tokenIV -tokenAuthTag -otp");
        if (!voter) return res.status(404).json({ message: "Voter not found" });
        res.status(200).json(voter);
    } catch (error) {
        console.error("Fetch voter error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Deriving key for aes algorithm
export const deriveUserAESKey = async(req, res)=>{
    try{
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({message: "Email and password are required"});
        }
        const user = await User.findOne({email});
        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        const saltHex = user.privateKeyDerivationSalt;
        if(!saltHex){
            return res.status(404).json({message: "No salt found for user"});
        }

        const saltBuffer = Buffer.from(saltHex, "hex");

        const {key: aesKey} = await deriveAESKey(password, saltBuffer);

        res.status(200).json({message: "Key derived successfully", aesKey: aesKey});
    }catch(err){
        console.error("Key derivation error:", error.message);
        return res.status(500).json({ message: `Server error: ${error.message}` });
    }
}