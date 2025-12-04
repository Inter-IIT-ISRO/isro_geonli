import mongoose from "mongoose";

const schema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        select: false,
        default: null,
    },
    isWhitelisted: {
        type: Boolean,
        default: true,
    },
    role: {
        type: Number,
        enum: [1, 2], // 1: user, 2: admin
        default: 1,
    }
}, { timestamps: true });

export const User = mongoose.model("User", schema);
