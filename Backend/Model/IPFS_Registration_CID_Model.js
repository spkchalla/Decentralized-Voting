import mongoose from "mongoose";

const ipfsRegistrationCIDSchema = new mongoose.Schema({
    cid: {
        type: String,
        required: true,
        //unique: true,
    },
    link:{
        type: String,
        required: true,
        //unique: true,
    },
    electionId: {
        type: mongoose.Schema.ObjectId,
        ref: "Election",
        required: true
    }
});

export default mongoose.model("IpfsRegistrationCID", ipfsRegistrationCIDSchema);
