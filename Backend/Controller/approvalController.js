import asyncHandler from "express-async-handler";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import Approval from "../Model/Approved_Model.js";
import User from "../Model/User_Model.js";
import Admin from "../Model/Admin_Model.js";
import { deriveAESKey, encryptUserData, decryptUserData } from "../Utils/encryptUserData.js";
import { generateToken } from "../Utils/tokenGeneration.js";
import { generateRSAKeyPair,  } from "../Utils/rsaKeyGeneration.js";

// Helper function to send notification email
const sendNotificationEmail = async (user, subject, message) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });

    const mailOptions = {
        from: '"Decentralized Voting" <noreply@dvoting.com>',
        to: user.email,
        subject,
        html: `<p>${message}</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Notification sent to ${user.email}`);
    } catch (error) {
        console.error(`Failed to send notification to ${user.email}:`, error);
        throw new Error("Failed to send notification email");
    }
};

// Generate, hash, and save OTP
export const sendOtpToEmail = async (user, subject = "OTP for Decentralized-Voting System") => {
    const OTP = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(OTP, salt);

    user.otp = {
        code: hashedOtp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 mins
    };
    await user.save();

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    const mailOptions = {
        from: '"Decentralized Voting" <noreply@dvoting.com>',
        to: user.email,
        subject,
        html: `<p>Your OTP is <b>${OTP}</b>. It will expire in 5 minutes.</p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${user.email}`);
        return OTP;
    } catch (error) {
        console.error(`Failed to send OTP to ${user.email}:`, error);
        throw new Error("Failed to send OTP");
    }
};

// Verify hashed OTP
export const verifyOTP = async (user, OTP) => {
    console.log("OTP provided:", OTP);
    console.log("Stored OTP code:", user.otp?.code);
    console.log("OTP expires at:", user.otp?.expiresAt);

    if (!OTP) {
        throw new Error("OTP is required");
    }
    if (!user.otp || !user.otp.code) {
        throw new Error("No OTP pending for this user");
    }

    if (new Date() > new Date(user.otp.expiresAt)) {
        throw new Error("OTP expired");
    }

    const isMatch = await bcrypt.compare(OTP.toString(), user.otp.code);
    if (!isMatch) {
        throw new Error("OTP incorrect");
    }

    user.isVerified = true;
    user.otp = undefined;
    await user.save();
};

// Generate voter ID
const generateVoterId = () => {
    return "VOTER" + crypto.randomBytes(8).toString('hex').substring(0, 8).toUpperCase();
};

// @desc    Register user and store in Approval collection
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, pincode } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email }) || await Admin.findOne({ email });
    if (existingUser) {
        res.status(400).json({message:"Email already exists"});
        throw new Error("Email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new pending approval record
    const newPendingUser = new Approval({
        name,
        email,
        password: hashedPassword,
        pincode,
        status: "Pending",
        isVerified: false,
    });

    await newPendingUser.save();

    // Send OTP
    await sendOtpToEmail(newPendingUser);

    res.status(201).json({ message: "User registered, OTP sent", email: newPendingUser.email });
});

// @desc    Verify OTP for user registration
// @route   POST /api/users/verify-otp
// @access  Public
export const verifyUserOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
        res.status(400);
        throw new Error("Email and OTP are required");
    }

    const pendingUser = await Approval.findOne({ email });
    if (!pendingUser) {
        res.status(404);
        throw new Error("Pending user not found");
    }

    await verifyOTP(pendingUser, otp);

    res.status(200).json({ message: "OTP verified successfully, awaiting admin approval" });
});

// @desc    Resend OTP for user registration
// @route   POST /api/users/resend-otp
// @access  Public
export const resendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Validate input
    if (!email) {
        res.status(400);
        throw new Error("Email is required");
    }

    const pendingUser = await Approval.findOne({ email });
    if (!pendingUser) {
        res.status(404);
        throw new Error("Pending user not found");
    }

    // Check if user is still pending and not verified
    if (pendingUser.status !== "Pending") {
        res.status(400);
        throw new Error("User is not in pending status");
    }
    if (pendingUser.isVerified) {
        res.status(400);
        throw new Error("User is already verified");
    }

    // Send new OTP
    await sendOtpToEmail(pendingUser, "Resend OTP for Decentralized-Voting System");

    res.json({ message: "New OTP sent to email" });
});

// @desc    Get all pending users (Admin only)
// @route   GET /api/users/pending
// @access  Private/Admin
export const getPendingUsers = asyncHandler(async (req, res) => {
    const users = await Approval.find({ status: "Pending" }).select("-password");
    res.json(users);
});

// @desc    Approve user (Admin only)
// @route   PUT /api/users/approve/:id
// @access  Private/Admin
export const approveUser = asyncHandler(async (req, res) => {
    const pendingUser = await Approval.findById(req.params.id);
    if (!pendingUser) {
        res.status(404).json({message:"Pending user not found"});
        throw new Error("Pending user not found");
    }

    if (!pendingUser.isVerified) {
        res.status(400).json({message:"User has not verified their OTP"});
        throw new Error("User has not verified their OTP");
    }

    // Generate cryptographic fields
    const { publicKey, privateKey } = await generateRSAKeyPair();
    const voterId = generateVoterId();
    const token = generateToken(); // Generates a 48-byte token in hex
    const { key: aesKey, salt } = await deriveAESKey(pendingUser.password);
    const { encryptedUserData: encryptedPrivateKey, iv: privateKeyIV, authTag: privateKeyAuthTag } = encryptUserData(privateKey, aesKey);
    const { encryptedUserData: encryptedPublicKey, iv: publicKeyIV, authTag: publicKeyAuthTag } = encryptUserData(publicKey, aesKey);
    const { encryptedUserData: encryptedToken, iv: tokenIV, authTag: tokenAuthTag } = encryptUserData(token, aesKey);

    // Create new user in User collection
    const newUser = new User({
        voterId,
        name: pendingUser.name,
        email: pendingUser.email,
        password: pendingUser.password,
        publicKey: encryptedPublicKey,
        publicKeyIV,
        publicKeyAuthTag,
        privateKey: encryptedPrivateKey,
        privateKeyIV,
        privateKeyAuthTag,
        privateKeySalt: salt.toString('hex'),
        token: encryptedToken,
        tokenIV,
        tokenAuthTag,
        isVerified: true,
        pincode: pendingUser.pincode,
    });

    await newUser.save();
    pendingUser.status = "Accepted";
    await pendingUser.save();

    await sendNotificationEmail(
        newUser,
        "Account Approval Notification",
        `Dear ${newUser.name}, Your profile has been Approved.`
    );

    res.json({ message: "User approved and notified" });
});

// @desc    Reject user (Admin only)
// @route   DELETE /api/users/reject/:id
// @access  Private/Admin
export const rejectUser = asyncHandler(async (req, res) => {
    const pendingUser = await Approval.findById(req.params.id);
    if (!pendingUser) {
        res.status(404);
        throw new Error("Pending user not found");
    }

    const { reason } = req.body;
    if (!reason) {
        res.status(400);
        throw new Error("Rejection reason is required");
    }

    await sendNotificationEmail(
        pendingUser,
        "Account Rejection Notification",
        `Dear ${pendingUser.name}, Your profile has been rejected. Reason: ${reason}. Please visit the office for further details.`
    );

    await Approval.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "User rejected, notified, and removed from database" });
});
// @desc    Update user details (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUserDetails = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id) || await Approval.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    const { name } = req.body;
    const oldName = user.name;

    if (name) {
        user.name = name;
        await user.save();
        await sendNotificationEmail(
            user,
            "Profile Update Notification",
            `Dear ${user.name}, Your name has been changed from ${oldName} to ${user.name}.`
        );
    } else {
        await user.save();
        await sendNotificationEmail(
            user,
            "Profile Update Notification",
            `Dear ${user.name}, Your profile has been updated.`
        );
    }

    res.json({ message: "User details updated and notified" });
});