import mongoose, { Schema } from "mongoose";

const partySchema = new Schema({
    party_id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    symbol: {
        type: String,
    },
    status:{
        type:Number,
        default:1
    }
}, { timestamps: true });

const Party = mongoose.models.Party || mongoose.model("Party", partySchema);
export default Party;
