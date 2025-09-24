import Admin from "../Model/Admin_Model.js";
import bcrypt from "bcryptjs";

// Add a new Admin
export const addAdminu = async (req, res) => {
  try {
    const { emp_id, name, role, password, emailId } = req.body;

    // Check if emp_id or emailId already exists
    const existingAdmin = await Admin.findOne({ $or: [{ emp_id }, { emailId }] });
    if (existingAdmin) {
      return res.status(400).json({ message: "Employee ID or Email already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({ emp_id, name, role, password: hashedPassword, emailId });
    await admin.save();

    res.status(201).json({
      message: "Admin added successfully",
      admin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
