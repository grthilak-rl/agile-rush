from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectType
from app.models.backlog_item import BacklogItem, ItemStatus
from app.models.sprint import Sprint, SprintStatus
from app.models.activity_log import ActivityLog
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectStatsResponse

router = APIRouter(prefix="/api/projects", tags=["projects"])

PRESET_COLORS = [
    "#2563EB", "#10B981", "#F97316", "#8B5CF6",
    "#F43F5E", "#EAB308", "#06B6D4", "#EC4899",
]


def verify_project_ownership(project_id: str, user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    result = []
    for project in projects:
        total_items = db.query(func.count(BacklogItem.id)).filter(
            BacklogItem.project_id == project.id
        ).scalar() or 0

        completed_items = db.query(func.count(BacklogItem.id)).filter(
            BacklogItem.project_id == project.id,
            BacklogItem.status == ItemStatus.done,
        ).scalar() or 0

        active_sprint = db.query(Sprint).filter(
            Sprint.project_id == project.id,
            Sprint.status == SprintStatus.active,
        ).first()

        progress_percentage = (completed_items / total_items * 100) if total_items > 0 else 0.0

        project_data = ProjectResponse.model_validate(project)
        project_data.active_sprint_name = active_sprint.name if active_sprint else None
        project_data.total_items = total_items
        project_data.completed_items = completed_items
        project_data.progress_percentage = round(progress_percentage, 1)
        result.append(project_data)

    return result


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing_count = db.query(func.count(Project.id)).filter(
        Project.owner_id == current_user.id
    ).scalar() or 0
    color = PRESET_COLORS[existing_count % len(PRESET_COLORS)]

    project = Project(
        name=project_data.name,
        client_name=project_data.client_name,
        description=project_data.description,
        project_type=project_data.project_type or ProjectType.contract,
        default_sprint_duration=project_data.default_sprint_duration or 2,
        owner_id=current_user.id,
        color=color,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    project_resp = ProjectResponse.model_validate(project)
    project_resp.total_items = 0
    project_resp.completed_items = 0
    project_resp.progress_percentage = 0.0
    return project_resp


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = verify_project_ownership(project_id, current_user, db)

    total_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id
    ).scalar() or 0

    completed_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id,
        BacklogItem.status == ItemStatus.done,
    ).scalar() or 0

    active_sprint = db.query(Sprint).filter(
        Sprint.project_id == project.id,
        Sprint.status == SprintStatus.active,
    ).first()

    progress_percentage = (completed_items / total_items * 100) if total_items > 0 else 0.0

    project_resp = ProjectResponse.model_validate(project)
    project_resp.active_sprint_name = active_sprint.name if active_sprint else None
    project_resp.total_items = total_items
    project_resp.completed_items = completed_items
    project_resp.progress_percentage = round(progress_percentage, 1)
    return project_resp


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    update_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = verify_project_ownership(project_id, current_user, db)

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    total_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id
    ).scalar() or 0

    completed_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id,
        BacklogItem.status == ItemStatus.done,
    ).scalar() or 0

    active_sprint = db.query(Sprint).filter(
        Sprint.project_id == project.id,
        Sprint.status == SprintStatus.active,
    ).first()

    progress_percentage = (completed_items / total_items * 100) if total_items > 0 else 0.0

    project_resp = ProjectResponse.model_validate(project)
    project_resp.active_sprint_name = active_sprint.name if active_sprint else None
    project_resp.total_items = total_items
    project_resp.completed_items = completed_items
    project_resp.progress_percentage = round(progress_percentage, 1)
    return project_resp


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = verify_project_ownership(project_id, current_user, db)

    db.query(ActivityLog).filter(ActivityLog.project_id == project.id).delete()
    db.query(BacklogItem).filter(BacklogItem.project_id == project.id).delete()
    db.query(Sprint).filter(Sprint.project_id == project.id).delete()
    db.delete(project)
    db.commit()
    return None


@router.get("/{project_id}/stats", response_model=ProjectStatsResponse)
def get_project_stats(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = verify_project_ownership(project_id, current_user, db)

    total_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id
    ).scalar() or 0

    new_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id,
        BacklogItem.status.in_([ItemStatus.backlog, ItemStatus.todo]),
    ).scalar() or 0

    in_progress = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id,
        BacklogItem.status.in_([ItemStatus.in_progress, ItemStatus.in_review]),
    ).scalar() or 0

    completed = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id,
        BacklogItem.status == ItemStatus.done,
    ).scalar() or 0

    total_points = db.query(func.coalesce(func.sum(BacklogItem.story_points), 0)).filter(
        BacklogItem.project_id == project.id
    ).scalar() or 0

    completed_points = db.query(func.coalesce(func.sum(BacklogItem.story_points), 0)).filter(
        BacklogItem.project_id == project.id,
        BacklogItem.status == ItemStatus.done,
    ).scalar() or 0

    now = datetime.now(timezone.utc)
    start_of_this_week = now - timedelta(days=now.weekday())
    start_of_this_week = start_of_this_week.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_last_week = start_of_this_week - timedelta(days=7)

    items_this_week = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id,
        BacklogItem.status == ItemStatus.done,
        BacklogItem.updated_at >= start_of_this_week,
    ).scalar() or 0

    items_last_week = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project.id,
        BacklogItem.status == ItemStatus.done,
        BacklogItem.updated_at >= start_of_last_week,
        BacklogItem.updated_at < start_of_this_week,
    ).scalar() or 0

    return ProjectStatsResponse(
        total_items=total_items,
        new_items=new_items,
        in_progress=in_progress,
        completed=completed,
        total_points=total_points,
        completed_points=completed_points,
        items_this_week=items_this_week,
        items_last_week=items_last_week,
    )
