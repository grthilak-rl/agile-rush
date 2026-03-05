from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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

# Import all models so they are registered with Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (for dev convenience)
    Base.metadata.create_all(bind=engine)
    yield


limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(title="AgileRush API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
