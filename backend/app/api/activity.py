from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogResponse

router = APIRouter(prefix="/api/projects", tags=["activity"])


def verify_project_ownership(project_id: str, user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.get("/{project_id}/activity", response_model=List[ActivityLogResponse])
def list_activity(
    project_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    activities = (
        db.query(ActivityLog)
        .options(joinedload(ActivityLog.user))
        .filter(ActivityLog.project_id == project_id)
        .order_by(ActivityLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [ActivityLogResponse.model_validate(a) for a in activities]
