from fastapi import APIRouter, Depends
from database import get_db
from models import ConversationCreate
from auth import get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/conversations", tags=["conversations"])

def now():
    return datetime.now(timezone.utc).isoformat()


@router.post("")
async def create_conversation(body: ConversationCreate, user_id: str = Depends(get_current_user)):
    conv_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            "INSERT INTO conversations (id, title, mode, model, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            (conv_id, body.title, body.mode, body.model, user_id, now(), now())
        )
    return {"id": conv_id, "title": body.title, "mode": body.mode, "model": body.model}


@router.get("")
async def list_conversations(user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        rows = await db.fetchall(
            "SELECT * FROM conversations WHERE user_id=? ORDER BY updated_at DESC",
            (user_id,)
        )
    return rows


@router.get("/{conv_id}/messages")
async def get_messages(conv_id: str, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        conv = await db.fetchone("SELECT id FROM conversations WHERE id=? AND user_id=?", (conv_id, user_id))
        if not conv:
            return []
        rows = await db.fetchall(
            "SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC",
            (conv_id,)
        )
    return rows


@router.delete("/{conv_id}")
async def delete_conversation(conv_id: str, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        await db.execute("DELETE FROM conversations WHERE id=? AND user_id=?", (conv_id, user_id))
    return {"ok": True}


@router.patch("/{conv_id}/title")
async def update_title(conv_id: str, body: dict, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        await db.execute(
            "UPDATE conversations SET title=?, updated_at=? WHERE id=? AND user_id=?",
            (body["title"], now(), conv_id, user_id)
        )
    return {"ok": True}


@router.delete("/{conv_id}/messages/{msg_id}/onwards")
async def delete_messages_onwards(conv_id: str, msg_id: str, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        conv = await db.fetchone("SELECT id FROM conversations WHERE id=? AND user_id=?", (conv_id, user_id))
        if not conv:
            return {"ok": False}
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
