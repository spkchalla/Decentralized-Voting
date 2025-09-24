import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Model/User_Model.js";
import Admin from "../Model/Admin_Model.js";
import { sendOtpToEmail, verifyOTP } from "../Utils/OTP.js";

// Helper to identify type
const getAccount = async (email) => {
  let user = await User.findOne({ email });
  if (user) return { account: user, type: "user" };

  let admin = await Admin.findOne({ emailId: email });
  if (admin) return { account: admin, type: "admin" };

  return null;
};

// Step 1: Verify credentials and send OTP
export const requestLoginOtp = async (req, res) => {
  try {
    const { email, password } = req.body;

    const data = await getAccount(email);
    if (!data) return res.status(404).json({ message: "Account not found" });

    const { account, type } = data;

    // Admin password check
    if (type === "admin" && !account.password) {
      return res.status(400).json({ message: "Please set your password first" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    if (type === "user" && !account.isVerified) {
      return res.status(401).json({ message: "User not verified. Please verify your account first." });
    }

    // Send OTP
    await sendOtpToEmail(account, `${type === "user" ? "Login OTP for User" : "Login OTP for Admin"}`);

    res.status(200).json({ message: "OTP sent to your email", accountId: account._id, type });
  } catch (error) {
    console.error("Login OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Step 2: Verify OTP and issue JWT
export const loginWithOtp = async (req, res) => {
  try {
    const { accountId, otp, type } = req.body;

    let account;
    if (type === "user") account = await User.findById(accountId);
    else if (type === "admin") account = await Admin.findById(accountId);
    else return res.status(400).json({ message: "Invalid account type" });

    if (!account) return res.status(404).json({ message: "Account not found" });

    try {
      await verifyOTP(account, otp);

      // Generate short-lived JWT
      const token = jwt.sign(
        { id: account._id, type },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
      );

      res.status(200).json({
        message: "Login successful",
        token,
        id: type === "user" ? account.voterId : account.emp_id,
        name: account.name,
        email: type === "user" ? account.email : account.emailId,
        type
      });
    } catch (err) {
      return res.status(401).json({ message: err.message });
    }
  } catch (error) {
    console.error("Login verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Resend OTP for both users/admins
export const resendLoginOtp = async (req, res) => {
  try {
    const { accountId, type } = req.body;

    let account;
    if (type === "user") account = await User.findById(accountId);
    else if (type === "admin") account = await Admin.findById(accountId);
    else return res.status(400).json({ message: "Invalid account type" });

    if (!account) return res.status(404).json({ message: "Account not found" });

    if (type === "user" && account.isVerified) {
      return res.status(400).json({ message: "User already verified / logged in" });
    }

    await sendOtpToEmail(account, `${type === "user" ? "Resent OTP for User" : "Resent OTP for Admin"}`);

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// --- Set Admin Password by email (initial setup) ---
// Controller: Request OTP to setup password
export const requestAdminSetupOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await Admin.findOne({ emailId: email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (admin.password) {
      return res.status(400).json({ message: "Password already set" });
    }

    // Patch email property so sendOtpToEmail works
    admin.email = admin.emailId;

    // Generate OTP and store hashed OTP in admin model
    await sendOtpToEmail(admin, "OTP to setup your Admin password");

    res.status(200).json({
      message: "OTP sent to your email for password setup",
      adminId: admin._id,
    });
  } catch (error) {
    console.error("Request Admin OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Controller: Verify OTP and set admin password
export const verifyAdminSetupOtp = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const admin = await Admin.findOne({ emailId: email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (admin.password) {
      return res.status(400).json({ message: "Password already set" });
    }

    // Verify OTP
    try {
      await verifyOTP(admin, otp);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    // Validate password strength (optional, but recommended)
    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Hash and save password
    const hashedPassword = await bcrypt.hash(password, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({ message: "Password set successfully. Admin ready to login." });
  } catch (error) {
    console.error("Verify Admin OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Forgot Password: send OTP ---
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Try user first
    let account = await User.findOne({ email });
    let type = "user";

    if (!account) {
      // Then try admin
      account = await Admin.findOne({ emailId: email });
      type = "admin";

      if (!account) return res.status(404).json({ message: "Account not found" });

      // Patch email for OTP utility
      account.email = account.emailId;
    }

    // Generate and save OTP
    const OTP = await sendOtpToEmail(account, `OTP for ${type} password reset`);

    console.log("OTP stored in DB (hashed):", account.otp);
    console.log("Plain OTP sent via email:", OTP);

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// --- Reset Password after OTP verification ---
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Try user first
    let account = await User.findOne({ email });

    if (!account) {
      // Then try admin
      account = await Admin.findOne({ emailId: email });
      if (!account) return res.status(404).json({ message: "Account not found" });

      // Patch email for OTP utility
      account.email = account.emailId;
    }

    console.log("Account before verifyOTP:", account);
    console.log("OTP field:", account.otp);

    // Verify OTP (hashed)
    try {
      await verifyOTP(account, otp);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    account.password = hashedPassword;
    await account.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
