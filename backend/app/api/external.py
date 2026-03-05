"""
External API endpoints (v1) - authenticated via API key in X-API-Key header.
Separate from JWT auth used by the internal API.
"""

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.api_key import ApiKey
from app.models.project import Project
from app.models.backlog_item import BacklogItem, ItemType, Priority, ItemStatus
from app.models.sprint import Sprint, SprintStatus

router = APIRouter(prefix="/api/v1", tags=["external-api"])


class ExternalBacklogItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: Optional[str] = "story"
    priority: Optional[str] = "medium"


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def get_user_from_api_key(
    x_api_key: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    key_hash = _hash_key(x_api_key)
    api_key = db.query(ApiKey).filter(
        ApiKey.key_hash == key_hash,
        ApiKey.is_active == True,
    ).first()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    # Update last_used_at
    api_key.last_used_at = datetime.now(timezone.utc)
    db.commit()

    user = db.query(User).filter(User.id == api_key.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


@router.get("/projects")
def list_projects(
    user: User = Depends(get_user_from_api_key),
    db: Session = Depends(get_db),
):
    projects = db.query(Project).filter(Project.owner_id == user.id).all()

    result = []
    for p in projects:
        total = db.query(func.count(BacklogItem.id)).filter(
            BacklogItem.project_id == p.id
        ).scalar() or 0
        done = db.query(func.count(BacklogItem.id)).filter(
            BacklogItem.project_id == p.id,
            BacklogItem.status == ItemStatus.done,
        ).scalar() or 0
        progress = round((done / total * 100) if total > 0 else 0, 1)

        result.append({
            "id": p.id,
            "name": p.name,
            "client_name": p.client_name,
            "progress": progress,
        })

    return result


@router.get("/projects/{project_id}/status")
def get_project_status(
    project_id: str,
    user: User = Depends(get_user_from_api_key),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    active_sprint = db.query(Sprint).filter(
        Sprint.project_id == project_id,
        Sprint.status == SprintStatus.active,
    ).first()

    total = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project_id
    ).scalar() or 0
    done = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id == project_id,
        BacklogItem.status == ItemStatus.done,
    ).scalar() or 0
    progress = round((done / total * 100) if total > 0 else 0, 1)

    # Item counts by status
    items_by_status = {}
    for s in ["todo", "in_progress", "in_review", "done"]:
        count = db.query(func.count(BacklogItem.id)).filter(
            BacklogItem.project_id == project_id,
            BacklogItem.status == s,
        ).scalar() or 0
        items_by_status[s] = count

    # Velocity from last 3 completed sprints
    completed_sprints = (
        db.query(Sprint)
        .filter(Sprint.project_id == project_id, Sprint.status == SprintStatus.completed)
        .order_by(Sprint.sprint_number.desc())
        .limit(3)
        .all()
    )
    velocity = 0
    if completed_sprints:
        vels = []
        for s in completed_sprints:
            pts = db.query(func.coalesce(func.sum(BacklogItem.story_points), 0)).filter(
                BacklogItem.sprint_id == s.id, BacklogItem.status == ItemStatus.done
            ).scalar()
            vels.append(pts)
        velocity = round(sum(vels) / len(vels))

    days_remaining = None
    if active_sprint and active_sprint.end_date:
        from datetime import date
        days_remaining = max(0, (active_sprint.end_date - date.today()).days)

    return {
        "project": project.name,
        "active_sprint": active_sprint.name if active_sprint else None,
        "progress": progress,
        "days_remaining": days_remaining,
        "items": items_by_status,
        "velocity": velocity,
    }


@router.get("/projects/{project_id}/backlog")
def get_project_backlog(
    project_id: str,
    user: User = Depends(get_user_from_api_key),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    items = (
        db.query(BacklogItem)
        .filter(BacklogItem.project_id == project_id)
        .order_by(BacklogItem.position)
        .all()
    )

    return [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "type": item.type,
            "priority": item.priority,
            "status": item.status,
            "story_points": item.story_points,
            "sprint_id": item.sprint_id,
        }
        for item in items
    ]


@router.post("/projects/{project_id}/backlog", status_code=status.HTTP_201_CREATED)
def create_backlog_item_external(
    project_id: str,
    data: ExternalBacklogItemCreate,
    user: User = Depends(get_user_from_api_key),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    max_position = db.query(func.coalesce(func.max(BacklogItem.position), 0)).filter(
        BacklogItem.project_id == project_id
    ).scalar()

    item = BacklogItem(
        project_id=project_id,
        title=data.title,
        description=data.description,
        type=data.type or ItemType.story,
        priority=data.priority or Priority.medium,
        status=ItemStatus.backlog,
        position=max_position + 1,
        labels=[],
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "type": item.type,
        "priority": item.priority,
        "status": item.status,
        "story_points": item.story_points,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }
