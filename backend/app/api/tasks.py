from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, or_

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_accessible_project_ids
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberStatus
from app.models.backlog_item import BacklogItem, ItemStatus, Priority
from app.models.sprint import Sprint, SprintStatus
from app.schemas.backlog_item import BacklogItemResponse

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

PRIORITY_ORDER = {
    Priority.critical: 0,
    Priority.high: 1,
    Priority.medium: 2,
    Priority.low: 3,
}

STATUS_ORDER = {
    ItemStatus.in_progress: 0,
    ItemStatus.in_review: 1,
    ItemStatus.todo: 2,
    ItemStatus.backlog: 3,
    ItemStatus.done: 4,
}


@router.get("/me")
def get_my_tasks(
    status: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    sort: Optional[str] = Query("priority"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accessible_ids = get_accessible_project_ids(current_user, db)

    query = (
        db.query(BacklogItem)
        .filter(
            BacklogItem.assignee_id == current_user.id,
            BacklogItem.project_id.in_(accessible_ids),
        )
    )

    if status:
        query = query.filter(BacklogItem.status == status)
    if project_id:
        query = query.filter(BacklogItem.project_id == project_id)

    # Order by priority then status then updated_at
    priority_order = case(
        (BacklogItem.priority == "critical", 0),
        (BacklogItem.priority == "high", 1),
        (BacklogItem.priority == "medium", 2),
        (BacklogItem.priority == "low", 3),
        else_=4,
    )
    status_order = case(
        (BacklogItem.status == "in_progress", 0),
        (BacklogItem.status == "in_review", 1),
        (BacklogItem.status == "todo", 2),
        (BacklogItem.status == "backlog", 3),
        (BacklogItem.status == "done", 4),
        else_=5,
    )

    if sort == "recent":
        query = query.order_by(BacklogItem.updated_at.desc())
    elif sort == "points":
        query = query.order_by(BacklogItem.story_points.desc().nullslast())
    else:
        query = query.order_by(priority_order, status_order, BacklogItem.updated_at.desc())

    items = query.all()

    # Get project info and sprint names
    project_cache = {}
    sprint_cache = {}

    result_items = []
    by_status = {}

    for item in items:
        # Cache project info
        if item.project_id not in project_cache:
            proj = db.query(Project).filter(Project.id == item.project_id).first()
            project_cache[item.project_id] = proj

        proj = project_cache[item.project_id]

        # Cache sprint info
        sprint_name = None
        if item.sprint_id:
            if item.sprint_id not in sprint_cache:
                sprint = db.query(Sprint).filter(Sprint.id == item.sprint_id).first()
                sprint_cache[item.sprint_id] = sprint
            sprint = sprint_cache.get(item.sprint_id)
            sprint_name = sprint.name if sprint else None

        result_items.append({
            "id": item.id,
            "title": item.title,
            "type": item.type,
            "priority": item.priority,
            "status": item.status,
            "story_points": item.story_points,
            "sprint_name": sprint_name,
            "project_id": item.project_id,
            "project_name": proj.name if proj else "",
            "project_color": proj.color if proj else "#2563EB",
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        })

        by_status[item.status] = by_status.get(item.status, 0) + 1

    total_points = sum(i["story_points"] or 0 for i in result_items)

    return {
        "items": result_items,
        "summary": {
            "total": len(result_items),
            "by_status": by_status,
            "total_points": total_points,
        },
    }
