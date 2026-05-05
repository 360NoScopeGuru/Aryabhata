from fastapi import APIRouter, Depends
from models import VoteRequest
from database import get_db
from auth import get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["arena"])

def now():
    return datetime.now(timezone.utc).isoformat()


@router.post("/arena/vote")
async def cast_vote(body: VoteRequest, user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        conv = await db.fetchone(
            "SELECT id FROM conversations WHERE id=? AND user_id=?",
            (body.conv_id, user_id)
        )
        if not conv:
            return {"ok": False, "already_voted": False}
        existing = await db.fetchone(
            "SELECT id FROM votes WHERE user_id=? AND conv_id=? AND prompt_hash=?",
            (user_id, body.conv_id, body.prompt_hash)
        )
        if existing:
            return {"ok": True, "already_voted": True}
        await db.execute(
            "INSERT INTO votes (id, user_id, conv_id, msg_id, model_id, prompt_hash, created_at) VALUES (?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), user_id, body.conv_id, body.msg_id, body.model_id, body.prompt_hash, now())
        )
    return {"ok": True, "already_voted": False}


@router.get("/arena/leaderboard")
async def get_leaderboard(user_id: str = Depends(get_current_user)):
    async with get_db() as db:
        rows = await db.fetchall(
            """
            SELECT model_id,
                   COUNT(*) AS wins,
                   MAX(created_at) AS last_win_at
            FROM votes
            WHERE user_id=?
            GROUP BY model_id
            ORDER BY wins DESC
            """,
            (user_id,)
        )
        total_row = await db.fetchone(
            "SELECT COUNT(DISTINCT prompt_hash || conv_id) AS total FROM votes WHERE user_id=?",
            (user_id,)
        )
    total = total_row["total"] if total_row else 0
    return [
        {
            "model_id": r["model_id"],
            "wins": r["wins"],
            "total_rounds": total,
            "win_rate": r["wins"] / total if total > 0 else 0.0,
            "last_win_at": r["last_win_at"],
        }
        for r in rows
    ]
