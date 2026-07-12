from dotenv import load_dotenv

load_dotenv()

import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from database import init_db
from routes import arena, blend, chat, code, conversations, image, prompt, sharing

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Aryabhata API")

_origins_env = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
if not _allowed_origins:
    logger.warning(
        "ALLOWED_ORIGINS is not set — CORS will reject all cross-origin requests. "
        "Set ALLOWED_ORIGINS to your frontend origin(s) (comma-separated)."
    )
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(code.router, prefix="/api")
app.include_router(image.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(blend.router, prefix="/api")
app.include_router(prompt.router, prefix="/api")
app.include_router(arena.router, prefix="/api")
app.include_router(sharing.router, prefix="/api")


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve the built React app in production
DIST_DIR = Path(__file__).parent.parent / "dist"
if DIST_DIR.exists():

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file = DIST_DIR / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(DIST_DIR / "index.html"))
