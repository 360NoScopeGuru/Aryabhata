from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models import BlendRequest
from database import get_db
from openai import AsyncOpenAI
import os, uuid, json, traceback
from datetime import datetime, timezone

router = APIRouter(tags=["blend"])

NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

MODEL_LABELS = {
    'meta/llama-3.1-70b-instruct':                  'Llama 3.1 70B',
    'meta/llama-3.1-405b-instruct':                 'Llama 3.1 405B',
    'mistralai/mistral-large-3-675b-instruct-2512': 'Mistral 675B',
    'meta/llama-3.1-8b-instruct':                   'Llama 3.1 8B',
}

def now():
    return datetime.now(timezone.utc).isoformat()

def get_api_key(model: str) -> str:
    if "mistral" in model.lower():
        return os.getenv("NVIDIA_API_KEY_MISTRAL") or os.getenv("NVIDIA_API_KEY_CHAT")
    if "405b" in model or "llama-3.1-70b" in model:
        return os.getenv("NVIDIA_API_KEY_CODE") or os.getenv("NVIDIA_API_KEY_CHAT")
    return os.getenv("NVIDIA_API_KEY_CHAT")

def build_collab_system(model_id: str, all_models: list, previous_responses: dict, user_query: str) -> str:
    all_labels = [MODEL_LABELS.get(m, m) for m in all_models]
    my_label = MODEL_LABELS.get(model_id, model_id)

    base = (
        f"You are {my_label}, participating in a collaborative AI discussion. "
        f"The models working together on this problem are: {', '.join(all_labels)}. "
        f"You are all tasked with helping the user by pooling your knowledge and reasoning.\n\n"
    )

    if previous_responses:
        base += "Your fellow models have already responded:\n\n"
        for mid, resp in previous_responses.items():
            label = MODEL_LABELS.get(mid, mid)
            base += f"[{label}]: {resp[:600].strip()}\n\n"
        base += (
            "Now contribute your own perspective. You may build upon, correct, or complement what has been said. "
            "Be concise — add only what is genuinely new or improves the collective answer. "
            "Do not repeat points already well-covered unless you are correcting them."
        )
    else:
        base += (
            "You are the first to respond. Give your best answer to the user's question. "
            "Other models will respond after you and may build on your answer."
        )

    return base


@router.post("/blend/stream")
async def blend_stream(body: BlendRequest):
    models = body.models[:5]

    async def generate():
        previous_responses: dict[str, str] = {}
        user_query = body.messages[-1].content if body.messages else ""

        for model_id in models:
            api_key = get_api_key(model_id)
            client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)

            system_msg = build_collab_system(model_id, models, previous_responses, user_query)
            messages = [{"role": "system", "content": system_msg}] + [
                {"role": m.role, "content": m.content} for m in body.messages
            ]

            yield f"data: {json.dumps({'model_start': model_id})}\n\n"

            full_text: list[str] = []
            try:
                create_kwargs = dict(
                    model=model_id,
                    messages=messages,
                    max_tokens=body.max_tokens,
                    temperature=body.temperature,
                    top_p=body.top_p,
                    stream=True,
                )
                if body.top_k is not None:
                    create_kwargs["extra_body"] = {"top_k": body.top_k}

                stream = await client.chat.completions.create(**create_kwargs)
                async for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        full_text.append(delta)
                        yield f"data: {json.dumps({'model': model_id, 'delta': delta})}\n\n"
            except Exception as e:
                err = f"[{MODEL_LABELS.get(model_id, model_id)} error: {type(e).__name__}]"
                yield f"data: {json.dumps({'model': model_id, 'delta': err})}\n\n"
                traceback.print_exc()

            response_text = "".join(full_text)
            previous_responses[model_id] = response_text
            yield f"data: {json.dumps({'model_done': model_id, 'text': response_text})}\n\n"

        # Persist all messages to DB
        try:
            async with await get_db() as db:
                user_msg = body.messages[-1]
                await db.execute(
                    "INSERT INTO messages (id,conversation_id,role,content,mode,model,created_at) VALUES (?,?,?,?,?,?,?)",
                    (str(uuid.uuid4()), body.conversation_id, user_msg.role, user_msg.content, "chat", "blend", now())
                )
                for model_id, text in previous_responses.items():
                    await db.execute(
                        "INSERT INTO messages (id,conversation_id,role,content,mode,model,created_at) VALUES (?,?,?,?,?,?,?)",
                        (str(uuid.uuid4()), body.conversation_id, "assistant", text, "chat", model_id, now())
                    )
                await db.execute(
                    "UPDATE conversations SET updated_at=?, model=? WHERE id=?",
                    (now(), "blend", body.conversation_id)
                )
                await db.commit()
        except Exception:
            traceback.print_exc()

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
