import express from "express";
import {
  createElection,
  getAllElections,
  updateElectionStatus,
  forceFinishElection,
  forceStartElection,
} from "../Controller/ElectionController.js"; // Adjust path as needed
import { getUserElectionDashboard, registerForElection, getElectionDetails } from "../Controller/ElectionUserController.js";
import { protectAdmin } from "../Middleware/authContextAdmin.js";
import { protect } from "../Middleware/authContext.js";

const electionRouter = express.Router();

// GET /api/election - Get all elections
electionRouter.get("/", protectAdmin, getAllElections);

// POST /api/elections - Create a new election
electionRouter.post("/create", protectAdmin, createElection);

// PATCH /api/election/:id/status - Update election status
electionRouter.patch("/:id/status", protectAdmin, updateElectionStatus);

// PATCH /api/election/:id/force-finish - Force finish election
electionRouter.patch("/:id/force-finish", protectAdmin, forceFinishElection);

// PATCH /api/election/:id/force-start - Force start election
electionRouter.patch("/:id/force-start", protectAdmin, forceStartElection);

electionRouter.get('/dashboard', protect, getUserElectionDashboard);
electionRouter.post('/register', protect, registerForElection);
electionRouter.get('/:electionId', protect, getElectionDetails);


export default electionRouter;