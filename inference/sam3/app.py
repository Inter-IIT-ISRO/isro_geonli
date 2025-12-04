from fastapi import FastAPI, Request
import os
from sam3_model import SAM_MODEL
from pydantic import BaseModel
from utils import get_image_path
from functools import partial
import asyncio
from contextlib import asynccontextmanager
import torch
from typing import Optional

@asynccontextmanager
async def lifespan(app: FastAPI):
    models = {}
    device = "cuda" if torch.cuda.is_available() else "cpu"
    idx2label = {1: 'area', 2: 'length', 0: 'count'}

    print("Loading SAM3 model...")

    sam3 = SAM_MODEL(device, idx2label)

    models = {
        "sam3": sam3
    }
    
    # access through req.state.models
    yield {"models": models}
    
    print("Cleaning up...")
    models.clear()

app = FastAPI(lifespan=lifespan)

class ClassifyPayload(BaseModel):
    query: str

class InferencePayload(BaseModel):
    image_url: str
    query: str
    transformed_query: str
    category: str
    resolution: Optional[float] = None

@app.post("/inference")
async def infer(payload: InferencePayload, req: Request):
    try:
        image_path = await get_image_path(payload.image_url)
    except Exception as e:
        return {"error": f"Image download failed: {str(e)}"}

    category = payload.category
    model = req.state.models["sam3"]
    loop = asyncio.get_running_loop()
    inference = await loop.run_in_executor(
        None, 
        partial(model.infer, image_path, payload.query, payload.transformed_query, category, payload.resolution)
    )
    print(category, inference)
    if category == "vqa_numeric":
        out = {
            "response": inference,
            "bounding_boxes": []
        }
    elif category == "grounding":
        out = {
            "response": "",
            "bounding_boxes": inference
        }
    

    os.remove(image_path)
    return out

@app.get("/health")
def health():
    return {"status": "ok"}
