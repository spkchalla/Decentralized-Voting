import express from "express";
import { getPendingUsers, approveUser, rejectUser, updateUserDetails , verifyUserOtp} from "../Controller/approvalController.js";
import { protectAdmin } from "../Middleware/authContextAdmin.js";

const ApprovalRouter = express.Router();

// Admin routes
ApprovalRouter.get("/pending", protectAdmin, getPendingUsers);
ApprovalRouter.put("/approve/:id", protectAdmin, approveUser);
ApprovalRouter.delete("/reject/:id", protectAdmin, rejectUser);
ApprovalRouter.put("/update/:id", protectAdmin, updateUserDetails);
ApprovalRouter.post("/verify-otp", verifyUserOtp);

export default ApprovalRouter;