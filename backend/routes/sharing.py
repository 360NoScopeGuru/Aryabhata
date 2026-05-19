import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import get_current_user

router = APIRouter(tags=["sharing"])


def now():
    return datetime.now(timezone.utc).isoformat()


@router.post("/conversations/{conv_id}/share")
async def share_conversation(conv_id: str, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        conv = await db.fetchone(
            "SELECT id FROM conversations WHERE id=? AND user_id=?",
            (conv_id, user_id),
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Not found")
        existing = await db.fetchone(
            "SELECT token FROM shared_links WHERE conversation_id=?",
            (conv_id,),
        )
        if existing:
            return {"token": existing["token"]}
        token = secrets.token_urlsafe(16)
        await db.execute(
            "INSERT INTO shared_links (token, conversation_id, user_id, created_at) VALUES (?,?,?,?)",
            (token, conv_id, user_id, now()),
        )
    return {"token": token}


@router.delete("/conversations/{conv_id}/share")
async def unshare_conversation(conv_id: str, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        conv = await db.fetchone(
            "SELECT id FROM conversations WHERE id=? AND user_id=?",
            (conv_id, user_id),
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Not found")
        await db.execute(
            "DELETE FROM shared_links WHERE conversation_id=? AND user_id=?",
            (conv_id, user_id),
        )
    return {"ok": True}


@router.get("/share/{token}")
async def get_shared_conversation(token: str):
    async with get_db() as db:
        link = await db.fetchone(
            "SELECT conversation_id FROM shared_links WHERE token=?",
            (token,),
        )
        if not link:
            raise HTTPException(status_code=404, detail="Share link not found")
        conv_id = link["conversation_id"]
        conv = await db.fetchone(
            "SELECT title, mode, model FROM conversations WHERE id=?",
            (conv_id,),
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        messages = await db.fetchall(
            "SELECT role, content, mode, model, image_url, created_at FROM messages WHERE conversation_id=? ORDER BY created_at ASC",
            (conv_id,),
        )
    return {
        "title": conv["title"],
        "mode": conv["mode"],
        "model": conv["model"],
        "messages": messages,
    }
