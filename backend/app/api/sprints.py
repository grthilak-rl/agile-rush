from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.sprint import Sprint, SprintStatus
from app.schemas.sprint import SprintCreate, SprintResponse

router = APIRouter(prefix="/api/projects", tags=["sprints"])


def verify_project_ownership(project_id: str, user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.get("/{project_id}/sprints", response_model=List[SprintResponse])
def list_sprints(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    sprints = (
        db.query(Sprint)
        .filter(Sprint.project_id == project_id)
        .order_by(Sprint.sprint_number)
        .all()
    )
    return [SprintResponse.model_validate(s) for s in sprints]


@router.get("/{project_id}/sprints/active", response_model=Optional[SprintResponse])
def get_active_sprint(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    sprint = (
        db.query(Sprint)
        .filter(Sprint.project_id == project_id, Sprint.status == SprintStatus.active)
        .first()
    )
    if not sprint:
        return None
    return SprintResponse.model_validate(sprint)


@router.post("/{project_id}/sprints", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
def create_sprint(
    project_id: str,
    sprint_data: SprintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = verify_project_ownership(project_id, current_user, db)

    max_sprint_number = db.query(func.coalesce(func.max(Sprint.sprint_number), 0)).filter(
        Sprint.project_id == project_id
    ).scalar()
    next_number = max_sprint_number + 1

    name = sprint_data.name if sprint_data.name else f"Sprint {next_number}"
    duration = sprint_data.duration_weeks if sprint_data.duration_weeks else project.default_sprint_duration

    sprint = Sprint(
        project_id=project_id,
        name=name,
        goal=sprint_data.goal,
        sprint_number=next_number,
        duration_weeks=duration,
        status=SprintStatus.planning,
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)

    return SprintResponse.model_validate(sprint)
