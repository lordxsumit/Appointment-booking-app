import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
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
    mobileNumber: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true
    }
}, {timestamps: true})

export const user = await mongoose.model("user", userSchema)
