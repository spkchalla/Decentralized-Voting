import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Model/User_Model.js";
import Admin from "../Model/Admin_Model.js";
import { sendOtpToEmail, verifyOTP } from "../Utils/OTP.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if email exists in User or Admin collection
    let user = await User.findOne({ email });
    let admin = null;
    let userType = "user";

    if (!user) {
      admin = await Admin.findOne({ emailId: email });
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      userType = "admin";
    }

    // Verify password
    const entity = user || admin;
    const isMatch = await bcrypt.compare(password, entity.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Normalize admin to have an 'email' field for sendOtpToEmail
    if (userType === "admin") {
      entity.email = entity.emailId;
    }

    // Send OTP
    await sendOtpToEmail(entity, "Login OTP for Decentralized-Voting System");

    res.status(200).json({ 
      message: "OTP sent to email",
      userType
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Find user or admin based on email
    let entity;
    let userType = "user";
    entity = await User.findOne({ email });

    if (!entity) {
      entity = await Admin.findOne({ emailId: email });
      if (!entity) {
        return res.status(404).json({ message: "User not found" });
      }
      userType = "admin";
      // Normalize admin to have an 'email' field for verifyOTP
      entity.email = entity.emailId;
    }

    // Verify OTP
    await verifyOTP(entity, otp);

    // Generate JWT token
    const payload = userType === "user" 
      ? { userId: entity._id }
      : { adminId: entity._id };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Remove temporary email field for admins before saving
    if (userType === "admin") {
      delete entity.email;
    }

    res.status(200).json({
      message: "Login successful",
      userType,
      token
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(400).json({ message: error.message || "Failed to verify OTP" });
  }
};


export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if email exists in User or Admin collection
    let user = await User.findOne({ email });
    let admin = null;
    let userType = "user";

    if (!user) {
      admin = await Admin.findOne({ emailId: email });
      if (!admin) {
        return res.status(404).json({ message: "Email not found" });
      }
      userType = "admin";
      // Normalize admin to have an 'email' field for sendOtpToEmail
      admin.email = admin.emailId;
    }

    // Send OTP to the found user/admin
    const entity = user || admin;
    await sendOtpToEmail(entity, "Password Reset OTP for Decentralized-Voting System");

    res.status(200).json({ 
      message: "OTP sent to email",
      userType
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Reset password after OTP verification
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    // Find user or admin based on email
    let entity;
    let userType = "user";
    entity = await User.findOne({ email });

    if (!entity) {
      entity = await Admin.findOne({ emailId: email });
      if (!entity) {
        return res.status(404).json({ message: "User not found" });
      }
      userType = "admin";
      // Normalize admin to have an 'email' field for verifyOTP
      entity.email = entity.emailId;
    }

    // Verify OTP
    await verifyOTP(entity, otp);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    entity.password = hashedPassword;

    // Remove temporary email field for admins before saving
    if (userType === "admin") {
      delete entity.email;
    }

    await entity.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(400).json({ message: error.message || "Failed to reset password" });
  }
};

export const editProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    let entity;
    let userType = "user";

    // Check if the request is from a user or admin using middleware data
    if (req.user) {
      entity = await User.findOne({ _id: req.user._id, email: req.user.email });
      if (!entity) {
        return res.status(404).json({ message: "User not found" });
      }
      // Ensure email matches the logged-in user's email
      if (email && email !== entity.email) {
        return res.status(401).json({ message: "Not authorized" });
      }
    } else if (req.admin) {
      entity = await Admin.findById(req.admin._id);
      if (!entity) {
        return res.status(404).json({ message: "Admin not found" });
      }
      userType = "admin";
      // Ensure email matches the logged-in admin's email
      if (email && email !== entity.emailId) {
        return res.status(401).json({ message: "Not authorized" });
      }
    } else {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Only allow updating name
    entity.name = name;
    await entity.save();

    // Return updated profile
    const updatedProfile = {
      _id: entity._id,
      name: entity.name,
      email: userType === "user" ? entity.email : entity.emailId,
      userType
    };

    res.status(200).json({
      message: "Name updated successfully",
      profile: updatedProfile
    });
  } catch (error) {
    console.error("Edit profile error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
