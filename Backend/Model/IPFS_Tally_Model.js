import mongoose, { mongo } from "mongoose";

const ipfsTallySchema = new mongoose.Schema({
    cid:{
        type: String,
        required: true,
        unique: true,
    }
});

export default mongoose.model("IpfsTally", ipfsTallySchema);