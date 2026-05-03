from fastapi import APIRouter, HTTPException, Depends
from models import ImageRequest
from database import get_db
from auth import get_current_user
import os, uuid, httpx, asyncio
import cloudinary
import cloudinary.uploader
from datetime import datetime, timezone

router = APIRouter(tags=["image"])

NVIDIA_GENAI_BASE = "https://ai.api.nvidia.com/v1/genai"

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

def now():
    return datetime.now(timezone.utc).isoformat()

def _upload_to_cloudinary(b64: str, public_id: str) -> str:
    result = cloudinary.uploader.upload(
        f"data:image/jpeg;base64,{b64}",
        folder="aryabhata",
        public_id=public_id,
        overwrite=True,
    )
    return result["secure_url"]

@router.post("/image/generate")
async def generate_image(body: ImageRequest, _: str = Depends(get_current_user)):
    api_key = os.getenv("NVIDIA_API_KEY_IMAGE") or os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEY_CHAT")
    endpoint = f"{NVIDIA_GENAI_BASE}/{body.model}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "prompt": body.prompt,
        "width": body.width,
        "height": body.height,
        "seed": 0,
        "steps": body.steps,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(endpoint, headers=headers, json=payload)

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    artifacts = data.get("artifacts", [])
    if not artifacts:
        raise HTTPException(status_code=500, detail="No image returned")

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
            (str(uuid.uuid4()), body.conversation_id, "user", body.prompt, "image", body.model, now())
        )
        await db.execute(
            "INSERT INTO messages (id,conversation_id,role,content,mode,model,image_url,created_at) VALUES (?,?,?,?,?,?,?,?)",
            (msg_id, body.conversation_id, "assistant", body.prompt, "image", body.model, image_url, now())
        )
        await db.execute(
            "UPDATE conversations SET updated_at=? WHERE id=?",
            (now(), body.conversation_id)
        )

    return {"id": msg_id, "image_url": image_url, "prompt": body.prompt}
