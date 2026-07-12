"""Arena voting: dedup logic and per-user leaderboard isolation."""

import uuid


async def _create_conv(client) -> str:
    resp = await client.post("/api/conversations", json={"title": "Blend round", "mode": "chat"})
    return resp.json()["id"]


async def test_cast_vote_succeeds(client):
    conv_id = await _create_conv(client)
    resp = await client.post(
        "/api/arena/vote",
        json={
            "conv_id": conv_id,
            "msg_id": str(uuid.uuid4()),
            "model_id": "meta/llama-3.1-70b-instruct",
            "prompt_hash": "hash-1",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["already_voted"] is False


async def test_duplicate_vote_same_prompt_is_deduped(client):
    conv_id = await _create_conv(client)
    payload = {
        "conv_id": conv_id,
        "msg_id": str(uuid.uuid4()),
        "model_id": "meta/llama-3.1-70b-instruct",
        "prompt_hash": "hash-1",
    }
    first = await client.post("/api/arena/vote", json=payload)
    second = await client.post("/api/arena/vote", json={**payload, "model_id": "mistralai/mixtral-8x7b"})

    assert first.json()["already_voted"] is False
    assert second.json()["already_voted"] is True

    leaderboard = await client.get("/api/arena/leaderboard")
    rows = leaderboard.json()
    # Only the first vote should count — the dedup'd second vote must not
    # create a second row for a different model.
    assert sum(r["wins"] for r in rows) == 1


async def test_different_prompt_hash_allows_another_vote(client):
    conv_id = await _create_conv(client)
    await client.post(
        "/api/arena/vote",
        json={
            "conv_id": conv_id,
            "msg_id": str(uuid.uuid4()),
            "model_id": "model-a",
            "prompt_hash": "hash-1",
        },
    )
    resp = await client.post(
        "/api/arena/vote",
        json={
            "conv_id": conv_id,
            "msg_id": str(uuid.uuid4()),
            "model_id": "model-b",
            "prompt_hash": "hash-2",
        },
    )
    assert resp.json()["already_voted"] is False

    leaderboard = await client.get("/api/arena/leaderboard")
    rows = leaderboard.json()
    assert sum(r["wins"] for r in rows) == 2


async def test_cannot_vote_on_conversation_you_do_not_own(client, other_client):
    conv_id = await _create_conv(client)
    resp = await other_client.post(
        "/api/arena/vote",
        json={
            "conv_id": conv_id,
            "msg_id": str(uuid.uuid4()),
            "model_id": "model-a",
            "prompt_hash": "hash-1",
        },
    )
    assert resp.json() == {"ok": False, "already_voted": False}

    # No vote should have been recorded, so the owner's leaderboard stays empty.
    leaderboard = await client.get("/api/arena/leaderboard")
    assert leaderboard.json() == []


async def test_leaderboard_is_per_user(client, other_client):
    conv_id_a = await _create_conv(client)
    await client.post(
        "/api/arena/vote",
        json={
            "conv_id": conv_id_a,
            "msg_id": str(uuid.uuid4()),
            "model_id": "model-a",
            "prompt_hash": "hash-1",
        },
    )
    other_leaderboard = await other_client.get("/api/arena/leaderboard")
    assert other_leaderboard.json() == []


async def test_win_rate_calculation(client):
    conv_id = await _create_conv(client)
    await client.post(
        "/api/arena/vote",
        json={
            "conv_id": conv_id,
            "msg_id": str(uuid.uuid4()),
            "model_id": "model-a",
            "prompt_hash": "hash-1",
        },
    )
    await client.post(
        "/api/arena/vote",
        json={
            "conv_id": conv_id,
            "msg_id": str(uuid.uuid4()),
            "model_id": "model-b",
            "prompt_hash": "hash-2",
        },
    )
    await client.post(
        "/api/arena/vote",
        json={
            "conv_id": conv_id,
            "msg_id": str(uuid.uuid4()),
            "model_id": "model-a",
            "prompt_hash": "hash-3",
        },
    )
    leaderboard = {r["model_id"]: r for r in (await client.get("/api/arena/leaderboard")).json()}
    assert leaderboard["model-a"]["wins"] == 2
    assert leaderboard["model-a"]["total_rounds"] == 3
    assert leaderboard["model-a"]["win_rate"] == 2 / 3
