import express from "express";
import { 
  requestLoginOtp, 
  loginWithOtp, 
  resendLoginOtp, 
  requestAdminSetupOtp,
  verifyAdminSetupOtp,
  forgotPassword,
  resetPassword
} from "../Controller/loginController.js";

const LoginRouter = express.Router();

LoginRouter.post("/request-otp", requestLoginOtp);
LoginRouter.post("/verify-otp", loginWithOtp);
LoginRouter.post("/resend-otp", resendLoginOtp);
LoginRouter.post("/admin/request-setup-otp", requestAdminSetupOtp);
LoginRouter.post("/admin/verify-setup-otp", verifyAdminSetupOtp);


export default LoginRouter;
