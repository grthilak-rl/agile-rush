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
from app.api.organizations import router as organizations_router

# Import all models so they are registered with Base.metadata
import app.models  # noqa: F401


def _sync_project_members_to_orgs():
    """Backfill: ensure every active project member of an org project
    also has an active OrgMember record in the parent org."""
    from datetime import datetime, timezone
    from app.database import SessionLocal
    from app.models.project import Project
    from app.models.project_member import ProjectMember, MemberStatus
    from app.models.org_member import OrgMember, OrgRole, OrgMemberStatus

    db = SessionLocal()
    try:
        # Find all active project members on org projects
        org_project_members = (
            db.query(ProjectMember.user_id, Project.org_id, Project.owner_id)
            .join(Project, ProjectMember.project_id == Project.id)
            .filter(
                Project.org_id.isnot(None),
                ProjectMember.user_id.isnot(None),
                ProjectMember.status == MemberStatus.active,
            )
            .all()
        )

        # Also include project owners of org projects
        org_project_owners = (
            db.query(Project.owner_id, Project.org_id)
            .filter(Project.org_id.isnot(None))
            .all()
        )

        # Collect unique (user_id, org_id) pairs that should exist
        needed = set()
        for user_id, org_id, _ in org_project_members:
            needed.add((user_id, org_id))
        for owner_id, org_id in org_project_owners:
            needed.add((owner_id, org_id))

        created = 0
        for user_id, org_id in needed:
            exists = db.query(OrgMember).filter(
                OrgMember.org_id == org_id,
                OrgMember.user_id == user_id,
                OrgMember.status.in_([OrgMemberStatus.active, OrgMemberStatus.pending]),
            ).first()
            if not exists:
                db.add(OrgMember(
                    org_id=org_id,
                    user_id=user_id,
                    role=OrgRole.member,
                    status=OrgMemberStatus.active,
                    joined_at=datetime.now(timezone.utc),
                ))
                created += 1

        if created:
            db.commit()
            print(f"[startup] Synced {created} project member(s) into their org.")
    except Exception as e:
        db.rollback()
        print(f"[startup] Org member sync skipped: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run alembic migrations on startup
    from alembic.config import Config
    from alembic import command
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    # Backfill: sync project members → org members
    _sync_project_members_to_orgs()
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
app.include_router(organizations_router)


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
