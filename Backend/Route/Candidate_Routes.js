import express from "express";
import { protectAdmin } from "../Middleware/authContextAdmin.js";
import {
  addCandidate,
  editCandidate,
  viewAllCandidates,
  viewCandidateById,
  deleteCandidate,
  viewActiveCandidates,
  activeCandidate,
} from "../Controller/candidateController.js"; // Adjust path as needed

const CandidateRouter = express.Router();

// Routes with protectAdmin middleware
CandidateRouter.post("/add", protectAdmin, addCandidate);
CandidateRouter.put("/edit/:id", protectAdmin, editCandidate);
CandidateRouter.get("/all", protectAdmin, viewAllCandidates);
CandidateRouter.get("/active", protectAdmin, viewActiveCandidates);
CandidateRouter.get("/:id", protectAdmin, viewCandidateById);
CandidateRouter.delete("/:id", protectAdmin, deleteCandidate);
CandidateRouter.put("/active/:id", protectAdmin, activeCandidate);


export default CandidateRouter;