import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: Number,
        required: true
    }
}, {timestamps: true})

export const doctor = await mongoose.model("doctor", doctorSchema)
