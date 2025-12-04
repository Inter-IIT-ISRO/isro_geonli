import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
    query: {
        type: String,
        required: true
    },
    reasoning: {
        type: String,
        default: ''
    },
    response: {
        type: String,
        required: true
    },
    bounding_boxes: {
        type: [[Number]],
        default: []
        // each: [x_center, y_center, width, height, angle]
    },
    response_time: {
        type: String,
        default: null
    },
    reasoning_time: {
        type: String,
        default: null
    }
}, { _id: false });

const schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
        default: null
    },
    image_key: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    chats: {
        type: [chatMessageSchema],
        default: []
    },
    shareToken: {
        type: String,
        unique: true,
        sparse: true
    },
    sharePermission: {
        type: String,
        enum: ['none', 'view', 'edit'],
        default: 'none'
    },
    sharedAt: {
        type: Date
    }
}, { timestamps: true });

export const Chat = mongoose.model("Chat", schema);
