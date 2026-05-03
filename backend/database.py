import asyncpg
import os
from contextlib import asynccontextmanager

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
            ssl='require',
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
