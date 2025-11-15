import mongoose, { Schema } from "mongoose";

const userSubSchema = new Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User"
    },
    isAccepted: {
        type: Boolean,
        default: false
    }
});

const electionSchema = new Schema({
    eid: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    startDateTime: {
        type: Date,
        required: true
    },
    endDateTime: {
        type: Date,
        required: true
    },
    users: [userSubSchema],
    candidates: [{
        candidate: { type: mongoose.Schema.ObjectId, ref: "Candidate" },
        votesCount: { type: Number, default: 0 }
    }],
    officers: [{
        type: mongoose.Schema.ObjectId,
        ref: "Admin"
    }],
    status: {
        type: String,
        enum: ["Active", "Not Yet Started", "Finished"],
        default: "Not Yet Started"
    },
    // Election commission public key
    ecPublicKey:{
        type:String,
        required:true
    },
    // Election commission private key
    ecPrivateKey:{
        type:String,
        required:true
    },
    ecPrivateKeyIV:{
        type:String,
        required:true
    },
    ecPrivateKeyAuthTag:{
        type:String,
        required:true
    },
    ecprivateKeyDerivationSalt:{
        type:String,
        required:true
    },
    pinCodes:[{
        type:Number,
        required:true
    }],
    // Hashed password field
    password:{
        type:String,
        required:true
    }
}, { timestamps: true });

const Election = mongoose.models.Election || mongoose.model("Election", electionSchema);
export default Election;