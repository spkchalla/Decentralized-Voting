import jwt from "jsonwebtoken";
import Admin from "../Model/Admin_Model.js"; // make sure the path is correct

export const protectAdmin = async (req, res, next) => {
  let token;

  // 1. Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1]; // Get token after "Bearer"

      // 2. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = await Admin.findById(decoded.adminId).select("-password -otp");

      if (!req.admin) {
        return res.status(401).json({ message: "Not authorized, admin not found" });
      }

      next(); // Continue to route
    } catch (err) {
      console.error("JWT verification failed:", err);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
