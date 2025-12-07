import ErrorHandler from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { getPresignedUrl, saveImageAndGetObjectKey } from "../utils/minio.js";
import { normalizeBBoxes, tryCatch } from "../utils/utils.js";
import crypto from "crypto";
import axios from "axios";

export const createChat = tryCatch(async (req, res, next) => {
    const { file } = req;

    if (!file) {
        return next(new ErrorHandler("Image file is required", 400));
    }

    const image_key = await saveImageAndGetObjectKey(file);
    const user_id = req.user ? req.user._id : null;
    const newChat = await Chat.create({
        user: user_id,
        image_key,
        chats: []
    })

    res.status(201).json({
        chat_id: newChat._id,
        message: "Chat created successfully"
    });
})

export const getChatById = tryCatch(async (req, res, next) => {
    const { id } = req.params;

    const chat = await Chat.findById(id);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (chat.user && (!req.user || req.user._id.toString() !== chat.user.toString())) {
        return next(new ErrorHandler("Unauthorized", 403));
    }

    const image_url = await getPresignedUrl(chat.image_key);
    res.status(200).json({chat, image_url});
})

export const populateChatDescription = tryCatch(async (req, res, next, inference) => {
    const inference_url = process.env.INFERENCE_URL_QWEN;
    const { id } = req.params;

    const chat = await Chat.findById(id);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (req.user._id.toString() !== chat.user.toString()) {
        return next(new ErrorHandler("Unauthorized", 403));
    }

    const image_url = await getPresignedUrl(chat.image_key);
    chat.description = (await inference(inference_url, image_url, "Generate a concise summary of this remote sensing image to be used as a chat history title", [], "sidebar_title")).response;
    await chat.save();

    res.status(200).json({
        message: "Chat description populated successfully",
        description: chat.description
    });
})

export const generateCompletion = tryCatch(async (req, res, next, inference) => {
    const { chat_id, query, category, transformed_query } = req.query;
    const inference_url = (category === 'vqa_numeric' || category === 'grounding') ? process.env.INFERENCE_URL_SAM : process.env.INFERENCE_URL_QWEN;
    
    const chat = await Chat.findById(chat_id);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (chat.user && (!req.user || req.user._id.toString() !== chat.user.toString())) {
        return next(new ErrorHandler("Unauthorized", 403));
    }
    
    const image_url = await getPresignedUrl(chat.image_key);
    
    // Detect task type - grounding vs non-grounding
    const isGroundingTask = detectGroundingTask(query);
    
    // Track inference time
    const startTime = Date.now();
    const inferenceResponse = await inference(inference_url, image_url, query, chat.chats, category, NaN, transformed_query);
    const endTime = Date.now();
    const responseTime = ((endTime - startTime) / 1000).toFixed(2); // Convert to seconds
    
    const bboxes = normalizeBBoxes(inferenceResponse.bounding_boxes);
    let resp = inferenceResponse.response;
    if (!resp) {
        if (category === 'grounding') {
            if (inferenceResponse.bounding_boxes.length === 0) {
                resp = "The specified object(s) or region(s) were not found in the image.";
            } else {
                resp = "Requested bounding boxes have been generated"
            }
        } else {
            resp = "I'm sorry, I couldn't generate a response for your query.";
        }
    }
    
    // Don't save response_time here - it will be updated from frontend
    chat.chats.push({
        query,
        response: resp,
        bounding_boxes: bboxes
    });
    await chat.save();
    
    res.status(200).json({
        response: resp,
        bounding_boxes: bboxes,
        response_time: responseTime,
        task_type: isGroundingTask ? 'grounding' : 'reasoning'
    });
});

// Helper function to detect if query is a grounding task
function detectGroundingTask(query) {
    const q = (query || "").toLowerCase().trim();
    const groundingMarkers = [
        "locate", "point to", "highlight", "position of", "bounding box", "bbox",
        "identify the region", "mark the", "localize", "region of", "where is", "find the"
    ];
    return groundingMarkers.some(marker => q.includes(marker));
}

export const chatStream = tryCatch(async (req, res, next) => {
    const inference_url = process.env.INFERENCE_URL_QWEN;
    const { chat_id, query, category } = req.query;
    
    const chat = await Chat.findById(chat_id);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (chat.user && (!req.user || req.user._id.toString() !== chat.user.toString())) {
        return next(new ErrorHandler("Unauthorized", 403));
    }
    
    const image_url = await getPresignedUrl(chat.image_key);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const startTime = Date.now();
                
        const response = await axios({
            method: 'post',
            url: `${inference_url}/stream`,
            data: {
                image_url,
                query,
                category: category,
                history: chat.chats
            },
            responseType: 'stream',
            timeout: 180000
        });

        let buffer = '';
        let currentMode = null;
        let fullReasoning = '';
        let fullSolution = '';
        let bboxes = [];

        response.data.on('data', (chunk) => {
            try {
                buffer += chunk.toString();
                while (true) {
                    if (!currentMode) {
                        const reasoningStart = buffer.indexOf('<REASONING>');
                        const solutionStart = buffer.indexOf('<SOLUTION>');
                        const errorStart = buffer.indexOf('<ERROR>');

                        if (errorStart !== -1) {
                            const errorEnd = buffer.indexOf('</ERROR>');
                            if (errorEnd !== -1) {
                                const errorMsg = buffer.substring(errorStart + 7, errorEnd);
                                res.write(`event: error\n`);
                                res.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
                                res.end();
                                return;
                            }
                            break;
                        } else if (reasoningStart !== -1) {
                            currentMode = 'reasoning';
                            buffer = buffer.substring(reasoningStart + 11);
                        } else if (solutionStart !== -1) {
                            currentMode = 'solution';
                            buffer = buffer.substring(solutionStart + 10);
                        } else {
                            break;
                        }
                    } else {
                        const endTag = currentMode === 'reasoning' ? '</REASONING>' : '</SOLUTION>';
                        const endIndex = buffer.indexOf(endTag);

                        if (endIndex !== -1) {
                            const content = buffer.substring(0, endIndex);
                            if (content) {
                                res.write(`event: ${currentMode}\n`);
                                res.write(`data: ${JSON.stringify(content)}\n\n`);

                                if (currentMode === 'reasoning') fullReasoning += content;
                                if (currentMode === 'solution') fullSolution += content;
                            }
                            buffer = buffer.substring(endIndex + endTag.length);
                            currentMode = null;
                        } else {
                            if (buffer) {
                                res.write(`event: ${currentMode}\n`);
                                res.write(`data: ${JSON.stringify(buffer)}\n\n`);

                                if (currentMode === 'reasoning') fullReasoning += buffer;
                                if (currentMode === 'solution') fullSolution += buffer;

                                buffer = '';
                            }
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing chunk:', error);
                if (!res.writableEnded) {
                    res.write(`event: error\n`);
                    res.write(`data: ${JSON.stringify({ message: "Failed to process chunk" })}\n\n`);
                    res.end();
                }
            }
        });

        response.data.on('end', async () => {
            try {
                const endTime = Date.now();
                const responseTime = ((endTime - startTime) / 1000).toFixed(2);

                // Don't save times here - they will be updated from frontend
                chat.chats.push({
                    query,
                    reasoning: fullReasoning.trim(),
                    response: fullSolution.trim(),
                    bounding_boxes: bboxes
                });
                
                await chat.save();

                res.write(`event: end\n`);
                res.write(`data: ${JSON.stringify({ response_time: responseTime, bounding_boxes: bboxes })}\n\n`);
                res.end();
                
            } catch (error) {
                console.error("Error saving chat or ending stream:", error);
                if (!res.writableEnded) {
                    res.write(`event: error\n`);
                    res.write(`data: ${JSON.stringify({ message: "Failed to save chat" })}\n\n`);
                    res.end();
                }
            }
        });

        response.data.on('error', (error) => {
            console.error('Stream error:', error);
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify(error.message)}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('Streaming error:', error.message);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify(error.message)}\n\n`);
        res.end();
    }
})

export const getChatSidebar = tryCatch(async (req, res, next) => {
    const allChats = await Chat.find({ user: req.user._id }, "_id description createdAt").sort({ createdAt: -1 });
    res.status(200).json(allChats);
});

export const renameChat = tryCatch(async (req, res, next) => {
    const { id } = req.params;
    const { description } = req.body;

    if (!description || description.trim().length === 0) {
        return next(new ErrorHandler("Description is required", 400));
    }

    const chat = await Chat.findById(id);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (!req.user || req.user._id.toString() !== chat.user.toString()) {
        return next(new ErrorHandler("Unauthorized", 403));
    }

    chat.description = description.trim();
    await chat.save();

    res.status(200).json({
        message: "Chat renamed successfully",
        description: chat.description
    });
});

export const deleteChat = tryCatch(async (req, res, next) => {
    const { id } = req.params;

    const chat = await Chat.findById(id);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (!req.user || req.user._id.toString() !== chat.user.toString()) {
        return next(new ErrorHandler("Unauthorized", 403));
    }

    await Chat.findByIdAndDelete(id);

    res.status(200).json({
        message: "Chat deleted successfully"
    });
});

// Share chat - generate or update share link
export const shareChat = tryCatch(async (req, res, next) => {
    const { id } = req.params;
    const { permission } = req.body; // 'view' or 'edit'

    if (!permission || !['view', 'edit'].includes(permission)) {
        return next(new ErrorHandler("Invalid permission. Must be 'view' or 'edit'", 400));
    }

    const chat = await Chat.findById(id);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (!req.user || req.user._id.toString() !== chat.user.toString()) {
        return next(new ErrorHandler("Unauthorized", 403));
    }

    // Generate share token if not exists
    if (!chat.shareToken) {
        chat.shareToken = crypto.randomBytes(16).toString('hex');
    }
    
    chat.sharePermission = permission;
    chat.sharedAt = new Date();
    await chat.save();

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${chat.shareToken}`;

    res.status(200).json({
        message: "Chat shared successfully",
        shareToken: chat.shareToken,
        shareUrl,
        permission: chat.sharePermission
    });
});

// Revoke chat sharing
export const revokeShare = tryCatch(async (req, res, next) => {
    const { id } = req.params;

    const chat = await Chat.findById(id);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (!req.user || req.user._id.toString() !== chat.user.toString()) {
        return next(new ErrorHandler("Unauthorized", 403));
    }

    chat.shareToken = undefined;
    chat.sharePermission = 'none';
    chat.sharedAt = undefined;
    await chat.save();

    res.status(200).json({
        message: "Share access revoked successfully"
    });
});

// Get shared chat by token (public access)
export const getSharedChat = tryCatch(async (req, res, next) => {
    const { token } = req.params;

    const chat = await Chat.findOne({ shareToken: token }).populate('user', 'email');
    if (!chat || chat.sharePermission === 'none') {
        return next(new ErrorHandler("Shared chat not found or access revoked", 404));
    }

    const image_url = await getPresignedUrl(chat.image_key);
    
    res.status(200).json({
        chat: {
            _id: chat._id,
            description: chat.description,
            chats: chat.chats,
            sharePermission: chat.sharePermission,
            owner: chat.user?.email || 'Anonymous'
        },
        image_url
    });
});

// Add message to shared chat (only if edit permission)
export const addMessageToSharedChat = tryCatch(async (req, res, next, inference) => {
    const { token } = req.params;
    const { query } = req.body;

    if (!query || !query.trim()) {
        return next(new ErrorHandler("Query is required", 400));
    }

    const chat = await Chat.findOne({ shareToken: token });
    if (!chat || chat.sharePermission !== 'edit') {
        return next(new ErrorHandler("Chat not found or editing not allowed", 403));
    }

    const image_url = await getPresignedUrl(chat.image_key);
    
    // Track inference time
    const startTime = Date.now();
    const inferenceResponse = await inference(image_url, query, chat.chats, {});
    const endTime = Date.now();
    const responseTime = ((endTime - startTime) / 1000).toFixed(2);
    
    const bboxes = normalizeBBoxes(inferenceResponse.bounding_boxes);
    chat.chats.push({
        query,
        response: inferenceResponse.response,
        bounding_boxes: bboxes
    });
    await chat.save();
    
    res.status(200).json({
        response: inferenceResponse.response,
        bounding_boxes: bboxes,
        response_time: responseTime
    });
});

// Update chat message times (called from frontend after generation)
export const updateChatTimes = tryCatch(async (req, res, next) => {
    const { chat_id } = req.params;
    const { message_index, response_time, reasoning_time } = req.body;

    const chat = await Chat.findById(chat_id);
    if (!chat) {
        return next(new ErrorHandler("Chat not found", 404));
    }
    if (chat.user && (!req.user || req.user._id.toString() !== chat.user.toString())) {
        return next(new ErrorHandler("Unauthorized", 403));
    }

    if (message_index < 0 || message_index >= chat.chats.length) {
        return next(new ErrorHandler("Invalid message index", 400));
    }

    // Update the times
    if (response_time !== undefined) {
        chat.chats[message_index].response_time = response_time;
    }
    if (reasoning_time !== undefined) {
        chat.chats[message_index].reasoning_time = reasoning_time;
    }

    // Mark the array as modified so Mongoose saves it
    chat.markModified('chats');
    await chat.save();

    res.status(200).json({
        message: "Times updated successfully",
        updated: {
            response_time: chat.chats[message_index].response_time,
            reasoning_time: chat.chats[message_index].reasoning_time
        }
    });
});
