import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () =>{
    try {
        const conn = await mongoose.connect(process.env.Mongo_URL);
    } catch (error) {
        console.error("Database Error:", error);
        process.exit(1);
    }
}

export default connectDB;