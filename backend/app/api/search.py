from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_accessible_project_ids
from app.models.user import User
from app.models.project import Project
from app.models.backlog_item import BacklogItem
from app.models.sprint import Sprint

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
def global_search(
    q: str = Query(..., min_length=1),
    project_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get accessible project IDs
    accessible_ids = get_accessible_project_ids(current_user, db)

    if not accessible_ids:
        return {"query": q, "results": {"projects": [], "backlog_items": [], "sprints": []}, "total": 0}

    # Scope to specific project if provided
    search_ids = accessible_ids
    if project_id and project_id in accessible_ids:
        search_ids = [project_id]

    search_term = f"%{q}%"

    # Search projects
    projects = (
        db.query(Project)
        .filter(
            Project.id.in_(search_ids),
            or_(
                Project.name.ilike(search_term),
                Project.client_name.ilike(search_term),
                Project.description.ilike(search_term),
            ),
        )
        .limit(5)
        .all()
    )

    project_results = []
    for p in projects:
        match_field = "name"
        snippet = p.name
        if q.lower() in (p.description or "").lower():
            match_field = "description"
            desc = p.description or ""
            idx = desc.lower().find(q.lower())
            start = max(0, idx - 30)
            end = min(len(desc), idx + len(q) + 30)
            snippet = ("..." if start > 0 else "") + desc[start:end] + ("..." if end < len(desc) else "")
        elif q.lower() in (p.client_name or "").lower():
            match_field = "client_name"
            snippet = p.client_name

        project_results.append({
            "id": p.id,
            "name": p.name,
            "match": match_field,
            "snippet": snippet,
        })

    # Search backlog items
    items = (
        db.query(BacklogItem)
        .filter(
            BacklogItem.project_id.in_(search_ids),
            or_(
                BacklogItem.title.ilike(search_term),
                BacklogItem.description.ilike(search_term),
            ),
        )
        .limit(5)
        .all()
    )

    item_results = []
    for item in items:
        # Get project name
        proj = db.query(Project.name).filter(Project.id == item.project_id).first()
        item_results.append({
            "id": item.id,
            "title": item.title,
            "project_id": item.project_id,
            "project_name": proj.name if proj else "",
            "status": item.status,
            "type": item.type,
            "priority": item.priority,
            "story_points": item.story_points,
        })

    # Search sprints
    sprints = (
        db.query(Sprint)
        .filter(
            Sprint.project_id.in_(search_ids),
            or_(
                Sprint.name.ilike(search_term),
                Sprint.goal.ilike(search_term),
            ),
        )
        .limit(5)
        .all()
    )

    sprint_results = []
    for s in sprints:
        proj = db.query(Project.name).filter(Project.id == s.project_id).first()
        sprint_results.append({
            "id": s.id,
            "name": s.name,
            "project_id": s.project_id,
            "project_name": proj.name if proj else "",
            "status": s.status,
        })

    total = len(project_results) + len(item_results) + len(sprint_results)

    return {
        "query": q,
        "results": {
            "projects": project_results,
            "backlog_items": item_results,
            "sprints": sprint_results,
        },
        "total": total,
    }
