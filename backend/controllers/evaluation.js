import axios from "axios";
import { tryCatch } from "../utils/utils.js";

export const getResponse = tryCatch(async (req, res, _, inference) => {
    let body = req.body;
    const { image_url, metadata } = body.input_image;
    const captioning = await inference(process.env.INFERENCE_URL_QWEN, image_url, body.queries.caption_query.instruction, [], "captioning");

    let transformed_query = (await axios.post(process.env.INFERENCE_URL_QWEN + '/inference', { image_url, query: body.queries.grounding_query.instruction, category: "classify" }, {
            proxy: false, 
            timeout: 180000,
            headers: {
                'Connection': 'keep-alive'
            }
        })).data.transformed_query
    const grounding = await inference(process.env.INFERENCE_URL_SAM, image_url, body.queries.grounding_query.instruction, [], "grounding", NaN, transformed_query);
    console.log("Response: ", grounding)
    const vqa_binary = await inference(process.env.INFERENCE_URL_QWEN, image_url, body.queries.attribute_query.binary.instruction, [], "vqa_binary");

    transformed_query = (await axios.post(process.env.INFERENCE_URL_QWEN + '/inference', { image_url, query: body.queries.attribute_query.numeric.instruction, category: "classify" }, {
            proxy: false, 
            timeout: 180000,
            headers: {
                'Connection': 'keep-alive'
            }
        })).data.transformed_query
    const vqa_numeric = await inference(process.env.INFERENCE_URL_SAM, image_url, body.queries.attribute_query.numeric.instruction, [], "vqa_numeric", metadata.spatial_resolution_m, transformed_query);
    const vqa_semantic = await inference(process.env.INFERENCE_URL_QWEN, image_url, body.queries.attribute_query.semantic.instruction, [], "vqa_semantic");

    body.queries.caption_query.response = captioning.response;

    body.queries.grounding_query.response = grounding.bounding_boxes.map((box, idx) => ({
        "object-id": String(idx + 1),
        "obbox": box
    }));

    body.queries.attribute_query.binary.response = vqa_binary.response;
    body.queries.attribute_query.numeric.response = parseFloat(vqa_numeric.response);
    body.queries.attribute_query.semantic.response = vqa_semantic.response;

    res.status(200).json(body);
})
