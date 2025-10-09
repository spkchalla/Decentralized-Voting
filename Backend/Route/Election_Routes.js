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

const electionRouter = express.Router();

// POST /api/elections - Create a new election
electionRouter.post("/create", createElection);

// GET /api/elections - Get all elections (with optional status query param)
electionRouter.get("/", getAllElections);

// GET /api/elections/:id - Get election by ID
electionRouter.get("/:id", getElectionById);

// PUT /api/elections/:id - Update election by ID
electionRouter.put("/update/:id", updateElection);

// DELETE /api/elections/:id - Delete election by ID
electionRouter.delete("/:id", deleteElection);

// GET /api/elections/:id/results - Get election results by ID
electionRouter.get("/:id/results", getElectionResults);

// PATCH /api/elections/:id/status - Update election status by ID
electionRouter.patch("/:id/status", updateElectionStatus);

export default electionRouter;