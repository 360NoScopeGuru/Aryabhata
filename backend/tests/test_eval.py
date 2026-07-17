"""Model eval dashboard: telemetry persistence (chat + blend) and the
aggregation endpoint that turns it into per-model benchmarks."""

import uuid

from database import get_db
from model_pricing import estimate_cost_usd


async def _create_conv(client) -> str:
    resp = await client.post("/api/conversations", json={"title": "Eval test", "mode": "chat"})
    return resp.json()["id"]


def test_estimate_cost_usd_known_model():
    cost = estimate_cost_usd("meta/llama-3.1-70b-instruct", 1_000_000)
    assert cost == 0.90


def test_estimate_cost_usd_unknown_model_uses_default():
    cost = estimate_cost_usd("some/unlisted-model", 1_000_000)
    assert cost > 0


def test_estimate_cost_usd_zero_tokens():
    assert estimate_cost_usd("meta/llama-3.1-70b-instruct", 0) == 0.0


async def test_chat_stream_persists_telemetry(client, fake_nim):
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model["meta/llama-3.1-70b-instruct"] = "a reasonably long response here"

    await client.post(
        "/api/chat/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi"}],
            "model": "meta/llama-3.1-70b-instruct",
        },
    )

    async with get_db() as db:
        row = await db.fetchone(
            "SELECT ttft_ms, latency_ms, output_tokens, cost_usd FROM messages "
            "WHERE conversation_id=? AND role='assistant'",
            (conv_id,),
        )
    assert row is not None
    assert row["ttft_ms"] is not None and row["ttft_ms"] >= 0
    assert row["latency_ms"] is not None and row["latency_ms"] >= row["ttft_ms"]
    assert row["output_tokens"] > 0
    assert row["cost_usd"] >= 0


async def test_blend_stream_persists_telemetry_per_model(client, fake_nim):
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model = {"model-a": "response from a", "model-b": "response from b"}

    await client.post(
        "/api/blend/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi"}],
            "models": ["model-a", "model-b"],
        },
    )

    async with get_db() as db:
        rows = await db.fetchall(
            "SELECT model, ttft_ms, latency_ms, output_tokens FROM messages "
            "WHERE conversation_id=? AND role='assistant' ORDER BY model",
            (conv_id,),
        )
    assert len(rows) == 2
    for row in rows:
        assert row["output_tokens"] > 0
        assert row["latency_ms"] is not None


async def test_eval_models_empty_for_new_user(client):
    resp = await client.get("/api/eval/models")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_eval_models_aggregates_across_messages(client, fake_nim):
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model["meta/llama-3.1-70b-instruct"] = "response one"
    await client.post(
        "/api/chat/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi"}],
            "model": "meta/llama-3.1-70b-instruct",
        },
    )
    fake_nim.responses_by_model["meta/llama-3.1-70b-instruct"] = "response two, a bit longer this time"
    await client.post(
        "/api/chat/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi again"}],
            "model": "meta/llama-3.1-70b-instruct",
        },
    )

    resp = await client.get("/api/eval/models")
    results = resp.json()
    assert len(results) == 1
    entry = results[0]
    assert entry["model_id"] == "meta/llama-3.1-70b-instruct"
    assert entry["message_count"] == 2
    assert entry["avg_ttft_ms"] is not None
    assert entry["tokens_per_sec"] >= 0
    assert entry["total_cost_usd"] >= 0
    assert entry["win_rate"] is None  # no votes cast yet


async def test_eval_models_includes_win_rate_from_votes(client, fake_nim):
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model["model-a"] = "a"
    fake_nim.responses_by_model["model-b"] = "b"
    await client.post(
        "/api/blend/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi"}],
            "models": ["model-a", "model-b"],
        },
    )
    await client.post(
        "/api/arena/vote",
        json={
            "conv_id": conv_id,
            "msg_id": str(uuid.uuid4()),
            "model_id": "model-a",
            "prompt_hash": "hash-1",
        },
    )

    resp = await client.get("/api/eval/models")
    by_model = {r["model_id"]: r for r in resp.json()}
    assert by_model["model-a"]["wins"] == 1
    assert by_model["model-a"]["win_rate"] == 1.0
    # The votes table only records wins, not full round participation (same
    # limitation as arena.py's leaderboard), so a model with zero wins has
    # no votes row at all — win_rate is unknown (None), not provably 0.0.
    assert by_model["model-b"]["wins"] == 0
    assert by_model["model-b"]["win_rate"] is None


async def test_eval_models_scoped_per_user(client, other_client, fake_nim):
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model["meta/llama-3.1-70b-instruct"] = "hello"
    await client.post(
        "/api/chat/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi"}],
            "model": "meta/llama-3.1-70b-instruct",
        },
    )

    other_resp = await other_client.get("/api/eval/models")
    assert other_resp.json() == []


async def test_eval_models_excludes_blend_placeholder_row(client, fake_nim):
    """The user-turn message inserted with model='blend' shouldn't show up
    as its own fake 'model' in the benchmark table."""
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model = {"model-a": "a"}
    await client.post(
        "/api/blend/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi"}],
            "models": ["model-a"],
        },
    )
    resp = await client.get("/api/eval/models")
    model_ids = [r["model_id"] for r in resp.json()]
    assert "blend" not in model_ids


async def test_eval_models_requires_auth(anon_client):
    resp = await anon_client.get("/api/eval/models")
    assert resp.status_code == 401
