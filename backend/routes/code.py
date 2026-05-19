from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from models import CodeRequest
from database import get_db
from auth import get_current_user
from rate_limit import RateLimit
from openai import AsyncOpenAI
import os, uuid, json, traceback
from datetime import datetime, timezone

router = APIRouter(tags=["code"])
_code_limit = RateLimit("code")

NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

def now():
    return datetime.now(timezone.utc).isoformat()

CODE_SYSTEM = (
    "You are an expert programming assistant. "
    "Provide clear, production-ready code. "
    "Always wrap code blocks in triple backticks with the language name. "
    "Explain your approach briefly before the code."
)

@router.post("/code/stream")
async def code_stream(body: CodeRequest, _: str = Depends(get_current_user), __: None = Depends(_code_limit)):
    model = body.model
    m = model.lower()
    if "mistral" in m or "mixtral" in m or "codestral" in m:
        api_key = os.getenv("NVIDIA_API_KEY_MISTRAL") or os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEY_CODE")
    elif "405b" in m:
        api_key = os.getenv("NVIDIA_API_KEY_CODE") or os.getenv("NVIDIA_API_KEY")
    else:
        api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEY_CODE") or os.getenv("NVIDIA_API_KEY_CHAT")
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)

    msg_id = str(uuid.uuid4())
    full_response = []

    system_msg = CODE_SYSTEM
    if body.language:
        system_msg += f" The user is working in {body.language}."
    if body.system_prompt:
        system_msg += f"\n\n{body.system_prompt}"

    messages = [{"role": "system", "content": system_msg}] + \
               [{"role": m.role, "content": m.content} for m in body.messages]

    create_kwargs = dict(
        model=model,
        messages=messages,
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
        try:
            stream = await client.chat.completions.create(**create_kwargs)
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_response.append(delta)
                    char_count += len(delta)
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            err_msg = f"Stream error: {type(e).__name__}: {e}"
            traceback.print_exc()
            yield f"data: {json.dumps({'error': err_msg})}\n\n"
            return

        full_text = "".join(full_response)
        output_tokens = max(1, char_count // 4)
        try:
            async with get_db() as db:
                user_msg = body.messages[-1]
                await db.execute(
                    "INSERT INTO messages (id,conversation_id,role,content,mode,model,created_at) VALUES (?,?,?,?,?,?,?)",
                    (str(uuid.uuid4()), body.conversation_id, user_msg.role, user_msg.content, "code", model, now())
                )
                await db.execute(
                    "INSERT INTO messages (id,conversation_id,role,content,mode,model,created_at) VALUES (?,?,?,?,?,?,?)",
                    (msg_id, body.conversation_id, "assistant", full_text, "code", model, now())
                )
                await db.execute(
                    "UPDATE conversations SET updated_at=?, model=? WHERE id=?",
                    (now(), model, body.conversation_id)
                )
                await db.commit()
        except Exception:
            traceback.print_exc()

        yield f"data: {json.dumps({'done': True, 'id': msg_id, 'output_tokens': output_tokens})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
