from fastapi import APIRouter, Depends

from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/eval", tags=["eval"])


@router.get("/models")
async def get_model_benchmarks(user_id: str = Depends(get_current_user)):
    """Per-model aggregates from this user's own real usage — latency, TTFT,
    tokens/sec, estimated cost, and (where available) Arena win rate. Every
    number here comes from messages actually generated through chat/blend
    streaming, not synthetic benchmarks."""
    async with get_db() as db:
        rows = await db.fetchall(
            """
            SELECT
                m.model AS model_id,
                COUNT(*) AS message_count,
                AVG(m.ttft_ms) AS avg_ttft_ms,
                AVG(m.latency_ms) AS avg_latency_ms,
                AVG(m.output_tokens) AS avg_output_tokens,
                SUM(m.cost_usd) AS total_cost_usd,
                MAX(m.created_at) AS last_used_at
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE c.user_id = ?
              AND m.role = 'assistant'
              AND m.model IS NOT NULL
              AND m.model != 'blend'
              AND m.latency_ms IS NOT NULL
            GROUP BY m.model
            """,
            (user_id,),
        )

        votes = await db.fetchall(
            """
            SELECT model_id,
                   COUNT(*) AS wins,
                   COUNT(DISTINCT prompt_hash || conv_id) AS voted_rounds
            FROM votes
            WHERE user_id = ?
            GROUP BY model_id
            """,
            (user_id,),
        )
        total_row = await db.fetchone(
            "SELECT COUNT(DISTINCT prompt_hash || conv_id) AS total FROM votes WHERE user_id=?",
            (user_id,),
        )

    total_rounds = total_row["total"] if total_row else 0
    votes_by_model = {v["model_id"]: v for v in votes}

    results = []
    for r in rows:
        latency_s = (r["avg_latency_ms"] or 0) / 1000
        tokens_per_sec = (r["avg_output_tokens"] or 0) / latency_s if latency_s > 0 else 0
        vote = votes_by_model.get(r["model_id"])
        results.append(
            {
                "model_id": r["model_id"],
                "message_count": r["message_count"],
                "avg_ttft_ms": round(r["avg_ttft_ms"]) if r["avg_ttft_ms"] is not None else None,
                "avg_latency_ms": round(r["avg_latency_ms"]) if r["avg_latency_ms"] is not None else None,
                "tokens_per_sec": round(tokens_per_sec, 1),
                "total_cost_usd": round(r["total_cost_usd"] or 0, 4),
                "wins": vote["wins"] if vote else 0,
                "total_rounds": total_rounds,
                "win_rate": (vote["wins"] / total_rounds) if vote and total_rounds > 0 else None,
                "last_used_at": r["last_used_at"],
            }
        )

    results.sort(key=lambda r: r["message_count"], reverse=True)
    return results
