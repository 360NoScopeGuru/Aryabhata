from collections import defaultdict, deque
import time
from fastapi import Depends, HTTPException, Request
from auth import get_current_user

_LIMITS: dict[str, tuple[int, int]] = {
    "chat":  (60, 60),
    "code":  (60, 60),
    "image": (10, 60),
    "blend": (30, 60),
}

_buckets: dict[str, deque] = defaultdict(deque)


class RateLimit:
    """Sliding-window per-user rate limiter. Use as a FastAPI dependency."""

    def __init__(self, kind: str):
        self.kind = kind
        self.max_reqs, self.window = _LIMITS.get(kind, (120, 60))

    async def __call__(self, user_id: str = Depends(get_current_user)):
        key = f"{user_id}:{self.kind}"
        now = time.monotonic()
        bucket = _buckets[key]
        while bucket and bucket[0] < now - self.window:
            bucket.popleft()
        if len(bucket) >= self.max_reqs:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded — {self.max_reqs} requests per {self.window}s",
                headers={"Retry-After": str(self.window)},
            )
        bucket.append(now)


class RateLimitByIP:
    """Sliding-window per-IP rate limiter for unauthenticated endpoints."""

    def __init__(self, kind: str, max_reqs: int, window: int):
        self.kind = kind
        self.max_reqs = max_reqs
        self.window = window

    async def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        key = f"ip:{client_ip}:{self.kind}"
        now = time.monotonic()
        bucket = _buckets[key]
        while bucket and bucket[0] < now - self.window:
            bucket.popleft()
        if len(bucket) >= self.max_reqs:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded — {self.max_reqs} requests per {self.window}s",
                headers={"Retry-After": str(self.window)},
            )
        bucket.append(now)
