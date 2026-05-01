from fastapi import APIRouter, HTTPException
from models import ImageRequest
from database import get_db
import os, uuid, httpx
from datetime import datetime, timezone

router = APIRouter(tags=["image"])

NVIDIA_GENAI_BASE = "https://ai.api.nvidia.com/v1/genai"

def now():
    return datetime.now(timezone.utc).isoformat()

@router.post("/image/generate")
async def generate_image(body: ImageRequest):
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
    image_url = f"data:image/jpeg;base64,{b64}"

    msg_id = str(uuid.uuid4())
    async with await get_db() as db:
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
        await db.commit()

    return {"id": msg_id, "image_url": image_url, "prompt": body.prompt}
