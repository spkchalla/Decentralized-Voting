import express from "express";
import {
  createElection,
} from "../Controller/ElectionController.js"; // Adjust path as needed
import { getUserElectionDashboard, registerForElection, getElectionDetails } from "../Controller/ElectionUserController.js";
import { protectAdmin } from "../Middleware/authContextAdmin.js";
import { protect } from "../Middleware/authContext.js";

const electionRouter = express.Router();

// POST /api/elections - Create a new election
electionRouter.post("/create", protectAdmin,createElection);


electionRouter.get('/dashboard', protect, getUserElectionDashboard);
electionRouter.post('/register', protect, registerForElection);
electionRouter.get('/:electionId', protect, getElectionDetails);


export default electionRouter;