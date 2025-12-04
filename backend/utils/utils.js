import { generateCompletion, populateChatDescription, addMessageToSharedChat } from "../controllers/chat.js";
import { getResponse } from "../controllers/evaluation.js";

export function tryCatch(func) {
    return (req, res, next, ...args) => {
        func(req, res, next, ...args).catch(next);
    };
}

export const getResponseWithInferenceFunction = (inference) => {
    return (req, res, next) => getResponse(req, res, next, inference);
}

export const getPopulateChatDescriptionFunction = (inference) => {
    return (req, res, next) => populateChatDescription(req, res, next, inference);
}

export const getGenerateCompletionFunction = (inference) => {
    return (req, res, next) => generateCompletion(req, res, next, inference);
}

export const getAddMessageToSharedChatFunction = (inference) => {
    return (req, res, next) => addMessageToSharedChat(req, res, next, inference);
}

export const normalizeBBoxes = (bbox) => {
    if (!Array.isArray(bbox)) return [];

    const isValid = bbox.every(
        box =>
            Array.isArray(box) &&
            box.length === 8 &&
            box.every(v => typeof v === "number" && Number.isFinite(v))
    );

    return isValid ? bbox : [];
}
