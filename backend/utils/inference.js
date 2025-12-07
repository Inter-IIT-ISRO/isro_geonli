import axios from "axios";

export const mockInference = async (image_url, query, history) => {
    // Random delay between 5-10 seconds to simulate varied inference times
    const randomDelay = Math.floor(Math.random() * 6000) + 5000; // 5000-10999ms
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    const q = query.toLowerCase();

    const singleWordPool = ["red", "blue", "white", "yellow", "green", "black"];

    const longTextPool = [
        "The scene contains a mixture of natural and man-made features. Vegetation spreads across the central region while built structures form a loose cluster toward the edges. Subtle textural patterns suggest a combination of agricultural land and sparse settlements.",
        "The landscape appears diverse, with patches of greenery, linear transport routes, and isolated buildings. Variations in tone and geometry hint at different land-use zones, and the spatial layout suggests a semi-rural environment transitioning toward development.",
        "This image shows layered terrain where natural contours merge with human activity. Agricultural plots create rhythmic patterns while clusters of structures introduce sharp geometry. The overall composition hints at ongoing expansion around a relatively calm landscape."
    ];

    const binaryPool = ["Yes", "No"];
    const numericPool = [0.0, 1.0, 2.0, 3.0, 4.5, 6.0];

    const groundingPool = [
        {
            response: "Highlighted the region you asked for.",
            boxes: [
                [0.36, 0.24, 0.48, 0.24, 0.48, 0.42, 0.36, 0.42],  // [x1,y1, x2,y2, x3,y3, x4,y4]
                [0.53, 0.38, 0.73, 0.38, 0.73, 0.72, 0.53, 0.72]
            ]
        },
        {
            response: "Marked the requested target area.",
            boxes: [
                [0.23, 0.56, 0.33, 0.56, 0.33, 0.66, 0.23, 0.66]
            ]
        },
        {
            response: "The relevant structures have been localized.",
            boxes: [
                [0.62, 0.14, 0.78, 0.14, 0.78, 0.36, 0.62, 0.36],
                [0.21, 0.64, 0.39, 0.64, 0.39, 0.86, 0.21, 0.86],
                [0.41, 0.36, 0.63, 0.36, 0.63, 0.64, 0.41, 0.64]
            ]
        }
    ];

    const titlePool = [
        "Scene Overview",
        "Image Summary",
        "Quick Snapshot",
        "Visual Insight",
        "Remote Sensing Summary",
        "Short Description",
        "General Overview",
        "Image Highlight"
    ];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const isTitleQuery =
        q.includes("title") ||
        q.includes("short description") ||
        q.includes("chat title") ||
        q.includes("summary title");

    const groundingKeywords = ["locate", "where", "highlight", "bbox", "box", "region", "point out"];
    const shouldGround = groundingKeywords.some(k => q.includes(k));

    const isBinary =
        q.startsWith("is ") ||
        q.startsWith("is there") ||
        q.includes(" present?") ||
        (q.includes("any") && q.includes("?"));

    const isNumeric =
        q.startsWith("how many") ||
        q.includes("count") ||
        q.includes("number of");

    const isSingleWordSemantic =
        (q.startsWith("what") || q.startsWith("which") || q.startsWith("who")) &&
        !q.includes("summary") &&
        !q.includes("describe") &&
        !q.includes("explain") &&
        !q.includes("generate") &&
        !q.includes("caption") &&
        !q.includes("overall");

    const isLongSemantic =
        q.includes("summary") ||
        q.includes("describe") ||
        q.includes("explain") ||
        q.includes("generate") ||
        q.includes("caption") ||
        q.includes("overall");

    if (isTitleQuery) {
        return {
            response: pick(titlePool),
            bounding_boxes: []
        };
    }

    if (isLongSemantic) {
        return {
            response: pick(longTextPool),
            bounding_boxes: []
        };
    }

    if (shouldGround) {
        const item = pick(groundingPool);
        return {
            response: item.response,
            bounding_boxes: item.boxes
        };
    }

    if (isNumeric) {
        return {
            response: pick(numericPool),
            bounding_boxes: []
        };
    }

    if (isBinary) {
        return {
            response: pick(binaryPool),
            bounding_boxes: []
        };
    }

    if (isSingleWordSemantic) {
        return {
            response: pick(singleWordPool),
            bounding_boxes: []
        };
    }
};

export const inference = async (inference_url, image_url, query, history, category, resolution, transformed_query) => {
    const payload = { image_url, query, history, category };
    if (resolution) {
        payload['resolution'] = resolution;
    }
    if (transformed_query) {
        payload['transformed_query'] = transformed_query;
    }
    console.log("Payload: ",payload)
    return (
        await axios.post(
            inference_url + '/inference',
            payload,
            {
                proxy: false, 
                timeout: 180000,
                headers: {
                    'Connection': 'keep-alive'
                }
            }
        )
    ).data;
};

