from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_project_with_access
from app.core.notifications import create_notification
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberRole, MemberStatus
from app.models.org_member import OrgMember, OrgRole, OrgMemberStatus
from app.models.backlog_item import BacklogItem
from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/projects", tags=["members"])


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "member"


class AddMemberRequest(BaseModel):
    user_id: str
    role: str = "member"


class RoleUpdateRequest(BaseModel):
    role: str


class TransferOwnershipRequest(BaseModel):
    new_owner_id: str


def _ensure_org_membership(db: Session, project: Project, user_id: str, invited_by: str = None):
    """If the project belongs to an org, ensure the user is also an org member.
    Adds them as a 'member' role if they aren't already in the org."""
    if not project.org_id or not user_id:
        return

    existing = db.query(OrgMember).filter(
        OrgMember.org_id == project.org_id,
        OrgMember.user_id == user_id,
        OrgMember.status.in_([OrgMemberStatus.active, OrgMemberStatus.pending]),
    ).first()

    if existing:
        return  # Already in the org

    org_member = OrgMember(
        org_id=project.org_id,
        user_id=user_id,
        role=OrgRole.member,
        status=OrgMemberStatus.active,
        invited_by=invited_by,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(org_member)


def _member_response(member: ProjectMember) -> dict:
    user_data = None
    if member.user:
        user_data = {
            "id": member.user.id,
            "email": member.user.email,
            "full_name": member.user.full_name,
            "avatar_url": member.user.avatar_url,
        }
    return {
        "id": member.id,
        "project_id": member.project_id,
        "user_id": member.user_id,
        "email": member.email or (member.user.email if member.user else None),
        "role": member.role,
        "status": member.status,
        "invited_at": member.invited_at.isoformat() if member.invited_at else None,
        "joined_at": member.joined_at.isoformat() if member.joined_at else None,
        "user": user_data,
    }


@router.get("/{project_id}/members/search")
def search_members(
    project_id: str,
    q: str = Query("", min_length=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search active project members by name or email for @mention autocomplete."""
    get_project_with_access(project_id, current_user, db, "viewer")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return []

    # Get all active member user IDs + owner
    member_user_ids = set()
    member_user_ids.add(project.owner_id)

    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.status == MemberStatus.active,
        ProjectMember.user_id.isnot(None),
    ).all()
    for m in members:
        member_user_ids.add(m.user_id)

    # Search users in this set
    query = db.query(User).filter(User.id.in_(member_user_ids))

    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_term),
                User.email.ilike(search_term),
            )
        )

    users = query.limit(5).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "avatar_url": u.avatar_url,
        }
        for u in users
    ]


@router.get("/{project_id}/members/search-users")
def search_users_to_add(
    project_id: str,
    q: str = Query("", min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search registered users who are NOT already members of this project."""
    get_project_with_access(project_id, current_user, db, "admin")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get IDs of existing members (active or pending) + owner
    existing_ids = {project.owner_id}
    existing_members = db.query(ProjectMember.user_id).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.status.in_([MemberStatus.active, MemberStatus.pending]),
        ProjectMember.user_id.isnot(None),
    ).all()
    for (uid,) in existing_members:
        existing_ids.add(uid)

    search_term = f"%{q}%"
    users = (
        db.query(User)
        .filter(
            User.id.notin_(existing_ids),
            or_(
                User.full_name.ilike(search_term),
                User.email.ilike(search_term),
            ),
        )
        .limit(10)
        .all()
    )
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "avatar_url": u.avatar_url,
        }
        for u in users
    ]


@router.post("/{project_id}/members/add")
def add_member(
    project_id: str,
    data: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Directly add a registered user to the project (admin/owner only)."""
    project, _ = get_project_with_access(project_id, current_user, db, "admin")

    if data.role not in ("admin", "member", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be admin, member, or viewer.",
        )

    # Check user exists
    target_user = db.query(User).filter(User.id == data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already owner
    if target_user.id == project.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already the project owner",
        )

    # Check if already a member
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == data.user_id,
        ProjectMember.status.in_([MemberStatus.active, MemberStatus.pending]),
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already on the project",
        )

    member = ProjectMember(
        project_id=project_id,
        user_id=target_user.id,
        role=MemberRole(data.role),
        invited_by=current_user.id,
        status=MemberStatus.active,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(member)

    # Auto-add to org if this is an org project
    _ensure_org_membership(db, project, target_user.id, invited_by=current_user.id)

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.created,
        entity_type=EntityType.project,
        entity_id=project_id,
        details={"action": "member_added", "user_name": target_user.full_name},
    )
    db.add(log)

    # Notify the added user
    create_notification(
        db=db,
        user_id=target_user.id,
        type=NotificationType.invitation,
        title="Added to Project",
        message=f"{current_user.full_name} added you to {project.name}",
        project_id=project_id,
        entity_type="project",
        entity_id=project_id,
    )

    db.commit()
    db.refresh(member)

    member = (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(ProjectMember.id == member.id)
        .first()
    )
    return {"member": _member_response(member), "status": "added"}


@router.get("/{project_id}/members")
def list_members(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, _ = get_project_with_access(project_id, current_user, db, "viewer")

    members = (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.status.in_([MemberStatus.active, MemberStatus.pending]),
        )
        .all()
    )

    # Build owner entry
    owner = db.query(User).filter(User.id == project.owner_id).first()
    owner_entry = {
        "id": "owner",
        "project_id": project_id,
        "user_id": owner.id,
        "email": owner.email,
        "role": "owner",
        "status": "active",
        "invited_at": None,
        "joined_at": None,
        "user": {
            "id": owner.id,
            "email": owner.email,
            "full_name": owner.full_name,
            "avatar_url": owner.avatar_url,
        },
    }

    result = [owner_entry] + [_member_response(m) for m in members]
    return result


@router.post("/{project_id}/members/invite")
def invite_member(
    project_id: str,
    data: InviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, _ = get_project_with_access(project_id, current_user, db, "admin")

    if data.role not in ("admin", "member", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be admin, member, or viewer.",
        )

    # Check if already a member or owner
    if data.email == db.query(User).filter(User.id == project.owner_id).first().email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already the project owner",
        )

    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.status.in_([MemberStatus.active, MemberStatus.pending]),
    ).join(User, ProjectMember.user_id == User.id, isouter=True).filter(
        (User.email == data.email) | (ProjectMember.email == data.email)
    ).first()

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already on the project",
        )

    # Check if user exists in the system
    target_user = db.query(User).filter(User.email == data.email).first()

    member = ProjectMember(
        project_id=project_id,
        user_id=target_user.id if target_user else None,
        email=data.email if not target_user else None,
        role=MemberRole(data.role),
        invited_by=current_user.id,
        status=MemberStatus.pending,
    )
    db.add(member)
    db.flush()

    response_status = "invited"
    if target_user:
        # Create notification for the invited user
        create_notification(
            db=db,
            user_id=target_user.id,
            type=NotificationType.invitation,
            title="Project Invitation",
            message=f"{current_user.full_name} invited you to {project.name}",
            project_id=project_id,
            entity_type="project",
            entity_id=project_id,
        )
    else:
        response_status = "invited_external"

    db.commit()
    db.refresh(member)

    if member.user_id:
        member = (
            db.query(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .filter(ProjectMember.id == member.id)
            .first()
        )

    return {"member": _member_response(member), "status": response_status}


@router.post("/{project_id}/members/accept")
def accept_invitation(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
        ProjectMember.status == MemberStatus.pending,
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending invitation found",
        )

    member.status = MemberStatus.active
    member.joined_at = datetime.now(timezone.utc)

    # Auto-add to org if this is an org project
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        _ensure_org_membership(db, project, current_user.id, invited_by=member.invited_by)

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.created,
        entity_type=EntityType.project,
        entity_id=project_id,
        details={"action": "joined", "user_name": current_user.full_name},
    )
    db.add(log)

    db.commit()
    db.refresh(member)

    member = (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(ProjectMember.id == member.id)
        .first()
    )
    return _member_response(member)


@router.patch("/{project_id}/members/{member_id}")
def update_member_role(
    project_id: str,
    member_id: str,
    data: RoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, _ = get_project_with_access(project_id, current_user, db, "admin")

    if data.role not in ("admin", "member", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role",
        )

    member = db.query(ProjectMember).filter(
        ProjectMember.id == member_id,
        ProjectMember.project_id == project_id,
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Cannot change your own role
    if member.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )

    member.role = MemberRole(data.role)
    db.commit()
    db.refresh(member)

    member = (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(ProjectMember.id == member.id)
        .first()
    )
    return _member_response(member)


@router.delete("/{project_id}/members/{member_id}")
def remove_member(
    project_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, role = get_project_with_access(project_id, current_user, db, "viewer")

    member = db.query(ProjectMember).filter(
        ProjectMember.id == member_id,
        ProjectMember.project_id == project_id,
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Allow: owner/admin removing anyone, or member removing themselves
    is_self = member.user_id == current_user.id
    if not is_self and role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to remove members",
        )

    member.status = MemberStatus.removed

    # Unassign all items assigned to this user in this project
    items_unassigned = 0
    if member.user_id:
        items = db.query(BacklogItem).filter(
            BacklogItem.project_id == project_id,
            BacklogItem.assignee_id == member.user_id,
        ).all()
        items_unassigned = len(items)
        for item in items:
            item.assignee_id = None

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.deleted,
        entity_type=EntityType.project,
        entity_id=project_id,
        details={"action": "member_removed", "member_id": member_id},
    )
    db.add(log)

    db.commit()
    return {"message": "Member removed", "items_unassigned": items_unassigned}


@router.post("/{project_id}/members/transfer-ownership")
def transfer_ownership(
    project_id: str,
    data: TransferOwnershipRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, _ = get_project_with_access(project_id, current_user, db, "owner")

    new_owner = db.query(User).filter(User.id == data.new_owner_id).first()
    if not new_owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Verify new owner is an active member
    new_owner_membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == data.new_owner_id,
        ProjectMember.status == MemberStatus.active,
    ).first()
    if not new_owner_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New owner must be an active project member",
        )

    # Transfer ownership
    project.owner_id = data.new_owner_id

    # Remove the new owner's membership (they're now the owner)
    db.delete(new_owner_membership)

    # Add the old owner as admin member
    old_owner_member = ProjectMember(
        project_id=project_id,
        user_id=current_user.id,
        role=MemberRole.admin,
        status=MemberStatus.active,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(old_owner_member)

    db.commit()
    return {"message": "Ownership transferred"}


@router.post("/{project_id}/members/request-join")
def request_join(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """User requests to join a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if already owner
    if current_user.id == project.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already the project owner",
        )

    # Check if already a member or has pending request
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
        ProjectMember.status.in_([MemberStatus.active, MemberStatus.pending]),
    ).first()
    if existing:
        if existing.status == MemberStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have a pending request for this project",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this project",
        )

    member = ProjectMember(
        project_id=project_id,
        user_id=current_user.id,
        role=MemberRole.member,
        status=MemberStatus.pending,
    )
    db.add(member)

    # Notify the project owner
    create_notification(
        db=db,
        user_id=project.owner_id,
        type=NotificationType.invitation,
        title="Join Request",
        message=f"{current_user.full_name} wants to join {project.name}",
        project_id=project_id,
        entity_type="project",
        entity_id=project_id,
    )

    db.commit()
    db.refresh(member)
    return {"message": "Join request sent", "status": "pending"}


@router.get("/{project_id}/members/join-requests")
def list_join_requests(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List pending join requests for a project (admin/owner only)."""
    get_project_with_access(project_id, current_user, db, "admin")

    requests = (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.status == MemberStatus.pending,
            ProjectMember.invited_by.is_(None),  # No inviter = join request
        )
        .all()
    )
    return [_member_response(r) for r in requests]


@router.post("/{project_id}/members/{member_id}/approve")
def approve_join_request(
    project_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a pending join request (admin/owner only)."""
    project, _ = get_project_with_access(project_id, current_user, db, "admin")

    member = db.query(ProjectMember).filter(
        ProjectMember.id == member_id,
        ProjectMember.project_id == project_id,
        ProjectMember.status == MemberStatus.pending,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Pending request not found")

    member.status = MemberStatus.active
    member.joined_at = datetime.now(timezone.utc)

    # Auto-add to org if this is an org project
    _ensure_org_membership(db, project, member.user_id, invited_by=current_user.id)

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.created,
        entity_type=EntityType.project,
        entity_id=project_id,
        details={"action": "member_approved", "user_name": member.user.full_name if member.user else ""},
    )
    db.add(log)

    # Notify the requester
    if member.user_id:
        create_notification(
            db=db,
            user_id=member.user_id,
            type=NotificationType.invitation,
            title="Request Approved",
            message=f"Your request to join {project.name} has been approved",
            project_id=project_id,
            entity_type="project",
            entity_id=project_id,
        )

    db.commit()
    db.refresh(member)
    member = (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(ProjectMember.id == member.id)
        .first()
    )
    return _member_response(member)


@router.post("/{project_id}/members/{member_id}/deny")
def deny_join_request(
    project_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deny a pending join request (admin/owner only)."""
    project, _ = get_project_with_access(project_id, current_user, db, "admin")

    member = db.query(ProjectMember).filter(
        ProjectMember.id == member_id,
        ProjectMember.project_id == project_id,
        ProjectMember.status == MemberStatus.pending,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Pending request not found")

    member.status = MemberStatus.removed

    # Notify the requester
    if member.user_id:
        create_notification(
            db=db,
            user_id=member.user_id,
            type=NotificationType.invitation,
            title="Request Denied",
            message=f"Your request to join {project.name} was not approved",
            project_id=project_id,
            entity_type="project",
            entity_id=project_id,
        )

    db.commit()
    return {"message": "Join request denied"}


@router.post("/{project_id}/members/withdraw-request")
def withdraw_join_request(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Withdraw your own pending join request."""
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
        ProjectMember.status == MemberStatus.pending,
        ProjectMember.invited_by.is_(None),  # Only self-initiated requests
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="No pending request found")

    member.status = MemberStatus.removed
    db.commit()
    return {"message": "Join request withdrawn"}
