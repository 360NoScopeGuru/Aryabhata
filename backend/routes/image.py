import asyncio
import os
import uuid
from datetime import UTC, datetime

import cloudinary
import cloudinary.uploader
import httpx
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import get_db
from models import ALLOWED_IMAGE_MODELS, ImageRequest
from rate_limit import RateLimit

router = APIRouter(tags=["image"])
_image_limit = RateLimit("image")

NVIDIA_GENAI_BASE = "https://ai.api.nvidia.com/v1/genai"

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)


def now():
    return datetime.now(UTC).isoformat()


def _upload_to_cloudinary(b64: str, public_id: str) -> str:
    result = cloudinary.uploader.upload(
        f"data:image/jpeg;base64,{b64}",
        folder="aryabhata",
        public_id=public_id,
        overwrite=True,
    )
    return result["secure_url"]


@router.post("/image/generate")
async def generate_image(
    body: ImageRequest, _: str = Depends(get_current_user), __: None = Depends(_image_limit)
):
    if body.model not in ALLOWED_IMAGE_MODELS:
        raise HTTPException(status_code=400, detail=f"Model not allowed: {body.model}")
    api_key = (
        os.getenv("NVIDIA_API_KEY_IMAGE") or os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEY_CHAT")
    )
    endpoint = f"{NVIDIA_GENAI_BASE}/{body.model}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    model = body.model
    is_schnell = "schnell" in model
    is_sd3 = "stable-diffusion-3" in model

    payload = {
        "prompt": body.prompt,
        "width": body.width,
        "height": body.height,
        "seed": 0,
        "steps": min(body.steps, 4) if is_schnell else body.steps,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(endpoint, headers=headers, json=payload)

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    if is_sd3:
        raw = data.get("image", "")
        b64 = raw.split(",", 1)[-1] if "," in raw else raw
    else:
        artifacts = data.get("artifacts", [])
        if not artifacts:
            raise HTTPException(
                status_code=500, detail=f"No image returned. Response keys: {list(data.keys())}"
            )
        b64 = artifacts[0].get("base64", "")
    msg_id = str(uuid.uuid4())

    # Upload to Cloudinary in a thread (SDK is synchronous)
    try:
        image_url = await asyncio.to_thread(_upload_to_cloudinary, b64, msg_id)
    except Exception:
        # Fallback to base64 if Cloudinary upload fails
        image_url = f"data:image/jpeg;base64,{b64}"

    async with get_db() as db:
        await db.execute(
            "INSERT INTO messages (id,conversation_id,role,content,mode,model,created_at) VALUES (?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), body.conversation_id, "user", body.prompt, "image", body.model, now()),
        )
        await db.execute(
            "INSERT INTO messages (id,conversation_id,role,content,mode,model,image_url,created_at) VALUES (?,?,?,?,?,?,?,?)",
            (msg_id, body.conversation_id, "assistant", body.prompt, "image", body.model, image_url, now()),
        )
        await db.execute("UPDATE conversations SET updated_at=? WHERE id=?", (now(), body.conversation_id))

    return {"id": msg_id, "image_url": image_url, "prompt": body.prompt}
