from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from pydantic import BaseModel

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_project_with_access
from app.models.user import User
from app.models.project import Project, ProjectType
from app.models.project_member import ProjectMember, MemberStatus
from app.models.backlog_item import BacklogItem, ItemStatus
from app.models.sprint import Sprint, SprintStatus
from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.models.retro_item import RetroItem
from app.models.daily_snapshot import DailySnapshot
from app.models.notification import Notification
from app.models.organization import Organization
from app.models.org_member import OrgMember, OrgMemberStatus
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectStatsResponse


class DeleteConfirmation(BaseModel):
    confirm_name: str


class MoveToOrgRequest(BaseModel):
    org_id: str


router = APIRouter(prefix="/api/projects", tags=["projects"])

PRESET_COLORS = [
    "#2563EB", "#10B981", "#F97316", "#8B5CF6",
    "#F43F5E", "#EAB308", "#06B6D4", "#EC4899",
]


def _project_response(project: Project, db: Session) -> ProjectResponse:
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

    # Add org info
    if project.org_id:
        org = db.query(Organization).filter(Organization.id == project.org_id).first()
        if org:
            project_resp.org_id = org.id
            project_resp.org_name = org.name
            project_resp.org_slug = org.slug
            project_resp.is_personal = False
    else:
        project_resp.org_id = None
        project_resp.org_name = None
        project_resp.org_slug = None
        project_resp.is_personal = True

    return project_resp


@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Personal projects: user is owner and org_id is NULL
    personal_owned = db.query(Project).filter(
        Project.owner_id == current_user.id,
        Project.org_id == None,  # noqa: E711
    ).all()

    # 2. Projects where user is a direct member (via ProjectMember)
    member_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == current_user.id,
        ProjectMember.status == MemberStatus.active,
    ).subquery()

    member_projects = db.query(Project).filter(
        Project.id.in_(member_project_ids),
        Project.org_id == None,  # noqa: E711
    ).all()

    # 3. Organization projects: user is an active org member
    user_org_ids = db.query(OrgMember.org_id).filter(
        OrgMember.user_id == current_user.id,
        OrgMember.status == OrgMemberStatus.active,
    ).subquery()

    org_projects = db.query(Project).filter(
        Project.org_id.in_(user_org_ids)
    ).all()

    # Combine and deduplicate
    all_projects = {p.id: p for p in personal_owned + member_projects + org_projects}

    return [_project_response(p, db) for p in all_projects.values()]


@router.get("/discover")
def discover_projects(
    q: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Browse personal projects (no org) the user is NOT part of, for join request flow."""
    # IDs of projects user is an active member of (exclude these)
    active_member_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == current_user.id,
        ProjectMember.status == MemberStatus.active,
    ).subquery()

    # IDs of projects user has a pending request for (include these with flag)
    pending_request_ids = set()
    pending_requests = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == current_user.id,
        ProjectMember.status == MemberStatus.pending,
        ProjectMember.invited_by.is_(None),
    ).all()
    for (pid,) in pending_requests:
        pending_request_ids.add(pid)

    # Only show personal projects (not org projects) for discover
    query = db.query(Project).filter(
        Project.owner_id != current_user.id,
        Project.id.notin_(active_member_ids),
        Project.org_id == None,  # noqa: E711
    )

    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Project.name.ilike(search_term),
                Project.description.ilike(search_term),
            )
        )

    projects = query.limit(20).all()

    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "owner": {
                "id": p.owner.id,
                "full_name": p.owner.full_name,
            } if p.owner else None,
            "pending_request": p.id in pending_request_ids,
        }
        for p in projects
    ]


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = None
    if project_data.org_id:
        # Verify user is admin/owner in the org
        org = db.query(Organization).filter(Organization.id == project_data.org_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        org_member = db.query(OrgMember).filter(
            OrgMember.org_id == project_data.org_id,
            OrgMember.user_id == current_user.id,
            OrgMember.status == OrgMemberStatus.active,
        ).first()
        if not org_member or org_member.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Only org admins can create projects in an organization")
        org_id = project_data.org_id

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
        org_id=org_id,
        color=color,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return _project_response(project, db)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, _ = get_project_with_access(project_id, current_user, db, "viewer")
    return _project_response(project, db)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    update_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, _ = get_project_with_access(project_id, current_user, db, "admin")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)
    return _project_response(project, db)


@router.patch("/{project_id}/settings", response_model=ProjectResponse)
def update_project_settings(
    project_id: str,
    update_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, _ = get_project_with_access(project_id, current_user, db, "admin")

    update_dict = update_data.model_dump(exclude_unset=True)

    if "name" in update_dict and not update_dict["name"].strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project name cannot be empty",
        )

    for key, value in update_dict.items():
        setattr(project, key, value)

    log = ActivityLog(
        project_id=project.id,
        user_id=current_user.id,
        action=ActionType.updated,
        entity_type=EntityType.project,
        entity_id=project.id,
        details={"fields_updated": list(update_dict.keys())},
    )
    db.add(log)

    db.commit()
    db.refresh(project)
    return _project_response(project, db)


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    confirm: DeleteConfirmation = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, _ = get_project_with_access(project_id, current_user, db, "owner")

    if confirm and confirm.confirm_name != project.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project name does not match",
        )

    # Cascade delete everything
    db.query(DailySnapshot).filter(
        DailySnapshot.sprint_id.in_(
            db.query(Sprint.id).filter(Sprint.project_id == project.id)
        )
    ).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.project_id == project.id).delete()
    db.query(ProjectMember).filter(ProjectMember.project_id == project.id).delete()
    db.query(RetroItem).filter(RetroItem.project_id == project.id).delete()
    db.query(ActivityLog).filter(ActivityLog.project_id == project.id).delete()
    db.query(BacklogItem).filter(BacklogItem.project_id == project.id).delete()
    db.query(Sprint).filter(Sprint.project_id == project.id).delete()
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}


@router.post("/{project_id}/move-to-org")
def move_project_to_org(
    project_id: str,
    data: MoveToOrgRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move a personal project to an organization."""
    project, _ = get_project_with_access(project_id, current_user, db, "owner")

    # Verify user is a member of the target org
    org = db.query(Organization).filter(Organization.id == data.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org_member = db.query(OrgMember).filter(
        OrgMember.org_id == data.org_id,
        OrgMember.user_id == current_user.id,
        OrgMember.status == OrgMemberStatus.active,
    ).first()
    if not org_member:
        raise HTTPException(status_code=403, detail="You must be a member of the target organization")

    project.org_id = data.org_id
    db.commit()
    db.refresh(project)

    return _project_response(project, db)


@router.post("/{project_id}/move-to-personal")
def move_project_to_personal(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move an org project to personal."""
    project, _ = get_project_with_access(project_id, current_user, db, "owner")

    if not project.org_id:
        raise HTTPException(status_code=400, detail="Project is already personal")

    project.org_id = None
    db.commit()
    db.refresh(project)

    return _project_response(project, db)


@router.get("/{project_id}/stats", response_model=ProjectStatsResponse)
def get_project_stats(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, _ = get_project_with_access(project_id, current_user, db, "viewer")

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
