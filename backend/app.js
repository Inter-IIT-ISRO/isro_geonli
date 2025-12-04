import express from "express";
import { config } from "dotenv";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import adminRouter from "./routes/admin.js";
import userRouter from "./routes/user.js";
import evaluationRouter from "./routes/evaluation.js";
import chatRouter from "./routes/chat.js";
import cookieParser from "cookie-parser";
import axios from "axios";
import { tryCatch } from "./utils/utils.js";

const app = express();
config();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/evaluate", evaluationRouter);
app.use("/api/chat", chatRouter);
app.post("/api/classify", tryCatch(async (req, res) => {
    console.log("Received classify request:", req.body, process.env.INFERENCE_URL_QWEN);
    res.status(200).json((await axios.post(process.env.INFERENCE_URL_QWEN + '/inference', { image_url: req.body.image_url, query: req.body.query, category: "classify" })).data);
}));

app.get("/", (_, res) => {
    res.send("Server is working");
});

app.use(errorMiddleware);

export default app;
