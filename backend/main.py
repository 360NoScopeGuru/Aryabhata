from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
from database import init_db
from routes import chat, code, image, conversations, blend, prompt, arena
import os

app = FastAPI(title="Aryabhata API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
