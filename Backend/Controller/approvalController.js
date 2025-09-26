import asyncHandler from "express-async-handler";
import nodemailer from "nodemailer";
import User from "../Model/User_Model.js";

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

  await transporter.sendMail(mailOptions);
};

// @desc    Get all pending users (Admin only)
// @route   GET /api/users/pending
// @access  Private/Admin
export const getPendingUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ status: "Pending" }).select("-password -privateKey -token");
  res.json(users);
});

// @desc    Approve user (Admin only)
// @route   PUT /api/users/approve/:id
// @access  Private/Admin
export const approveUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.status = "Accepted";
  user.isVerified = true;
  await user.save();
  await sendNotificationEmail(
    user,
    "Account Approval Notification",
    `Dear ${user.name}, 
    Your profile has been Approved.`
  );

  res.json({ message: "User approved and notified" });
});

// @desc    Reject user (Admin only)
// @route   DELETE /api/users/reject/:id
// @access  Private/Admin
export const rejectUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.status = "Rejected";
  await user.save();
  await sendNotificationEmail(
    user,
    "Account Rejection Notification",
    `Dear ${user.name}, 
    Your Profile has been Rejected. Please visit office.`
  );

  res.json({ message: "User rejected and notified" });
});

// @desc    Update user details (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUserDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name } = req.body;
  const oldName = user.name; // Store old name before updating

  // Update name field only
  if (name) {
    user.name = name;
    await user.save();
    await sendNotificationEmail(
      user,
      "Profile Update Notification",
      `Dear ${user.name}, 
      Your name has been changed from ${oldName} to ${user.name}.`
    );
  } else {
    await sendNotificationEmail(
      user,
      "Profile Update Notification",
      `Dear ${user.name}, Your profile has been updated.`
    );
  }

  res.json({ message: "User details updated and notified" });
});

// @desc    Verify OTP for user
// @route   POST /api/users/verify-otp
// @access  Private
export const verifyUserOtp = asyncHandler(async (req, res) => {
  res.status(400);
  throw new Error("OTP verification is no longer supported");
});