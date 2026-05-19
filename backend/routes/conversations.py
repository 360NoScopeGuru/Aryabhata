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


@router.get("/search")
async def search_messages(q: str, user_id: str = Depends(get_current_user)):
    if not q or len(q.strip()) < 2:
        return []
    async with get_db() as db:
        rows = await db.fetchall(
            """
            SELECT m.id AS message_id, m.conversation_id, c.title AS conversation_title,
                   m.role, m.content, m.created_at
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE c.user_id = ? AND m.content ILIKE ?
            ORDER BY m.created_at DESC
            LIMIT 30
            """,
            (user_id, f"%{q.strip()}%"),
        )
    return rows


@router.get("")
async def list_conversations(user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        rows = await db.fetchall(
            "SELECT * FROM conversations WHERE user_id=? ORDER BY pinned DESC, updated_at DESC",
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


@router.delete("/{conv_id}/messages")
async def clear_messages(conv_id: str, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        conv = await db.fetchone("SELECT id FROM conversations WHERE id=? AND user_id=?", (conv_id, user_id))
        if not conv:
            return {"ok": False}
        await db.execute("DELETE FROM messages WHERE conversation_id=?", (conv_id,))
    return {"ok": True}


@router.post("/{conv_id}/duplicate")
async def duplicate_conversation(conv_id: str, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        conv = await db.fetchone("SELECT * FROM conversations WHERE id=? AND user_id=?", (conv_id, user_id))
        if not conv:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        new_id = str(uuid.uuid4())
        new_title = conv["title"] + " (copy)"
        await db.execute(
            "INSERT INTO conversations (id, title, mode, model, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            (new_id, new_title, conv["mode"], conv["model"], user_id, now(), now())
        )
        msgs = await db.fetchall(
            "SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC",
            (conv_id,)
        )
        for m in msgs:
            await db.execute(
                "INSERT INTO messages (id, conversation_id, role, content, mode, model, created_at) VALUES (?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), new_id, m["role"], m["content"], m["mode"], m["model"], m["created_at"])
            )
    return {"id": new_id, "title": new_title, "mode": conv["mode"], "model": conv["model"],
            "created_at": now(), "updated_at": now()}


@router.post("/{conv_id}/fork/{message_id}")
async def fork_conversation(conv_id: str, message_id: str, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        conv = await db.fetchone("SELECT * FROM conversations WHERE id=? AND user_id=?", (conv_id, user_id))
        if not conv:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        target = await db.fetchone(
            "SELECT created_at FROM messages WHERE id=? AND conversation_id=?",
            (message_id, conv_id)
        )
        if not target:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Message not found")
        msgs = await db.fetchall(
            "SELECT * FROM messages WHERE conversation_id=? AND created_at<=? ORDER BY created_at ASC",
            (conv_id, target["created_at"])
        )
        new_id = str(uuid.uuid4())
        new_title = ("⑂ " + conv["title"])[:60]
        created = now()
        await db.execute(
            "INSERT INTO conversations (id, title, mode, model, user_id, forked_from, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (new_id, new_title, conv["mode"], conv["model"], user_id, conv_id, created, created)
        )
        for m in msgs:
            await db.execute(
                "INSERT INTO messages (id, conversation_id, role, content, mode, model, image_url, created_at) VALUES (?,?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), new_id, m["role"], m["content"], m["mode"], m["model"], m.get("image_url"), m["created_at"])
            )
    return {
        "id": new_id, "title": new_title, "mode": conv["mode"], "model": conv["model"],
        "forked_from": conv_id, "created_at": created, "updated_at": created,
    }


@router.patch("/{conv_id}/pin")
async def pin_conversation(conv_id: str, body: dict, user_id: str = Depends(get_current_user)):
    pinned = bool(body.get("pinned", False))
    async with get_db() as db:
        await db.execute(
            "UPDATE conversations SET pinned=?, updated_at=? WHERE id=? AND user_id=?",
            (pinned, now(), conv_id, user_id)
        )
    return {"ok": True, "pinned": pinned}


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
