import express from "express";
import { 
  login,
  verifyLoginOtp,
  forgotPassword,
  resetPassword
} from "../Controller/loginController.js";

const LoginRouter = express.Router();

LoginRouter.post("/",login);
LoginRouter.post("/login-otp",verifyLoginOtp);
LoginRouter.post("/forgot-password", forgotPassword); // For resend also use the same one
LoginRouter.post("/reset-password", resetPassword);




export default LoginRouter;
