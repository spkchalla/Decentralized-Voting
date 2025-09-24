import jwt from "jsonwebtoken";
import User from "../Model/User_Model.js";

export const protect = async (req, res, next) => {
  let token;

  // 1. Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1]; // Get token after "Bearer"

      // 2. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select("-password");

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
