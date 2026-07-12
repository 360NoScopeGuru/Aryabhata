import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import get_current_user
from rate_limit import RateLimitByIP

router = APIRouter(tags=["sharing"])

SHARE_LINK_TTL_DAYS = 30
_share_read_limit = RateLimitByIP("share_read", max_reqs=30, window=60)


def now():
    return datetime.now(timezone.utc).isoformat()


def _expiry():
    return (datetime.now(timezone.utc) + timedelta(days=SHARE_LINK_TTL_DAYS)).isoformat()


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
            "SELECT token, expires_at FROM shared_links WHERE conversation_id=?",
            (conv_id,),
        )
        if existing and existing["expires_at"] and existing["expires_at"] > now():
            return {"token": existing["token"], "expires_at": existing["expires_at"]}
        # No link yet, or the previous one expired — issue a fresh token.
        if existing:
            await db.execute(
                "DELETE FROM shared_links WHERE conversation_id=?",
                (conv_id,),
            )
        token = secrets.token_urlsafe(16)
        expires_at = _expiry()
        await db.execute(
            "INSERT INTO shared_links (token, conversation_id, user_id, created_at, expires_at) VALUES (?,?,?,?,?)",
            (token, conv_id, user_id, now(), expires_at),
        )
    return {"token": token, "expires_at": expires_at}


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
async def get_shared_conversation(token: str, _rl: None = Depends(_share_read_limit)):
    async with get_db() as db:
        link = await db.fetchone(
            "SELECT conversation_id, expires_at FROM shared_links WHERE token=?",
            (token,),
        )
        if not link:
            raise HTTPException(status_code=404, detail="Share link not found")
        if link["expires_at"] and link["expires_at"] <= now():
            raise HTTPException(status_code=410, detail="Share link has expired")
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
