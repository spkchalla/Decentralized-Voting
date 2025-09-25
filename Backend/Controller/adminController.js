import Admin from "../Model/Admin_Model.js";
import User from "../Model/User_Model.js";
import bcrypt from "bcryptjs";
import { sendOtpToEmail, verifyOTP } from "../Utils/OTP.js";
import nodemailer from "nodemailer";


// Controller: Add Admin
export const addAdmin = async (req, res) => {
    try {
        const { name, role, emailId } = req.body;

        // Check if email already exists
        const existingAdmin = await Admin.findOne({ emailId });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin with this email already exists" });
        }

        const existingUser = await User.findOne({ email: emailId });
        if (existingUser) {
            return res.status(400).json({
                message: "Already a user exists with this email. Use a different email for Admin",
                existingUser
            });
        }

        // Generate sequential emp_id
        const lastAdmin = await Admin.findOne().sort({ createdAt: -1 });
        let emp_id = "ADM-0001";
        if (lastAdmin && lastAdmin.emp_id) {
            const lastNumber = parseInt(lastAdmin.emp_id.split("-")[1]);
            emp_id = `ADM-${String(lastNumber + 1).padStart(4, "0")}`;
        }

        // Create admin record without password
        const newAdmin = new Admin({
            emp_id,
            name,
            role,
            emailId,
            password: null
        });

        await newAdmin.save();

        // Send email notifying admin creation (no OTP)
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        await transporter.sendMail({
            from: '"Decentralized Voting" <noreply@dvoting.com>',
            to: emailId,
            subject: "You have been added as Admin",
            html: `<p>Hello ${name},</p>
                   <p>You have been added as an Admin. Please visit the system to setup your password.</p>`
        });

        res.status(201).json({
            message: "Admin added successfully. Email sent for password setup.",
            adminId: newAdmin._id,
            emp_id: newAdmin.emp_id
        });

    } catch (error) {
        console.error("Add Admin error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const requestAdminSetupOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await Admin.findOne({ emailId: email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (admin.password) {
      return res.status(400).json({ message: "Password already set" });
    }

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

// Controller: Setup Admin Password
export const setupAdminPassword = async (req, res) => {
  try {
    const { adminId, otp, password } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // OTP verification is mandatory here
    try {
      await verifyOTP(admin, otp);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    // Hash and save password
    const hashedPassword = await bcrypt.hash(password, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({ message: "Password set successfully. Admin ready to login." });

  } catch (error) {
    console.error("Setup Admin Password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
