"""Sharing: token creation/reuse, expiration, ownership, and the public
read endpoint's rate limiting."""

from datetime import UTC, datetime, timedelta

from database import get_db
from rate_limit import _buckets


async def _create_conv(client) -> str:
    resp = await client.post("/api/conversations", json={"title": "Shareable", "mode": "chat"})
    return resp.json()["id"]


async def test_create_share_link(client):
    conv_id = await _create_conv(client)
    resp = await client.post(f"/api/conversations/{conv_id}/share")
    assert resp.status_code == 200
    body = resp.json()
    assert body["token"]
    assert body["expires_at"]


async def test_cannot_share_conversation_you_do_not_own(client, other_client):
    conv_id = await _create_conv(client)
    resp = await other_client.post(f"/api/conversations/{conv_id}/share")
    assert resp.status_code == 404


async def test_reshare_returns_same_token_if_still_valid(client):
    conv_id = await _create_conv(client)
    first = await client.post(f"/api/conversations/{conv_id}/share")
    second = await client.post(f"/api/conversations/{conv_id}/share")
    assert first.json()["token"] == second.json()["token"]


async def test_public_read_of_valid_share_link(client, anon_client):
    conv_id = await _create_conv(client)
    share = await client.post(f"/api/conversations/{conv_id}/share")
    token = share.json()["token"]

    resp = await anon_client.get(f"/api/share/{token}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Shareable"


async def test_unknown_token_404(anon_client):
    resp = await anon_client.get("/api/share/does-not-exist")
    assert resp.status_code == 404


async def test_expired_link_returns_410(client, anon_client):
    conv_id = await _create_conv(client)
    share = await client.post(f"/api/conversations/{conv_id}/share")
    token = share.json()["token"]

    # Backdate the link's expiry directly — simulates time passing.
    async with get_db() as db:
        await db.execute(
            "UPDATE shared_links SET expires_at=? WHERE token=?",
            ((datetime.now(UTC) - timedelta(days=1)).isoformat(), token),
        )

    resp = await anon_client.get(f"/api/share/{token}")
    assert resp.status_code == 410


async def test_unshare_revokes_access(client, anon_client):
    conv_id = await _create_conv(client)
    share = await client.post(f"/api/conversations/{conv_id}/share")
    token = share.json()["token"]

    del_resp = await client.delete(f"/api/conversations/{conv_id}/share")
    assert del_resp.status_code == 200

    resp = await anon_client.get(f"/api/share/{token}")
    assert resp.status_code == 404


async def test_cannot_unshare_conversation_you_do_not_own(client, other_client):
    conv_id = await _create_conv(client)
    share = await client.post(f"/api/conversations/{conv_id}/share")
    token = share.json()["token"]

    resp = await other_client.delete(f"/api/conversations/{conv_id}/share")
    assert resp.status_code == 404

    # Link should still be live since the delete was rejected.
    async with get_db() as db:
        row = await db.fetchone("SELECT token FROM shared_links WHERE token=?", (token,))
    assert row is not None


async def test_share_read_endpoint_is_rate_limited(client, anon_client):
    conv_id = await _create_conv(client)
    share = await client.post(f"/api/conversations/{conv_id}/share")
    token = share.json()["token"]

    _buckets.clear()  # isolate from any rate-limit state left by other tests
    got_429 = False
    for _ in range(35):  # limit is 30 req/60s
        resp = await anon_client.get(f"/api/share/{token}")
        if resp.status_code == 429:
            got_429 = True
            break
    assert got_429
    _buckets.clear()
