import uuid
import asyncio
from io import BytesIO
from PIL import Image
import httpx
from functools import partial

def _process_and_save(img_bytes: bytes) -> str:
    img = Image.open(BytesIO(img_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")
    
    path = f"{uuid.uuid4()}.jpg"
    img.save(path)
    return path

async def get_image_path(image_url: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.get(image_url, timeout=60)
        response.raise_for_status()
        img_bytes = response.content

    loop = asyncio.get_running_loop()
    image_path = await loop.run_in_executor(None, partial(_process_and_save, img_bytes))
    
    return image_path