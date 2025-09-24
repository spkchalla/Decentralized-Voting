import express from "express";
import { registerUser, verifyUserOtp, getAllVoters, getVoterById, resendOtp } from "../Controller/userController.js";

const userRoute = express.Router();

// Step 1: register + send OTP
userRoute.post("/register", registerUser);

// Step 2: verify OTP
userRoute.post("/verify-otp", verifyUserOtp);

// Get all verified voters
userRoute.get("/", getAllVoters);

// Get single voter by DB id
userRoute.get("/get/:id", getVoterById);
userRoute.post("/resend-otp", resendOtp);


export default userRoute;
