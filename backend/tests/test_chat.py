"""Chat streaming happy path with a mocked NIM client — no real API calls,
no cost, but exercises the actual SSE generation + DB persistence code."""

import json

from database import get_db


def _parse_sse(text: str) -> list[dict]:
    events = []
    for block in text.strip().split("\n\n"):
        if block.startswith("data: "):
            events.append(json.loads(block[len("data: ") :]))
    return events


async def _create_conv(client) -> str:
    resp = await client.post("/api/conversations", json={"title": "Chat test", "mode": "chat"})
    return resp.json()["id"]


async def test_chat_stream_happy_path(client, fake_nim):
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model["meta/llama-3.1-70b-instruct"] = "Hello there!"

    resp = await client.post(
        "/api/chat/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi"}],
            "model": "meta/llama-3.1-70b-instruct",
        },
    )
    assert resp.status_code == 200
    events = _parse_sse(resp.text)

    deltas = [e["delta"] for e in events if "delta" in e]
    assert "".join(deltas) == "Hello there!"
    done_events = [e for e in events if e.get("done")]
    assert len(done_events) == 1

    # The assistant response must actually be persisted.
    async with get_db() as db:
        rows = await db.fetchall(
            "SELECT role, content FROM messages WHERE conversation_id=? ORDER BY created_at ASC", (conv_id,)
        )
    roles = [r["role"] for r in rows]
    assert roles == ["user", "assistant"]
    assert rows[1]["content"] == "Hello there!"


async def test_chat_stream_selects_mistral_key_for_mistral_models(client, fake_nim, monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY_MISTRAL", "mistral-specific-key")
    conv_id = await _create_conv(client)

    await client.post(
        "/api/chat/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi"}],
            "model": "mistralai/mixtral-8x7b-instruct-v0.1",
        },
    )
    assert fake_nim.constructor_calls[-1]["api_key"] == "mistral-specific-key"


async def test_chat_stream_requires_auth(anon_client):
    resp = await anon_client.post(
        "/api/chat/stream",
        json={"conversation_id": "x", "messages": [{"role": "user", "content": "hi"}], "model": "m"},
    )
    assert resp.status_code == 401


async def test_route_classifier_uses_nim(client, fake_nim):
    fake_nim.default_response = "code"
    resp = await client.post("/api/route", json={"prompt": "write me a python function"})
    assert resp.status_code == 200
    assert resp.json()["mode"] == "code"


async def test_route_classifier_falls_back_to_chat_for_unexpected_output(client, fake_nim):
    fake_nim.default_response = "something unexpected"
    resp = await client.post("/api/route", json={"prompt": "hello"})
    assert resp.json()["mode"] == "chat"
