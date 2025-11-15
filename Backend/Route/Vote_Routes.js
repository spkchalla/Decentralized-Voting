import express from "express";

import { castVote } from "../Controller/voteController.js";

const VoteRouter = express.Router();

VoteRouter.post("/castVote", castVote);

export default VoteRouter;