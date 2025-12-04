import express from "express";
import { getResponseWithInferenceFunction } from "../utils/utils.js";
import { inference, mockInference } from "../utils/inference.js";

const router = express.Router();
router.post("/mock", getResponseWithInferenceFunction(mockInference));
router.post("/", getResponseWithInferenceFunction(inference));

export default router;
