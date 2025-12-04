import express from "express";
import multer from 'multer';
import { createChat, getChatById, getChatSidebar, renameChat, deleteChat, shareChat, revokeShare, getSharedChat, addMessageToSharedChat, chatStream, updateChatTimes } from "../controllers/chat.js";
import isAuthenticated, { forwardAuthenticatedUser } from "../middlewares/auth.js";
import { getGenerateCompletionFunction, getPopulateChatDescriptionFunction, getAddMessageToSharedChatFunction } from "../utils/utils.js";
import { inference, mockInference } from "../utils/inference.js";

const upload = multer();

const router = express.Router();
router.post("/", upload.single('image'), forwardAuthenticatedUser, createChat);
router.get("/completion", forwardAuthenticatedUser, getGenerateCompletionFunction(inference));
router.get("/completion_stream", forwardAuthenticatedUser, chatStream);
router.get("/sidebar", isAuthenticated, getChatSidebar);
router.get("/describe/:id", isAuthenticated, getPopulateChatDescriptionFunction(inference));
router.get("/:id", forwardAuthenticatedUser, getChatById);
router.put("/rename/:id", isAuthenticated, renameChat);
router.delete("/:id", isAuthenticated, deleteChat);
router.put("/update-times/:chat_id", forwardAuthenticatedUser, updateChatTimes);

// Share routes
router.post("/share/:id", isAuthenticated, shareChat);
router.delete("/share/:id", isAuthenticated, revokeShare);

// Public shared chat routes
router.get("/shared/:token", getSharedChat);
router.post("/shared/:token/message", getAddMessageToSharedChatFunction(mockInference));

export default router;
