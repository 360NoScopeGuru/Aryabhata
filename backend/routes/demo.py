import os
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI

from database import get_db
from model_pricing import estimate_cost_usd
from models import DEMO_MODELS, DemoChatRequest
from rate_limit import RateLimitByIP

router = APIRouter(prefix="/demo", tags=["demo"])

NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"
DEMO_MAX_TOKENS = 300  # fixed server-side — not user-controllable, bounds cost per request
DAILY_CAP_USD = float(os.getenv("DEMO_DAILY_SPEND_CAP_USD", "1.00"))

# Strict per-IP limit — this endpoint has no auth at all.
_demo_limit = RateLimitByIP("demo", max_reqs=5, window=60)


def _today() -> str:
    return datetime.now(UTC).date().isoformat()


async def _today_spend(db) -> float:
    row = await db.fetchone("SELECT cost_usd FROM demo_usage WHERE day=?", (_today(),))
    return row["cost_usd"] if row else 0.0


async def _record_spend(db, amount: float) -> None:
    await db.execute(
        "INSERT INTO demo_usage (day, cost_usd) VALUES (?, ?) "
        "ON CONFLICT (day) DO UPDATE SET cost_usd = demo_usage.cost_usd + ?",
        (_today(), amount, amount),
    )
    await db.commit()


@router.get("/status")
async def demo_status():
    async with get_db() as db:
        spent = await _today_spend(db)
    return {
        "models": list(DEMO_MODELS),
        "daily_cap_usd": DAILY_CAP_USD,
        "spent_today_usd": round(spent, 6),
        "available": spent < DAILY_CAP_USD,
    }


@router.post("/chat")
async def demo_chat(body: DemoChatRequest, _rl: None = Depends(_demo_limit)):
    if body.model not in DEMO_MODELS:
        raise HTTPException(status_code=400, detail=f"model must be one of {DEMO_MODELS}")

    async with get_db() as db:
        spent = await _today_spend(db)
    if spent >= DAILY_CAP_USD:
        raise HTTPException(
            status_code=429,
            detail="Daily demo limit reached — sign up for unlimited access.",
        )

    api_key = os.getenv("NVIDIA_API_KEY_DEMO") or os.getenv("NVIDIA_API_KEY")
    client = AsyncOpenAI(base_url=NVIDIA_BASE, api_key=api_key)
    try:
        resp = await client.chat.completions.create(
            model=body.model,
            messages=[{"role": "user", "content": body.prompt}],
            max_tokens=DEMO_MAX_TOKENS,
            temperature=0.7,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail="Demo model request failed") from e

    reply = resp.choices[0].message.content or ""
    output_tokens = max(1, len(reply) // 4)
    cost_usd = estimate_cost_usd(body.model, output_tokens)

    async with get_db() as db:
        await _record_spend(db, cost_usd)
        new_total = await _today_spend(db)

    return {
        "reply": reply,
        "model": body.model,
        "cost_usd": cost_usd,
        "remaining_budget_usd": max(0.0, round(DAILY_CAP_USD - new_total, 4)),
    }
