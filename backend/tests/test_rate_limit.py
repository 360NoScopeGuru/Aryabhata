"""Tests for the sliding-window rate limiters — both the per-user (RateLimit)
and per-IP (RateLimitByIP) variants."""

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from rate_limit import RateLimit, RateLimitByIP, _buckets


@pytest.fixture(autouse=True)
def _clear_buckets():
    _buckets.clear()
    yield
    _buckets.clear()


async def test_allows_requests_under_limit():
    limiter = RateLimit("chat")
    for _ in range(5):
        await limiter(user_id="user-a")  # should not raise


async def test_blocks_requests_over_limit():
    limiter = RateLimit("image")  # 10 req / 60s
    for _ in range(10):
        await limiter(user_id="user-a")
    with pytest.raises(HTTPException) as exc_info:
        await limiter(user_id="user-a")
    assert exc_info.value.status_code == 429
    assert "Retry-After" in exc_info.value.headers


async def test_limit_is_per_user():
    limiter = RateLimit("image")
    for _ in range(10):
        await limiter(user_id="user-a")
    # A different user has an independent bucket and should not be blocked.
    await limiter(user_id="user-b")


async def test_limit_is_per_kind():
    """Exhausting the image bucket (10/60s) must not affect the chat bucket
    (60/60s) for the same user — they're keyed separately."""
    image_limiter = RateLimit("image")
    chat_limiter = RateLimit("chat")
    for _ in range(10):
        await image_limiter(user_id="user-a")
    with pytest.raises(HTTPException):
        await image_limiter(user_id="user-a")
    await chat_limiter(user_id="user-a")  # should not raise


async def test_window_slides(monkeypatch):
    """Requests older than the window are evicted, freeing up capacity."""
    import time

    limiter = RateLimit("image")  # 10 req / 60s
    t = [1000.0]
    monkeypatch.setattr(time, "monotonic", lambda: t[0])

    for _ in range(10):
        await limiter(user_id="user-a")
    with pytest.raises(HTTPException):
        await limiter(user_id="user-a")

    t[0] += 61  # advance past the 60s window
    await limiter(user_id="user-a")  # should not raise — old entries evicted


async def test_unknown_kind_uses_default_limit():
    limiter = RateLimit("some-未知-kind")
    assert limiter.max_reqs == 120
    assert limiter.window == 60


def _fake_request(ip: str) -> MagicMock:
    req = MagicMock()
    req.client.host = ip
    return req


async def test_rate_limit_by_ip_allows_under_limit():
    limiter = RateLimitByIP("share_read", max_reqs=3, window=60)
    for _ in range(3):
        await limiter(_fake_request("1.2.3.4"))


async def test_rate_limit_by_ip_blocks_over_limit():
    limiter = RateLimitByIP("share_read", max_reqs=3, window=60)
    for _ in range(3):
        await limiter(_fake_request("1.2.3.4"))
    with pytest.raises(HTTPException) as exc_info:
        await limiter(_fake_request("1.2.3.4"))
    assert exc_info.value.status_code == 429


async def test_rate_limit_by_ip_is_per_ip():
    limiter = RateLimitByIP("share_read", max_reqs=3, window=60)
    for _ in range(3):
        await limiter(_fake_request("1.2.3.4"))
    await limiter(_fake_request("5.6.7.8"))  # different IP, independent bucket


async def test_rate_limit_by_ip_handles_missing_client():
    """request.client can be None (e.g. some test/proxy setups) — must not crash."""
    req = MagicMock()
    req.client = None
    limiter = RateLimitByIP("share_read", max_reqs=3, window=60)
    await limiter(req)  # should not raise
