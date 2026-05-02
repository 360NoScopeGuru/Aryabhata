from fastapi import APIRouter
from database import get_db
from models import ConversationCreate
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/conversations", tags=["conversations"])

def now():
    return datetime.now(timezone.utc).isoformat()


@router.post("")
async def create_conversation(body: ConversationCreate):
    conv_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            "INSERT INTO conversations (id, title, mode, model, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (conv_id, body.title, body.mode, body.model, now(), now())
        )
    return {"id": conv_id, "title": body.title, "mode": body.mode, "model": body.model}


@router.get("")
async def list_conversations():
    async with get_db() as db:
        rows = await db.fetchall("SELECT * FROM conversations ORDER BY updated_at DESC")
    return rows


@router.get("/{conv_id}/messages")
async def get_messages(conv_id: str):
    async with get_db() as db:
        rows = await db.fetchall(
            "SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC",
            (conv_id,)
        )
    return rows


@router.delete("/{conv_id}")
async def delete_conversation(conv_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM conversations WHERE id=?", (conv_id,))
    return {"ok": True}


@router.patch("/{conv_id}/title")
async def update_title(conv_id: str, body: dict):
    async with get_db() as db:
        await db.execute(
            "UPDATE conversations SET title=?, updated_at=? WHERE id=?",
            (body["title"], now(), conv_id)
        )
    return {"ok": True}


@router.delete("/{conv_id}/messages/{msg_id}/onwards")
async def delete_messages_onwards(conv_id: str, msg_id: str):
    async with get_db() as db:
        row = await db.fetchone(
            "SELECT created_at FROM messages WHERE id=? AND conversation_id=?",
            (msg_id, conv_id)
        )
        if row:
            await db.execute(
                "DELETE FROM messages WHERE conversation_id=? AND created_at >= ?",
                (conv_id, row["created_at"])
            )
    return {"ok": True}
