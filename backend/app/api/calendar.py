from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_project_with_access
from app.models.user import User
from app.models.backlog_item import BacklogItem
from app.models.sprint import Sprint

router = APIRouter(prefix="/api/projects", tags=["calendar"])


@router.get("/{project_id}/calendar")
def get_calendar_items(
    project_id: str,
    start: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    # Items with due_date or start_date within the range
    items_query = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee), joinedload(BacklogItem.sprint))
        .filter(
            BacklogItem.project_id == project_id,
            or_(
                and_(
                    BacklogItem.due_date.isnot(None),
                    BacklogItem.due_date >= start,
                    BacklogItem.due_date <= end,
                ),
                and_(
                    BacklogItem.start_date.isnot(None),
                    BacklogItem.start_date >= start,
                    BacklogItem.start_date <= end,
                ),
            ),
        )
        .order_by(BacklogItem.due_date.asc().nullslast(), BacklogItem.position)
        .all()
    )

    today = date.today()

    items_out = []
    for item in items_query:
        is_overdue = bool(
            item.due_date
            and item.status != "done"
            and item.due_date < today
        )
        assignee_data = None
        if item.assignee:
            assignee_data = {
                "id": str(item.assignee.id),
                "full_name": item.assignee.full_name,
                "avatar_url": item.assignee.avatar_url,
            }
        sprint_data = None
        if item.sprint:
            sprint_data = {
                "id": str(item.sprint.id),
                "name": item.sprint.name,
            }
        items_out.append({
            "id": str(item.id),
            "title": item.title,
            "due_date": item.due_date.isoformat() if item.due_date else None,
            "start_date": item.start_date.isoformat() if item.start_date else None,
            "type": item.type,
            "priority": item.priority,
            "status": item.status,
            "story_points": item.story_points,
            "assignee": assignee_data,
            "sprint": sprint_data,
            "labels": item.labels or [],
            "is_overdue": is_overdue,
        })

    # Sprints overlapping the date range
    sprints_query = (
        db.query(Sprint)
        .filter(
            Sprint.project_id == project_id,
            Sprint.start_date.isnot(None),
            Sprint.end_date.isnot(None),
            Sprint.start_date <= end,
            Sprint.end_date >= start,
        )
        .order_by(Sprint.start_date.asc())
        .all()
    )

    sprints_out = []
    for s in sprints_query:
        sprints_out.append({
            "id": str(s.id),
            "name": s.name,
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "status": s.status,
        })

    return {"items": items_out, "sprints": sprints_out}
