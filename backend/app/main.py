import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.database import Base, engine
from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.backlog import router as backlog_router
from app.api.sprints import router as sprints_router
from app.api.activity import router as activity_router
from app.api.retro import router as retro_router
from app.api.reports import router as reports_router
from app.api.users import router as users_router
from app.api.dashboard import router as dashboard_router
from app.api.members import router as members_router
from app.api.notifications import router as notifications_router
from app.api.search import router as search_router
from app.api.tasks import router as tasks_router
from app.api.api_keys import router as api_keys_router
from app.api.external import router as external_router
from app.api.attachments import router as attachments_router
from app.api.comments import router as comments_router
from app.api.ws import router as ws_router
from app.api.calendar import router as calendar_router
from app.api.imports import router as imports_router
from app.api.admin import router as admin_router

# Import all models so they are registered with Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (for dev convenience)
    Base.metadata.create_all(bind=engine)
    # Store event loop reference for sync->async WebSocket broadcasts
    from app.core.websocket import set_event_loop
    set_event_loop(asyncio.get_running_loop())
    yield


limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(title="AgileRush API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory only for local storage (S3 uses presigned URLs)
if os.getenv("STORAGE_BACKEND", "local") != "s3":
    uploads_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include routers
app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(backlog_router)
app.include_router(sprints_router)
app.include_router(activity_router)
app.include_router(retro_router)
app.include_router(reports_router)
app.include_router(users_router)
app.include_router(dashboard_router)
app.include_router(members_router)
app.include_router(notifications_router)
app.include_router(search_router)
app.include_router(tasks_router)
app.include_router(api_keys_router)
app.include_router(external_router)
app.include_router(attachments_router)
app.include_router(comments_router)
app.include_router(ws_router)
app.include_router(calendar_router)
app.include_router(imports_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {"message": "AgileRush API is running"}


@app.get("/health")
def health():
    from sqlalchemy import text
    from app.database import SessionLocal
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unhealthy", "database": "disconnected"})
