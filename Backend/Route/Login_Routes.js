import express from "express";
import { 
  login,
  verifyLoginOtp,
  forgotPassword,
  resetPassword,
  editProfile,
  verifyForgotOtp,
  resendOtpController
} from "../Controller/loginController.js";

import { protectAdmin } from "../Middleware/authContextAdmin.js";
import { protect } from "../Middleware/authContext.js";
import { allowUserOrAdmin, protectEither } from "../Middleware/authContextEither.js";

const LoginRouter = express.Router();

LoginRouter.post("/",login);
LoginRouter.post("/login-otp",verifyLoginOtp);
LoginRouter.post("/forgot-password", forgotPassword); // For resend also use the same one
LoginRouter.post("/reset-password", resetPassword);
LoginRouter.put("/editname", protectEither, editProfile);
LoginRouter.post("/verify", verifyForgotOtp);
LoginRouter.post("/resend", resendOtpController);




export default LoginRouter;
