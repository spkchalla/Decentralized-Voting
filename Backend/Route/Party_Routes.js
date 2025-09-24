import express from "express";
import { protectAdmin } from "../Middleware/authContextAdmin.js";
import {
  addParty,
  editParty,
  viewAllParties,
  viewPartyById,
  deleteParty,
  viewActiveParties
} from "../Controller/partyController.js"; // Adjust path as needed

const PartyRouter = express.Router();

// Routes with protectAdmin middleware
PartyRouter.post("/add", protectAdmin, addParty);
PartyRouter.put("/edit/:id", protectAdmin, editParty);
PartyRouter.get("/all", protectAdmin, viewAllParties);
PartyRouter.get("/active", protectAdmin, viewActiveParties);
PartyRouter.get("/view/:id", protectAdmin, viewPartyById);
PartyRouter.delete("/:id", protectAdmin, deleteParty);

export default PartyRouter;