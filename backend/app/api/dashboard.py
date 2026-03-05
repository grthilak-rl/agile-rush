from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.sprint import Sprint, SprintStatus
from app.models.backlog_item import BacklogItem, ItemStatus

router = APIRouter(prefix="/api/stats", tags=["dashboard"])


@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_projects = db.query(Project.id).filter(
        Project.owner_id == current_user.id
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

    # Active projects (all user's projects are considered active)
    active_projects = len(project_ids)

    # Active sprints
    active_sprints = db.query(func.count(Sprint.id)).filter(
        Sprint.project_id.in_(project_ids),
        Sprint.status == SprintStatus.active,
    ).scalar() or 0

    # Open items (not done, not backlog)
    open_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id.in_(project_ids),
        BacklogItem.status.in_([
            ItemStatus.todo, ItemStatus.in_progress, ItemStatus.in_review,
        ]),
    ).scalar() or 0

    # Time boundaries
    now = datetime.now(timezone.utc)
    # Monday of this week
    start_of_this_week = now - timedelta(days=now.weekday())
    start_of_this_week = start_of_this_week.replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    start_of_last_week = start_of_this_week - timedelta(days=7)
    end_of_last_week = start_of_this_week

    # Completed this week
    completed_this_week = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id.in_(project_ids),
        BacklogItem.status == ItemStatus.done,
        BacklogItem.updated_at >= start_of_this_week,
    ).scalar() or 0

    # Completed last week
    completed_last_week = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id.in_(project_ids),
        BacklogItem.status == ItemStatus.done,
        BacklogItem.updated_at >= start_of_last_week,
        BacklogItem.updated_at < end_of_last_week,
    ).scalar() or 0

    # Open items last week (approximate: items that were not done at start of this week)
    # We approximate trends by comparing current state to estimated previous state
    # For open_items_trend: we check how many items were completed this week (reducing open count)
    # vs items created this week (increasing open count)
    items_created_this_week = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.project_id.in_(project_ids),
        BacklogItem.status.in_([
            ItemStatus.todo, ItemStatus.in_progress, ItemStatus.in_review,
        ]),
        BacklogItem.created_at >= start_of_this_week,
    ).scalar() or 0

    # Open items trend: negative means fewer open items (good)
    open_items_trend = items_created_this_week - completed_this_week

    # Projects trend (projects created this week)
    projects_this_week = db.query(func.count(Project.id)).filter(
        Project.owner_id == current_user.id,
        Project.created_at >= start_of_this_week,
    ).scalar() or 0

    return {
        "active_projects": active_projects,
        "active_projects_trend": projects_this_week,
        "active_sprints": active_sprints,
        "active_sprints_trend": 0,  # sprints don't change week-over-week typically
        "open_items": open_items,
        "open_items_trend": open_items_trend,
        "completed_this_week": completed_this_week,
        "completed_last_week": completed_last_week,
        "completed_trend": completed_this_week - completed_last_week,
    }
