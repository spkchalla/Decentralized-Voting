import express from "express";
import { registerUser, verifyUserOtp, getPendingUsers, approveUser, rejectUser, updateUserDetails, resendOtp } from "../Controller/approvalController.js";
import { protectAdmin } from "../Middleware/authContextAdmin.js";

const ApprovalRouter = express.Router();

// Admin routes
ApprovalRouter.post("/register", registerUser);
ApprovalRouter.post("/verify-otp", verifyUserOtp);
ApprovalRouter.get("/pending", getPendingUsers); // Add auth middleware here if needed
ApprovalRouter.put("/approve/:id", approveUser);
ApprovalRouter.delete("/reject/:id", rejectUser);
ApprovalRouter.put("/:id", updateUserDetails);
ApprovalRouter.post("/resend", resendOtp);

export default ApprovalRouter;