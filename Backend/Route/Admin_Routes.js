import express from "express";
import { addAdmin, getAdminId} from "../Controller/adminController.js";
import { protectAdmin } from "../Middleware/authContextAdmin.js";

const AdminRoute = express.Router();


AdminRoute.post("/addu", addAdmin);
AdminRoute.post("/add",protectAdmin, addAdmin);
AdminRoute.get("/get/:id",getAdminId); 

export default AdminRoute;