import express from "express";
import {
  createElection,
  getAllElections,
  getElectionById,
  updateElection,
  deleteElection,
  getElectionResults,
  updateElectionStatus
} from "../Controller/ElectionController.js"; // Adjust path as needed
import { protectAdmin } from "../Middleware/authContextAdmin.js";

const electionRouter = express.Router();

// POST /api/elections - Create a new election
electionRouter.post("/create", protectAdmin,createElection);

// GET /api/elections - Get all elections (with optional status query param)
electionRouter.get("/",protectAdmin, getAllElections);

// GET /api/elections/:id - Get election by ID
electionRouter.get("/:id", protectAdmin,getElectionById);

// PUT /api/elections/:id - Update election by ID
electionRouter.put("/update/:id", protectAdmin,updateElection);

// DELETE /api/elections/:id - Delete election by ID
electionRouter.delete("/:id", protectAdmin,deleteElection);

// GET /api/elections/:id/results - Get election results by ID
electionRouter.get("/:id/results", protectAdmin,getElectionResults);

// PATCH /api/elections/:id/status - Update election status by ID
electionRouter.patch("/:id/status", protectAdmin,updateElectionStatus);

export default electionRouter;