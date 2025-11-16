import mongoose, { mongo } from "mongoose";
//import {Election} from "./Election_Model.js";

const ipfsVoteCIDSchema = new mongoose.Schema({
    cid:{
        type: String,
        required: true,
        unique: true,
    },
    link:{
        type: String,
        required: true,
        unique: true,
    },
    electionId:{
        type:  mongoose.Schema.ObjectId,
        ref: "Election",
        required: true,
        // Note: NOT unique - multiple votes per election allowed
        index: true
    }
});

export default mongoose.model("IpfsVoteCID", ipfsVoteCIDSchema);