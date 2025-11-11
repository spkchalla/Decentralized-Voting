import express from "express";
import { protectAdmin } from "../Middleware/authContextAdmin.js";

import { castVote } from "../Controller/voteController.js";

const VoteRouter = express.Router();

VoteRouter.post("/castVote", castVote);