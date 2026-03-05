from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberStatus
from app.models.sprint import Sprint, SprintStatus
from app.models.backlog_item import BacklogItem, ItemStatus

router = APIRouter(prefix="/api/stats", tags=["dashboard"])


@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get all projects user has access to (owner or active member)
    member_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == current_user.id,
        ProjectMember.status == MemberStatus.active,
    ).subquery()

    user_projects = db.query(Project.id).filter(
        or_(
            Project.owner_id == current_user.id,
            Project.id.in_(member_project_ids),
        )
    ).all()
    project_ids = [p.id for p in user_projects]

    if not project_ids:
        return {
            "active_projects": 0,
            "active_projects_trend": 0,
            "active_sprints": 0,
            "active_sprints_trend": 0,
            "open_items": 0,
            "open_items_trend": 0,
            "completed_this_week": 0,
            "completed_last_week": 0,
            "completed_trend": 0,
        }

    active_projects = len(project_ids)

    active_sprints = db.query(func.count(Sprint.id)).filter(
        Sprint.project_id.in_(project_ids),
        Sprint.status == SprintStatus.active,
    ).scalar() or 0

    open_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id.in_(project_ids),
        BacklogItem.status.in_([
            ItemStatus.todo, ItemStatus.in_progress, ItemStatus.in_review,
        ]),
    ).scalar() or 0

    now = datetime.now(timezone.utc)
    start_of_this_week = now - timedelta(days=now.weekday())
    start_of_this_week = start_of_this_week.replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    start_of_last_week = start_of_this_week - timedelta(days=7)
    end_of_last_week = start_of_this_week

    completed_this_week = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id.in_(project_ids),
        BacklogItem.status == ItemStatus.done,
        BacklogItem.updated_at >= start_of_this_week,
    ).scalar() or 0

    completed_last_week = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id.in_(project_ids),
        BacklogItem.status == ItemStatus.done,
        BacklogItem.updated_at >= start_of_last_week,
        BacklogItem.updated_at < end_of_last_week,
    ).scalar() or 0

    items_created_this_week = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id.in_(project_ids),
        BacklogItem.status.in_([
            ItemStatus.todo, ItemStatus.in_progress, ItemStatus.in_review,
        ]),
        BacklogItem.created_at >= start_of_this_week,
    ).scalar() or 0

    open_items_trend = items_created_this_week - completed_this_week

    projects_this_week = db.query(func.count(Project.id)).filter(
        Project.owner_id == current_user.id,
        Project.created_at >= start_of_this_week,
    ).scalar() or 0

    return {
        "active_projects": active_projects,
        "active_projects_trend": projects_this_week,
        "active_sprints": active_sprints,
        "active_sprints_trend": 0,
        "open_items": open_items,
        "open_items_trend": open_items_trend,
        "completed_this_week": completed_this_week,
        "completed_last_week": completed_last_week,
        "completed_trend": completed_this_week - completed_last_week,
    }
