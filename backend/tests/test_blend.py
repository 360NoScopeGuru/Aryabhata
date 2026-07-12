"""Blend mode: proves models are queried sequentially and each one's system
prompt actually contains prior models' responses — the feature's core
differentiator, not just that requests get made."""

import json

from database import get_db


def _parse_sse(text: str) -> list[dict]:
    events = []
    for block in text.strip().split("\n\n"):
        if block.startswith("data: "):
            events.append(json.loads(block[len("data: ") :]))
    return events


async def _create_conv(client) -> str:
    resp = await client.post("/api/conversations", json={"title": "Blend test", "mode": "chat"})
    return resp.json()["id"]


async def test_blend_queries_models_sequentially_in_order(client, fake_nim):
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model = {
        "meta/llama-3.1-70b-instruct": "First model's answer.",
        "mistralai/mixtral-8x7b-instruct-v0.1": "Second model's answer.",
    }

    resp = await client.post(
        "/api/blend/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "explain recursion"}],
            "models": ["meta/llama-3.1-70b-instruct", "mistralai/mixtral-8x7b-instruct-v0.1"],
        },
    )
    assert resp.status_code == 200
    assert len(fake_nim.calls) == 2
    assert fake_nim.calls[0]["model"] == "meta/llama-3.1-70b-instruct"
    assert fake_nim.calls[1]["model"] == "mistralai/mixtral-8x7b-instruct-v0.1"


async def test_blend_second_model_sees_first_models_response(client, fake_nim):
    """The whole point of Blend mode: later models build on earlier ones.
    If this system prompt doesn't contain the first model's text, the
    'collaborative' framing is just theater."""
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model = {
        "model-a": "The answer is 42, because of the meaning of life.",
        "model-b": "I agree with the previous point.",
    }

    await client.post(
        "/api/blend/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "what is the answer?"}],
            "models": ["model-a", "model-b"],
        },
    )

    first_call_system_msg = fake_nim.calls[0]["messages"][0]["content"]
    second_call_system_msg = fake_nim.calls[1]["messages"][0]["content"]

    # First model has no prior context to build on.
    assert "42" not in first_call_system_msg
    assert "first to respond" in first_call_system_msg

    # Second model's prompt must quote the first model's actual response text.
    assert "The answer is 42, because of the meaning of life." in second_call_system_msg


async def test_blend_first_model_error_does_not_block_second_model(client, fake_nim, monkeypatch):
    """If one model errors mid-stream, blend continues to the next model
    rather than aborting the whole round."""
    conv_id = await _create_conv(client)

    call_count = {"n": 0}

    async def _create_with_failure(**kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("simulated NIM outage")
        return fake_nim._stream(fake_nim.responses_by_model.get(kwargs["model"], fake_nim.default_response))

    fake_nim.chat.completions.create = _create_with_failure
    fake_nim.responses_by_model = {"model-b": "still works"}

    resp = await client.post(
        "/api/blend/stream",
        json={
            "conversation_id": conv_id,
            "messages": [{"role": "user", "content": "hi"}],
            "models": ["model-a", "model-b"],
        },
    )
    assert resp.status_code == 200
    events = _parse_sse(resp.text)

    # model-a's exception fires before any chunk is yielded, so its
    # accumulated full_text (and therefore model_done text) stays empty —
    # but an error delta must still have been emitted for visibility.
    error_deltas = [e["delta"] for e in events if e.get("model") == "model-a" and "delta" in e]
    assert any("error" in d.lower() for d in error_deltas)

    model_done_text = {e["model_done"]: e["text"] for e in events if "model_done" in e}
    assert model_done_text["model-a"] == ""
    assert model_done_text["model-b"] == "still works"

    # The round must still complete (second model isn't blocked).
    assert any(e.get("done") for e in events)


async def test_blend_persists_all_model_responses(client, fake_nim):
    conv_id = await _create_conv(client)
    fake_nim.responses_by_model = {"model-a": "answer A", "model-b": "answer B"}

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
            "SELECT role, content, model FROM messages WHERE conversation_id=? ORDER BY created_at ASC",
            (conv_id,),
        )
    assistant_rows = {r["model"]: r["content"] for r in rows if r["role"] == "assistant"}
    assert assistant_rows == {"model-a": "answer A", "model-b": "answer B"}


async def test_blend_caps_at_five_models(client, fake_nim):
    conv_id = await _create_conv(client)
    models = [f"model-{i}" for i in range(8)]

    await client.post(
        "/api/blend/stream",
        json={"conversation_id": conv_id, "messages": [{"role": "user", "content": "hi"}], "models": models},
    )
    assert len(fake_nim.calls) == 5
