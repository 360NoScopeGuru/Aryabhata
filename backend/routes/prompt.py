from fastapi import APIRouter, Depends
from models import EnhanceRequest
from auth import get_current_user
from openai import AsyncOpenAI
import os

router = APIRouter(tags=["prompt"])

NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"
ENHANCE_MODEL = "meta/llama-3.2-3b-instruct"

@router.post("/prompt/enhance")
async def enhance_prompt(body: EnhanceRequest, _: str = Depends(get_current_user)):
    api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEY_CHAT") or os.getenv("NVIDIA_API_KEY_CODE")
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)
    try:
        resp = await client.chat.completions.create(
            model=ENHANCE_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Rewrite the user's prompt to be clearer, more specific, and more likely "
                        "to produce a high-quality AI response. Return ONLY the improved prompt "
                        "with no explanation, no preamble, and no quotes around it."
                    ),
                },
                {"role": "user", "content": body.text[:4000]},
            ],
            max_tokens=512,
            temperature=0.3,
        )
        enhanced = resp.choices[0].message.content.strip().strip('"\'')
        return {"enhanced": enhanced}
    except Exception as e:
        return {"enhanced": body.text, "error": str(e)}
