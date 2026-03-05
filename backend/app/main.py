from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.backlog import router as backlog_router
from app.api.sprints import router as sprints_router
from app.api.activity import router as activity_router
from app.api.retro import router as retro_router

# Import all models so they are registered with Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (for dev convenience)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="AgileRush API", lifespan=lifespan)

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


@app.get("/")
def root():
    return {"message": "AgileRush API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
