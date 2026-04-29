from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models import ChatRequest, RouteRequest
from database import get_db
from openai import AsyncOpenAI
import os, uuid, json
from datetime import datetime, timezone
from pydantic import BaseModel

router = APIRouter(tags=["chat"])

NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

ROUTER_MODEL = "meta/llama-3.1-8b-instruct"

def now():
    return datetime.now(timezone.utc).isoformat()

def get_api_key(model: str) -> str:
    if "mistral" in model.lower():
        return os.getenv("NVIDIA_API_KEY_MISTRAL") or os.getenv("NVIDIA_API_KEY_CHAT")
    if "405b" in model or "llama-3.1-70b" in model:
        return os.getenv("NVIDIA_API_KEY_CODE") or os.getenv("NVIDIA_API_KEY_CHAT")
    return os.getenv("NVIDIA_API_KEY_CHAT")

async def detect_mode(prompt: str) -> str:
    api_key = os.getenv("NVIDIA_API_KEY_ROUTER")
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)
    resp = await client.chat.completions.create(
        model=ROUTER_MODEL,
        messages=[{
            "role": "system",
            "content": (
                "You are a task router. Given a user message, reply with exactly one word: "
                "'chat', 'code', or 'image'. "
                "'code' if the user wants to write, debug, explain, or review code. "
                "'image' if the user wants to generate, draw, or create an image. "
                "'chat' for everything else."
            )
        }, {"role": "user", "content": prompt}],
        max_tokens=5,
        temperature=0.0,
    )
    result = resp.choices[0].message.content.strip().lower()
    if result not in ("chat", "code", "image"):
        return "chat"
    return result

@router.post("/route")
async def route_task(body: RouteRequest):
    mode = await detect_mode(body.prompt)
    return {"mode": mode}

@router.post("/chat/stream")
async def chat_stream(body: ChatRequest):
    model = body.model
    api_key = get_api_key(model)
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)

    msg_id = str(uuid.uuid4())
    full_response = []

    async def generate():
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=[{"role": m.role, "content": m.content} for m in body.messages],
                max_tokens=4096,
                temperature=0.7,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_response.append(delta)
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        full_text = "".join(full_response)
        try:
            async with await get_db() as db:
                user_msg = body.messages[-1]
                await db.execute(
                    "INSERT INTO messages (id,conversation_id,role,content,mode,model,created_at) VALUES (?,?,?,?,?,?,?)",
                    (str(uuid.uuid4()), body.conversation_id, user_msg.role, user_msg.content, "chat", model, now())
                )
                await db.execute(
                    "INSERT INTO messages (id,conversation_id,role,content,mode,model,created_at) VALUES (?,?,?,?,?,?,?)",
                    (msg_id, body.conversation_id, "assistant", full_text, "chat", model, now())
                )
                await db.execute(
                    "UPDATE conversations SET updated_at=?, model=? WHERE id=?",
                    (now(), model, body.conversation_id)
                )
                await db.commit()
        except Exception:
            import traceback
            traceback.print_exc()

        yield f"data: {json.dumps({'done': True, 'id': msg_id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


class NameRequest(BaseModel):
    conversation_id: str
    first_message: str

@router.post("/chat/name")
async def name_conversation(body: NameRequest):
    api_key = os.getenv("NVIDIA_API_KEY_ROUTER")
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)
    try:
        resp = await client.chat.completions.create(
            model=ROUTER_MODEL,
            messages=[{
                "role": "system",
                "content": (
                    "Generate a short, descriptive title (4-6 words) for a conversation that starts with the given message. "
                    "Reply with ONLY the title, no quotes, no punctuation at the end."
                )
            }, {"role": "user", "content": body.first_message[:500]}],
            max_tokens=20,
            temperature=0.7,
        )
        title = resp.choices[0].message.content.strip().strip('"\'')
        # Update in DB
        async with await get_db() as db:
            await db.execute(
                "UPDATE conversations SET title=?, updated_at=? WHERE id=?",
                (title, now(), body.conversation_id)
            )
            await db.commit()
        return {"title": title}
    except Exception as e:
        return {"title": body.first_message[:40], "error": str(e)}
