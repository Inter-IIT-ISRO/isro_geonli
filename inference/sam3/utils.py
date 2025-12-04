import uuid
import asyncio
from io import BytesIO
from PIL import Image
import httpx
from functools import partial
import cv2
import numpy as np
import os
import matplotlib

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


def mask_to_rotated_box(mask):
    height, width = mask.shape[:2]

    mask = (mask > 0).astype(np.uint8)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    cnt = max(contours, key=cv2.contourArea)

    rect = cv2.minAreaRect(cnt)
    box = cv2.boxPoints(rect)

    box[:, 0] /= width
    box[:, 1] /= height

    return [round(float(x), 3) for x in box.flatten()]

def calculate_area(mask, resolution=None):
    assert mask.ndim == 2, "dimension of mask should be 2"

    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return 0.0
    largest_contour = max(contours, key=cv2.contourArea)
    pixel_count = cv2.contourArea(largest_contour)

    if resolution is not None:
        area = pixel_count * resolution**2
    else:
        area = pixel_count / (mask.shape[0] * mask.shape[1]) * 100

    return float(area)

def calculate_perimeter(mask, resolution=None):
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return 0.0
    largest_contour = max(contours, key=cv2.contourArea)

    perimeter = cv2.arcLength(largest_contour, True, )

    if resolution:
        perimeter *= resolution
    return perimeter

def overlay_masks(image, masks):
    image = image.convert("RGBA")
    masks = 255 * masks

    n_masks = masks.shape[0]
    cmap = matplotlib.colormaps.get_cmap("rainbow").resampled(n_masks)
    colors = [
        tuple(int(c * 255) for c in cmap(i)[:3])
        for i in range(n_masks)
    ]

    for mask, color in zip(masks, colors):
        mask = Image.fromarray(mask)
        overlay = Image.new("RGBA", image.size, color + (0,))
        alpha = mask.point(lambda v: int(v * 0.5))
        overlay.putalpha(alpha)
        image = Image.alpha_composite(image, overlay)
    return image


def plot_rotated_boxes_from_path(image_path, obbs, save_path="output_obb.jpg"):
    if not os.path.exists(image_path):
        print(f"Error: File not found at {image_path}")
        return

    image = cv2.imread(image_path)
    if image is None:
        print(f"Error: Could not decode image at {image_path}")
        return

    if not obbs:
        print("No OBBs provided. Saving original image.")
        cv2.imwrite(save_path, image)
        return

    h_img, w_img = image.shape[:2]
    
    all_boxes = []

    for obb in obbs:
        n_xc, n_yc, n_w, n_h, angle = obb

        xc = n_xc * w_img
        yc = n_yc * h_img
        w = n_w * w_img
        h = n_h * h_img

        rect = ((xc, yc), (w, h), angle)
        box = cv2.boxPoints(rect)
        box = np.int32(box)
        
        all_boxes.append(box)

    cv2.polylines(image, all_boxes, True, (0, 0, 255), 3)

    cv2.imwrite(save_path, image)
    print(f"Result saved to: {save_path}")