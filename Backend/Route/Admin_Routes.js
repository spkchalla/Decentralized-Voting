import express from "express";
import { addAdmin, setupAdminPassword } from "../Controller/adminController.js";
import { protectAdmin } from "../Middleware/authContextAdmin.js";

const AdminRoute = express.Router();


AdminRoute.post("/addu", addAdmin);
AdminRoute.post("/add",protectAdmin, addAdmin);

export default AdminRoute;