import mongoose, { Schema } from "mongoose";

const adminSchema = new Schema({
    emp_id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    history: [{
        type: mongoose.Schema.ObjectId,
        ref: "Election"
    }]
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default Admin;
