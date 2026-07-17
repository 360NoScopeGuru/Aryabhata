import json
import os
import time
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from model_pricing import estimate_cost_usd
from models import ChatRequest, RouteRequest
from rate_limit import RateLimit

_chat_limit = RateLimit("chat")

router = APIRouter(tags=["chat"])

NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"
ROUTER_MODEL = "meta/llama-3.1-8b-instruct"


def now():
    return datetime.now(UTC).isoformat()


def get_api_key(model: str) -> str:
    m = model.lower()
    if "mistral" in m or "mixtral" in m or "codestral" in m:
        return (
            os.getenv("NVIDIA_API_KEY_MISTRAL")
            or os.getenv("NVIDIA_API_KEY")
            or os.getenv("NVIDIA_API_KEY_CHAT")
        )
    if "405b" in m:
        return (
            os.getenv("NVIDIA_API_KEY_CODE")
            or os.getenv("NVIDIA_API_KEY")
            or os.getenv("NVIDIA_API_KEY_CHAT")
        )
    return os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEY_CHAT") or os.getenv("NVIDIA_API_KEY_CODE")


async def detect_mode(prompt: str) -> str:
    api_key = os.getenv("NVIDIA_API_KEY_ROUTER")
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)
    resp = await client.chat.completions.create(
        model=ROUTER_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a task router. Given a user message, reply with exactly one word: "
                    "'chat', 'code', or 'image'. "
                    "'code' if the user wants to write, debug, explain, or review code. "
                    "'image' if the user wants to generate, draw, or create an image. "
                    "'chat' for everything else."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=5,
        temperature=0.0,
    )
    result = resp.choices[0].message.content.strip().lower()
    return result if result in ("chat", "code", "image") else "chat"


@router.post("/route")
async def route_task(body: RouteRequest, _: str = Depends(get_current_user)):
    mode = await detect_mode(body.prompt)
    return {"mode": mode}


@router.post("/chat/stream")
async def chat_stream(body: ChatRequest, _: str = Depends(get_current_user), __: None = Depends(_chat_limit)):
    model = body.model
    api_key = get_api_key(model)
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)

    msg_id = str(uuid.uuid4())
    full_response = []

    sys_msgs = [{"role": "system", "content": body.system_prompt}] if body.system_prompt else []
    create_kwargs = dict(
        model=model,
        messages=sys_msgs + [{"role": m.role, "content": m.content} for m in body.messages],
        max_tokens=body.max_tokens,
        temperature=body.temperature,
        top_p=body.top_p,
        frequency_penalty=body.frequency_penalty,
        presence_penalty=body.presence_penalty,
        stream=True,
    )
    if body.top_k is not None:
        create_kwargs["extra_body"] = {"top_k": body.top_k}

    async def generate():
        char_count = 0
        start = time.monotonic()
        ttft_ms: int | None = None
        try:
            stream = await client.chat.completions.create(**create_kwargs)
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    if ttft_ms is None:
                        ttft_ms = int((time.monotonic() - start) * 1000)
                    full_response.append(delta)
                    char_count += len(delta)
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            import traceback

            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        full_text = "".join(full_response)
        output_tokens = max(1, char_count // 4)
        latency_ms = int((time.monotonic() - start) * 1000)
        cost_usd = estimate_cost_usd(model, output_tokens)
        try:
            async with get_db() as db:
                user_msg = body.messages[-1]
                await db.execute(
                    "INSERT INTO messages (id,conversation_id,role,content,mode,model,created_at) VALUES (?,?,?,?,?,?,?)",
                    (
                        str(uuid.uuid4()),
                        body.conversation_id,
                        user_msg.role,
                        user_msg.content,
                        "chat",
                        model,
                        now(),
                    ),
                )
                await db.execute(
                    "INSERT INTO messages (id,conversation_id,role,content,mode,model,created_at,ttft_ms,latency_ms,output_tokens,cost_usd) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        msg_id,
                        body.conversation_id,
                        "assistant",
                        full_text,
                        "chat",
                        model,
                        now(),
                        ttft_ms,
                        latency_ms,
                        output_tokens,
                        cost_usd,
                    ),
                )
                await db.execute(
                    "UPDATE conversations SET updated_at=?, model=? WHERE id=?",
                    (now(), model, body.conversation_id),
                )
                await db.commit()
        except Exception:
            import traceback

            traceback.print_exc()

        yield f"data: {json.dumps({'done': True, 'id': msg_id, 'output_tokens': output_tokens})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


class NameRequest(BaseModel):
    conversation_id: str
    first_message: str


@router.post("/chat/name")
async def name_conversation(body: NameRequest, _: str = Depends(get_current_user)):
    api_key = os.getenv("NVIDIA_API_KEY_ROUTER")
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)
    try:
        resp = await client.chat.completions.create(
            model=ROUTER_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Generate a short, descriptive title (4-6 words) for a conversation that starts with the given message. "
                        "Reply with ONLY the title, no quotes, no punctuation at the end."
                    ),
                },
                {"role": "user", "content": body.first_message[:500]},
            ],
            max_tokens=20,
            temperature=0.7,
        )
        title = resp.choices[0].message.content.strip().strip("\"'")
        async with get_db() as db:
            await db.execute(
                "UPDATE conversations SET title=?, updated_at=? WHERE id=?",
                (title, now(), body.conversation_id),
            )
            await db.commit()
        return {"title": title}
    except Exception as e:
        return {"title": body.first_message[:40], "error": str(e)}
