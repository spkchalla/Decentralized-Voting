import express from "express";
import { addAdmin, setupAdminPassword } from "../Controller/adminController.js";
import { protectAdmin } from "../Middleware/authContextAdmin.js";

const AdminRoute = express.Router();

// Root endpoint for adding admin
//AdminRoute.post("/addit", addAdmin);

AdminRoute.post("/addu", addAdmin);
AdminRoute.post("/add",protectAdmin, addAdmin);

// Route 2: Setup Admin Password (OTP verification)
AdminRoute.post("/setup-password", setupAdminPassword);


export default AdminRoute;