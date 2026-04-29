from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models import CodeRequest
from database import get_db
from openai import AsyncOpenAI
import os, uuid, json, traceback
from datetime import datetime, timezone

router = APIRouter(tags=["code"])

NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

def now():
    return datetime.now(timezone.utc).isoformat()

CODE_SYSTEM = (
    "You are an expert programming assistant powered by Llama 3.1 405B. "
    "Provide clear, production-ready code. "
    "Always wrap code blocks in triple backticks with the language name. "
    "Explain your approach briefly before the code."
)

@router.post("/code/stream")
async def code_stream(body: CodeRequest):
    model = body.model
    # Read key at request time — always picks up loaded env vars
    api_key = os.getenv("NVIDIA_API_KEY_CODE")
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)

    msg_id = str(uuid.uuid4())
    full_response = []

    system_msg = CODE_SYSTEM
    if body.language:
        system_msg += f" The user is working in {body.language}."

    messages = [{"role": "system", "content": system_msg}] + \
               [{"role": m.role, "content": m.content} for m in body.messages]

    async def generate():
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=4096,
                temperature=0.2,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_response.append(delta)
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            err_msg = f"Stream error: {type(e).__name__}: {e}"
            traceback.print_exc()
            yield f"data: {json.dumps({'error': err_msg})}\n\n"
            return

        full_text = "".join(full_response)
        try:
            async with await get_db() as db:
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
        except Exception as e:
            traceback.print_exc()

        yield f"data: {json.dumps({'done': True, 'id': msg_id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
