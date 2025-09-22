import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    voterId:{
        type:String,
        required:true,
        unique:true
    },
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    publicKey:{
        type:String
    },
    privateKey:{
        type:String
    },
    pastElections:[{
        eid:{type:mongoose.Schema.ObjectId, ref:"Election"},
        hasVoted:{type:Boolean, default:false}
    }]
},{timestamps: true})

const User = mongoose.models.User || mongoose.model("User",userSchema);
export default User;