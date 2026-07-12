import asyncpg
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

_pool: asyncpg.Pool | None = None


def _pg(query: str) -> str:
    """Convert SQLite-style ? placeholders to Postgres $1, $2, ..."""
    n, out = 0, []
    for ch in query:
        if ch == '?':
            n += 1
            out.append(f'${n}')
        else:
            out.append(ch)
    return ''.join(out)


class _DB:
    def __init__(self, conn: asyncpg.Connection):
        self._c = conn

    async def execute(self, query: str, params: tuple = ()):
        await self._c.execute(_pg(query), *params)

    async def fetchall(self, query: str, params: tuple = ()):
        rows = await self._c.fetch(_pg(query), *params)
        return [dict(r) for r in rows]

    async def fetchone(self, query: str, params: tuple = ()):
        row = await self._c.fetchrow(_pg(query), *params)
        return dict(row) if row else None

    async def commit(self):
        pass  # asyncpg auto-commits each statement


async def _get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        url = os.getenv("DATABASE_URL", "")
        # Strip query params asyncpg doesn't understand; pass ssl separately
        dsn = url.split('?')[0]
        _pool = await asyncpg.create_pool(
            dsn,
            ssl=os.getenv("DB_SSL_MODE", "require"),  # "disable" for local/CI Postgres containers
            statement_cache_size=0,  # required for Neon pooler (PgBouncer)
            min_size=1,
            max_size=5,
        )
    return _pool


@asynccontextmanager
async def get_db():
    pool = await _get_pool()
    async with pool.acquire() as conn:
        yield _DB(conn)


async def init_db():
    pool = await _get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                mode TEXT NOT NULL DEFAULT 'chat',
                model TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                mode TEXT NOT NULL DEFAULT 'chat',
                model TEXT,
                image_url TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
        """)
        await conn.execute(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''"
        )
        await conn.execute(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS forked_from TEXT DEFAULT NULL"
        )
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS votes (
                id          TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL,
                conv_id     TEXT NOT NULL,
                msg_id      TEXT NOT NULL,
                model_id    TEXT NOT NULL,
                prompt_hash TEXT NOT NULL,
                created_at  TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS votes_user_prompt
            ON votes(user_id, conv_id, prompt_hash)
        """)
        await conn.execute(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE"
        )
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id)"
        )
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)"
        )
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)"
        )
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS shared_links (
                token           TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                user_id         TEXT NOT NULL,
                created_at      TEXT NOT NULL
            )
        """)
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_shared_links_conv_id ON shared_links(conversation_id)"
        )
        await conn.execute(
            "ALTER TABLE shared_links ADD COLUMN IF NOT EXISTS expires_at TEXT"
        )
        # Links created before the expiry policy existed have no expires_at yet.
        # Retroactively expire them now rather than grandfathering (owner decision).
        await conn.execute(
            "UPDATE shared_links SET expires_at = $1 WHERE expires_at IS NULL",
            datetime.now(timezone.utc).isoformat(),
        )
