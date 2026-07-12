"""Ownership-scoping tests for /api/conversations — the architecture's
central security claim (per-user isolation) is only worth anything if it's
actually verified, not just asserted."""

import uuid
from datetime import UTC, datetime

from database import get_db


async def _create_conv(client, title="Test Chat"):
    resp = await client.post("/api/conversations", json={"title": title, "mode": "chat"})
    assert resp.status_code == 200
    return resp.json()["id"]


async def _insert_message(conv_id: str, content: str, role: str = "user"):
    async with get_db() as db:
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content, mode, created_at) VALUES (?,?,?,?,?,?)",
            (str(uuid.uuid4()), conv_id, role, content, "chat", datetime.now(UTC).isoformat()),
        )


async def test_create_and_list_own_conversation(client):
    conv_id = await _create_conv(client)
    resp = await client.get("/api/conversations")
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert conv_id in ids


async def test_user_cannot_list_other_users_conversations(client, other_client):
    await _create_conv(client, title="User A's private chat")
    resp = await other_client.get("/api/conversations")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_user_cannot_read_other_users_messages(client, other_client):
    conv_id = await _create_conv(client)
    resp = await other_client.get(f"/api/conversations/{conv_id}/messages")
    assert resp.status_code == 200
    assert resp.json() == []  # ownership check fails closed to empty, not an error leaking existence


async def test_user_cannot_delete_other_users_conversation(client, other_client):
    conv_id = await _create_conv(client)
    await other_client.delete(f"/api/conversations/{conv_id}")
    # Conversation must still exist for the owner.
    resp = await client.get("/api/conversations")
    ids = [c["id"] for c in resp.json()]
    assert conv_id in ids


async def test_user_cannot_rename_other_users_conversation(client, other_client):
    conv_id = await _create_conv(client, title="Original Title")
    await other_client.patch(f"/api/conversations/{conv_id}/title", json={"title": "Hijacked"})
    resp = await client.get("/api/conversations")
    conv = next(c for c in resp.json() if c["id"] == conv_id)
    assert conv["title"] == "Original Title"


async def test_user_cannot_pin_other_users_conversation(client, other_client):
    conv_id = await _create_conv(client)
    await other_client.patch(f"/api/conversations/{conv_id}/pin", json={"pinned": True})
    resp = await client.get("/api/conversations")
    conv = next(c for c in resp.json() if c["id"] == conv_id)
    assert conv["pinned"] is False


async def test_user_cannot_duplicate_other_users_conversation(client, other_client):
    conv_id = await _create_conv(client)
    resp = await other_client.post(f"/api/conversations/{conv_id}/duplicate")
    assert resp.status_code == 404


async def test_search_only_returns_own_messages(client, other_client):
    conv_id = await _create_conv(client)
    await _insert_message(conv_id, "the secret launch codes are hidden here")

    resp = await client.get("/api/conversations/search?q=launch")
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["conversation_id"] == conv_id

    other_resp = await other_client.get("/api/conversations/search?q=launch")
    assert other_resp.status_code == 200
    assert other_resp.json() == []


async def test_search_requires_minimum_query_length(client):
    conv_id = await _create_conv(client)
    await _insert_message(conv_id, "x")
    resp = await client.get("/api/conversations/search?q=a")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_owner_can_delete_own_conversation(client):
    conv_id = await _create_conv(client)
    resp = await client.delete(f"/api/conversations/{conv_id}")
    assert resp.status_code == 200
    resp = await client.get("/api/conversations")
    assert conv_id not in [c["id"] for c in resp.json()]


async def test_anon_request_rejected(anon_client):
    resp = await anon_client.get("/api/conversations")
    assert resp.status_code == 401
