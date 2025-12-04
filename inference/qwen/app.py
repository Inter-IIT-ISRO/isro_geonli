from fastapi import FastAPI, Request
import os
from pydantic import BaseModel
from utils import get_image_path
from functools import partial
import asyncio
from contextlib import asynccontextmanager
import torch
from qwen_model import QwenModel
from fastapi.responses import StreamingResponse
from starlette.concurrency import iterate_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from starlette.background import BackgroundTask

@asynccontextmanager
async def lifespan(app: FastAPI):
    models = {}
    print("Loading QWEN model...")

    qwen = QwenModel()

    models = {
        "qwen": qwen
    }
    
    # access through req.state.models
    yield {"models": models}
    
    print("Cleaning up...")
    models.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InferencePayload(BaseModel):
    image_url: str
    query: str
    category: str


@app.post("/stream")
async def stream_inference(
    payload: InferencePayload,
    req: Request
):
    try:
        image_path = await get_image_path(payload.image_url)
    except Exception as e:
        return {"error": f"Image download failed: {str(e)}"}
    
    model = req.state.models["qwen"]

    stream_generator = model.infer(
        image_path, 
        payload.query, 
        payload.category
    )

    return StreamingResponse(
        iterate_in_threadpool(stream_generator), 
        media_type="text/plain",
        background=BackgroundTask(os.remove, image_path)
    )

@app.post("/inference")
async def infer(payload: InferencePayload, req: Request):
    try:
        image_path = await get_image_path(payload.image_url)
    except Exception as e:
        return {"error": f"Image download failed: {str(e)}"}

    model = req.state.models["qwen"]

    loop = asyncio.get_running_loop()
    inference = await loop.run_in_executor(
        None, 
        partial(model.infer, image_path, payload.query, payload.category, False)
    )
    if payload.category == "classify":
        category, transformed_query = inference.split("|||", 1)
        out = {
            "category": category.strip(),
            "transformed_query": transformed_query.strip()
        }
    else:
        out = {
            "response": inference,
            "bounding_boxes": []
        }

    os.remove(image_path)
    return out

@app.get("/health")
def health():
    return {"status": "ok"}
