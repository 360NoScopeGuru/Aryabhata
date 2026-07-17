import os

# Must be set before `main`/`database`/`auth` are imported, since they read
# these at module import time.
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:testpass@localhost:55432/aryabhata")
os.environ.setdefault("DB_SSL_MODE", "disable")
os.environ.setdefault("CLERK_JWKS_URL", "https://example.clerk.accounts.dev/.well-known/jwks.json")
os.environ.setdefault("CLERK_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("CLERK_PUBLISHABLE_KEY", "pk_test_dummy")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")
os.environ.setdefault("NVIDIA_API_KEY", "test-key")
os.environ.setdefault("CLOUDINARY_CLOUD_NAME", "test")
os.environ.setdefault("CLOUDINARY_API_KEY", "test")
os.environ.setdefault("CLOUDINARY_API_SECRET", "test")

from types import SimpleNamespace  # noqa: E402

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from fastapi import HTTPException, Request  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

import main as main_module  # noqa: E402
from auth import get_current_user  # noqa: E402
from database import _get_pool, init_db  # noqa: E402

TEST_USER = "test-user-1"
OTHER_USER = "test-user-2"

_TEST_USER_HEADER = "x-test-user"


async def _header_based_user(request: Request) -> str:
    """Test-only override: identity comes from a per-request header instead
    of a real JWT, and — critically — from the request itself rather than
    shared mutable state on `app.dependency_overrides`. Swapping the override
    function per fixture would leak between concurrently-held clients (two
    fixtures both mutating the same global dict on the same app object),
    which is exactly the kind of bug these ownership tests exist to catch."""
    user_id = request.headers.get(_TEST_USER_HEADER)
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing X-Test-User header")
    return user_id


@pytest_asyncio.fixture(autouse=True)
async def _clean_db():
    """Ensure schema exists and start each test with empty tables."""
    await init_db()
    pool = await _get_pool()
    async with pool.acquire() as conn:
        await conn.execute("TRUNCATE conversations, messages, votes, shared_links, demo_usage CASCADE")
    main_module.app.dependency_overrides[get_current_user] = _header_based_user
    yield
    main_module.app.dependency_overrides.clear()


def _client_as(user_id: str) -> AsyncClient:
    transport = ASGITransport(app=main_module.app)
    return AsyncClient(transport=transport, base_url="http://test", headers={_TEST_USER_HEADER: user_id})


@pytest_asyncio.fixture
async def client():
    """Authenticated as TEST_USER."""
    async with _client_as(TEST_USER) as c:
        yield c


@pytest_asyncio.fixture
async def other_client():
    """Authenticated as OTHER_USER — for cross-user ownership tests."""
    async with _client_as(OTHER_USER) as c:
        yield c


@pytest_asyncio.fixture
async def anon_client():
    """No X-Test-User header — for testing unauthenticated rejection."""
    transport = ASGITransport(app=main_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class FakeChunk:
    """Mimics one chunk of an NVIDIA NIM (OpenAI-compatible) streaming
    chat-completion response — just enough shape for chat.py/blend.py to
    read `chunk.choices[0].delta.content`."""

    def __init__(self, text):
        self.choices = [SimpleNamespace(delta=SimpleNamespace(content=text))]


class FakeNIMClient:
    """Stands in for AsyncOpenAI. Records every create() call (in order) so
    tests can assert on what was actually sent to the model — in particular,
    that blend mode's collaborative system prompt actually contains prior
    models' output."""

    def __init__(self, responses_by_model=None, default_response="mock response"):
        self.responses_by_model = responses_by_model or {}
        self.default_response = default_response
        self.calls: list[dict] = []
        self.constructor_calls: list[dict] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    async def _create(self, **kwargs):
        self.calls.append(kwargs)
        text = self.responses_by_model.get(kwargs.get("model"), self.default_response)
        if not kwargs.get("stream"):
            # Non-streaming callers (route classifier, auto-namer) expect a
            # single response object, not an async iterator of chunks.
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=text))])
        return self._stream(text)

    async def _stream(self, text):
        yield FakeChunk(text)


@pytest.fixture
def fake_nim(monkeypatch):
    """Patches AsyncOpenAI in both chat.py and blend.py to return the SAME
    FakeNIMClient instance regardless of how many times it's constructed
    (blend.py builds a fresh client per model in its loop) — returns that
    shared instance so tests can inspect `.calls`."""
    from routes import blend, chat, demo

    fake = FakeNIMClient()

    def _factory(*a, **kw):
        fake.constructor_calls.append(kw)
        return fake

    monkeypatch.setattr(chat, "AsyncOpenAI", _factory)
    monkeypatch.setattr(blend, "AsyncOpenAI", _factory)
    monkeypatch.setattr(demo, "AsyncOpenAI", _factory)
    return fake
