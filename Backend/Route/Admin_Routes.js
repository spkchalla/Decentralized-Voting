import express from "express";
import { 
    addAdmin, 
    getAdminId, 
    getAllAdmins, 
    updateAdmin, 
    deleteAdmin 
} from "../Controller/adminController.js";
import { protectAdmin } from "../Middleware/authContextAdmin.js";

const AdminRoute = express.Router();

AdminRoute.post("/addu", addAdmin);
AdminRoute.post("/add", protectAdmin, addAdmin);
AdminRoute.get("/get/:id", protectAdmin, getAdminId);
AdminRoute.get("/", protectAdmin, getAllAdmins);
AdminRoute.patch("/update/:id", protectAdmin, updateAdmin);
AdminRoute.delete("/delete/:id", protectAdmin, deleteAdmin);

export default AdminRoute;
