"""Unauthenticated demo endpoint: model allowlist, rate limiting, and —
the one piece that actually matters — the hard daily spend cap, since this
endpoint shares the same server-side NVIDIA keys as authenticated users."""

from rate_limit import _buckets
from routes import demo


async def test_status_reports_models_and_budget(anon_client):
    resp = await anon_client.get("/api/demo/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["models"] == list(demo.DEMO_MODELS)
    assert body["daily_cap_usd"] == demo.DAILY_CAP_USD
    assert body["available"] is True


async def test_chat_works_without_authentication(anon_client, fake_nim):
    fake_nim.default_response = "hello from the demo"
    resp = await anon_client.post("/api/demo/chat", json={"prompt": "hi"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "hello from the demo"
    assert body["model"] == demo.DEMO_MODELS[0]


async def test_chat_rejects_model_outside_allowlist(anon_client, fake_nim):
    resp = await anon_client.post(
        "/api/demo/chat", json={"prompt": "hi", "model": "meta/llama-3.1-405b-instruct"}
    )
    assert resp.status_code == 400


async def test_chat_uses_fixed_max_tokens_not_user_controlled(anon_client, fake_nim):
    """DemoChatRequest has no max_tokens field at all — cost per request is
    bounded server-side, not by whatever the caller sends."""
    await anon_client.post("/api/demo/chat", json={"prompt": "hi", "max_tokens": 999999})
    assert fake_nim.calls[-1]["max_tokens"] == demo.DEMO_MAX_TOKENS


async def test_chat_records_spend_and_status_reflects_it(anon_client, fake_nim):
    fake_nim.default_response = "x" * 400  # a nontrivial number of estimated tokens
    resp = await anon_client.post("/api/demo/chat", json={"prompt": "hi"})
    assert resp.json()["cost_usd"] > 0

    status = (await anon_client.get("/api/demo/status")).json()
    assert status["spent_today_usd"] > 0


async def test_chat_blocked_once_daily_cap_reached(anon_client, fake_nim, monkeypatch):
    # A negative cap means "already exceeded" regardless of today's actual
    # spend (0 on a fresh test day) — a positive-but-tiny cap wouldn't block
    # the first request, since 0 spent is still under any positive cap.
    monkeypatch.setattr(demo, "DAILY_CAP_USD", -1.0)
    fake_nim.default_response = "any response"

    resp = await anon_client.post("/api/demo/chat", json={"prompt": "hi"})
    assert resp.status_code == 429
    assert "sign up" in resp.json()["detail"].lower()


async def test_demo_endpoint_is_rate_limited_per_ip(anon_client, fake_nim):
    _buckets.clear()
    got_429 = False
    for _ in range(8):  # limit is 5 req/60s
        resp = await anon_client.post("/api/demo/chat", json={"prompt": "hi"})
        if resp.status_code == 429:
            got_429 = True
            break
    assert got_429
    _buckets.clear()


async def test_prompt_length_is_validated(anon_client):
    resp = await anon_client.post("/api/demo/chat", json={"prompt": "x" * 3000})
    assert resp.status_code == 422


async def test_upstream_failure_returns_502_not_a_crash(anon_client, fake_nim):
    async def _boom(**kwargs):
        raise RuntimeError("NIM is down")

    fake_nim.chat.completions.create = _boom
    resp = await anon_client.post("/api/demo/chat", json={"prompt": "hi"})
    assert resp.status_code == 502
