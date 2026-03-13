from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.notifications import create_notification
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberStatus
from app.models.backlog_item import BacklogItem, ItemStatus
from app.models.sprint import Sprint, SprintStatus
from app.models.organization import Organization, OrgPlan, PLAN_MAX_MEMBERS, generate_slug
from app.models.org_member import OrgMember, OrgRole, OrgMemberStatus
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


# --- Schemas ---

class OrgCreate(BaseModel):
    name: str
    description: Optional[str] = None


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None


class OrgDeleteConfirm(BaseModel):
    confirm_name: str
    transfer_projects: bool = True


class OrgInviteRequest(BaseModel):
    email: EmailStr
    role: str = "member"


class OrgRoleUpdate(BaseModel):
    role: str


class OrgTransferOwnership(BaseModel):
    new_owner_id: str


# --- Helpers ---

def _ensure_unique_slug(db: Session, base_slug: str, exclude_id: str | None = None) -> str:
    slug = base_slug
    counter = 2
    while True:
        query = db.query(Organization).filter(Organization.slug == slug)
        if exclude_id:
            query = query.filter(Organization.id != exclude_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def _get_org_for_member(org_id: str, user: User, db: Session, min_role: str = "member") -> tuple:
    """Get org and verify user is an active member with min_role. Returns (org, org_member)."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    membership = db.query(OrgMember).filter(
        OrgMember.org_id == org_id,
        OrgMember.user_id == user.id,
        OrgMember.status == OrgMemberStatus.active,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Organization not found")

    role_hierarchy = {OrgRole.member: 0, OrgRole.admin: 1, OrgRole.owner: 2}
    min_role_enum = OrgRole(min_role)
    if role_hierarchy.get(OrgRole(membership.role), 0) < role_hierarchy.get(min_role_enum, 0):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return org, membership


def _org_member_response(member: OrgMember) -> dict:
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
        "org_id": member.org_id,
        "user_id": member.user_id,
        "email": member.email or (member.user.email if member.user else None),
        "role": member.role,
        "status": member.status,
        "joined_at": member.joined_at.isoformat() if member.joined_at else None,
        "created_at": member.created_at.isoformat() if member.created_at else None,
        "user": user_data,
    }


# --- Organization CRUD ---

@router.get("/")
def list_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all organizations the current user belongs to."""
    memberships = (
        db.query(OrgMember)
        .filter(
            OrgMember.user_id == current_user.id,
            OrgMember.status == OrgMemberStatus.active,
        )
        .all()
    )

    org_ids = [m.org_id for m in memberships]
    role_map = {m.org_id: m.role for m in memberships}

    if not org_ids:
        return []

    orgs = db.query(Organization).filter(Organization.id.in_(org_ids)).all()

    result = []
    for org in orgs:
        member_count = db.query(func.count(OrgMember.id)).filter(
            OrgMember.org_id == org.id,
            OrgMember.status == OrgMemberStatus.active,
        ).scalar() or 0

        project_count = db.query(func.count(Project.id)).filter(
            Project.org_id == org.id,
        ).scalar() or 0

        result.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "description": org.description,
            "logo_url": org.logo_url,
            "my_role": role_map.get(org.id, "member"),
            "member_count": member_count,
            "project_count": project_count,
            "plan": org.plan,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        })

    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_organization(
    data: OrgCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Organization name is required")

    base_slug = generate_slug(data.name.strip())
    if not base_slug:
        raise HTTPException(status_code=400, detail="Invalid organization name")

    slug = _ensure_unique_slug(db, base_slug)

    org = Organization(
        name=data.name.strip(),
        slug=slug,
        description=data.description,
        owner_id=current_user.id,
        plan=OrgPlan.free,
        max_members=PLAN_MAX_MEMBERS[OrgPlan.free],
    )
    db.add(org)
    db.flush()

    # Auto-create owner membership
    owner_member = OrgMember(
        org_id=org.id,
        user_id=current_user.id,
        role=OrgRole.owner,
        status=OrgMemberStatus.active,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(owner_member)
    db.commit()
    db.refresh(org)

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "description": org.description,
        "logo_url": org.logo_url,
        "my_role": "owner",
        "member_count": 1,
        "project_count": 0,
        "plan": org.plan,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


@router.get("/by-slug/{slug}")
def get_organization_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get organization by slug. User must be an active member."""
    org = db.query(Organization).filter(Organization.slug == slug).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    membership = db.query(OrgMember).filter(
        OrgMember.org_id == org.id,
        OrgMember.user_id == current_user.id,
        OrgMember.status == OrgMemberStatus.active,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Organization not found")

    member_count = db.query(func.count(OrgMember.id)).filter(
        OrgMember.org_id == org.id,
        OrgMember.status == OrgMemberStatus.active,
    ).scalar() or 0

    project_count = db.query(func.count(Project.id)).filter(
        Project.org_id == org.id,
    ).scalar() or 0

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "description": org.description,
        "logo_url": org.logo_url,
        "owner_id": org.owner_id,
        "my_role": membership.role,
        "member_count": member_count,
        "project_count": project_count,
        "plan": org.plan,
        "max_members": org.max_members,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


@router.get("/{org_id}")
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org, membership = _get_org_for_member(org_id, current_user, db, "member")

    member_count = db.query(func.count(OrgMember.id)).filter(
        OrgMember.org_id == org.id,
        OrgMember.status == OrgMemberStatus.active,
    ).scalar() or 0

    project_count = db.query(func.count(Project.id)).filter(
        Project.org_id == org.id,
    ).scalar() or 0

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "description": org.description,
        "logo_url": org.logo_url,
        "owner_id": org.owner_id,
        "my_role": membership.role,
        "member_count": member_count,
        "project_count": project_count,
        "plan": org.plan,
        "max_members": org.max_members,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


@router.patch("/{org_id}")
def update_organization(
    org_id: str,
    data: OrgUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org, _ = _get_org_for_member(org_id, current_user, db, "admin")

    if data.name is not None:
        if not data.name.strip():
            raise HTTPException(status_code=400, detail="Organization name cannot be empty")
        org.name = data.name.strip()
        base_slug = generate_slug(org.name)
        org.slug = _ensure_unique_slug(db, base_slug, exclude_id=org.id)

    if data.description is not None:
        org.description = data.description
    if data.logo_url is not None:
        org.logo_url = data.logo_url

    db.commit()
    db.refresh(org)

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "description": org.description,
        "logo_url": org.logo_url,
        "owner_id": org.owner_id,
        "plan": org.plan,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


@router.delete("/{org_id}")
def delete_organization(
    org_id: str,
    data: OrgDeleteConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org, _ = _get_org_for_member(org_id, current_user, db, "owner")

    if data.confirm_name != org.name:
        raise HTTPException(status_code=400, detail="Organization name does not match")

    # Handle org projects
    org_projects = db.query(Project).filter(Project.org_id == org.id).all()
    projects_transferred = 0

    if data.transfer_projects:
        # Transfer to org owner as personal projects
        for p in org_projects:
            p.org_id = None
            projects_transferred += 1
    else:
        # Delete all org projects (cascade will handle sub-entities)
        for p in org_projects:
            db.delete(p)

    # Delete all org members
    db.query(OrgMember).filter(OrgMember.org_id == org.id).delete()

    db.delete(org)
    db.commit()

    return {"message": "Organization deleted", "projects_transferred": projects_transferred}


# --- Member Management ---

@router.get("/{org_id}/members")
def list_org_members(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_org_for_member(org_id, current_user, db, "member")

    members = (
        db.query(OrgMember)
        .options(joinedload(OrgMember.user))
        .filter(
            OrgMember.org_id == org_id,
            OrgMember.status.in_([OrgMemberStatus.active, OrgMemberStatus.pending]),
        )
        .all()
    )

    return [_org_member_response(m) for m in members]


@router.post("/{org_id}/members/invite")
def invite_org_member(
    org_id: str,
    data: OrgInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org, _ = _get_org_for_member(org_id, current_user, db, "admin")

    if data.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be admin or member.")

    # Check member limit
    active_count = db.query(func.count(OrgMember.id)).filter(
        OrgMember.org_id == org_id,
        OrgMember.status == OrgMemberStatus.active,
    ).scalar() or 0

    if active_count >= org.max_members:
        raise HTTPException(
            status_code=400,
            detail=f"Organization has reached its member limit ({org.max_members}). Upgrade your plan.",
        )

    # Check if already in the org
    target_user = db.query(User).filter(User.email == data.email).first()

    existing = db.query(OrgMember).filter(
        OrgMember.org_id == org_id,
        OrgMember.status.in_([OrgMemberStatus.active, OrgMemberStatus.pending]),
    )
    if target_user:
        existing = existing.filter(OrgMember.user_id == target_user.id)
    else:
        existing = existing.filter(OrgMember.email == data.email)

    if existing.first():
        raise HTTPException(status_code=400, detail="This user is already in the organization")

    member = OrgMember(
        org_id=org_id,
        user_id=target_user.id if target_user else None,
        email=data.email if not target_user else None,
        role=OrgRole(data.role),
        invited_by=current_user.id,
        status=OrgMemberStatus.pending,
    )
    db.add(member)
    db.flush()

    response_status = "invited"
    if target_user:
        create_notification(
            db=db,
            user_id=target_user.id,
            type=NotificationType.invitation,
            title="Organization Invitation",
            message=f"{current_user.full_name} invited you to join {org.name}",
            entity_type="organization",
            entity_id=org.id,
        )
    else:
        response_status = "invited_external"

    db.commit()
    db.refresh(member)

    if member.user_id:
        member = (
            db.query(OrgMember)
            .options(joinedload(OrgMember.user))
            .filter(OrgMember.id == member.id)
            .first()
        )

    return {"member": _org_member_response(member), "status": response_status}


@router.post("/{org_id}/members/accept")
def accept_org_invitation(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(OrgMember).filter(
        OrgMember.org_id == org_id,
        OrgMember.user_id == current_user.id,
        OrgMember.status == OrgMemberStatus.pending,
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="No pending invitation found")

    member.status = OrgMemberStatus.active
    member.joined_at = datetime.now(timezone.utc)

    # Notify org owner
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if org:
        create_notification(
            db=db,
            user_id=org.owner_id,
            type=NotificationType.invitation,
            title="Member Joined",
            message=f"{current_user.full_name} joined {org.name}",
            entity_type="organization",
            entity_id=org.id,
        )

    db.commit()
    db.refresh(member)

    member = (
        db.query(OrgMember)
        .options(joinedload(OrgMember.user))
        .filter(OrgMember.id == member.id)
        .first()
    )
    return _org_member_response(member)


@router.post("/{org_id}/members/decline")
def decline_org_invitation(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(OrgMember).filter(
        OrgMember.org_id == org_id,
        OrgMember.user_id == current_user.id,
        OrgMember.status == OrgMemberStatus.pending,
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="No pending invitation found")

    member.status = OrgMemberStatus.removed
    db.commit()
    return {"message": "Invitation declined"}


@router.patch("/{org_id}/members/{member_id}")
def update_org_member_role(
    org_id: str,
    member_id: str,
    data: OrgRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_org_for_member(org_id, current_user, db, "admin")

    if data.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Invalid role")

    member = db.query(OrgMember).filter(
        OrgMember.id == member_id,
        OrgMember.org_id == org_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Cannot change owner's role
    if member.role == OrgRole.owner.value:
        raise HTTPException(status_code=400, detail="Cannot change the owner's role")

    # Cannot change your own role
    if member.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    member.role = OrgRole(data.role)
    db.commit()
    db.refresh(member)

    member = (
        db.query(OrgMember)
        .options(joinedload(OrgMember.user))
        .filter(OrgMember.id == member.id)
        .first()
    )
    return _org_member_response(member)


@router.delete("/{org_id}/members/{member_id}")
def remove_org_member(
    org_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org, caller_membership = _get_org_for_member(org_id, current_user, db, "member")

    member = db.query(OrgMember).filter(
        OrgMember.id == member_id,
        OrgMember.org_id == org_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Cannot remove the owner
    if member.role == OrgRole.owner.value:
        raise HTTPException(status_code=400, detail="Cannot remove the organization owner")

    # Allow: admin/owner removing anyone, or member removing themselves
    is_self = member.user_id == current_user.id
    if not is_self and caller_membership.role not in (OrgRole.owner.value, OrgRole.admin.value):
        raise HTTPException(status_code=403, detail="You don't have permission to remove members")

    member.status = OrgMemberStatus.removed
    db.commit()
    return {"message": "Member removed"}


@router.post("/{org_id}/members/transfer-ownership")
def transfer_org_ownership(
    org_id: str,
    data: OrgTransferOwnership,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org, _ = _get_org_for_member(org_id, current_user, db, "owner")

    new_owner_membership = db.query(OrgMember).filter(
        OrgMember.org_id == org_id,
        OrgMember.user_id == data.new_owner_id,
        OrgMember.status == OrgMemberStatus.active,
    ).first()
    if not new_owner_membership:
        raise HTTPException(status_code=400, detail="New owner must be an active organization member")

    # Transfer
    current_owner_membership = db.query(OrgMember).filter(
        OrgMember.org_id == org_id,
        OrgMember.user_id == current_user.id,
        OrgMember.status == OrgMemberStatus.active,
    ).first()

    new_owner_membership.role = OrgRole.owner
    if current_owner_membership:
        current_owner_membership.role = OrgRole.admin
    org.owner_id = data.new_owner_id

    db.commit()
    return {"message": "Ownership transferred"}


# --- Organization Projects ---

@router.get("/{org_id}/projects")
def list_org_projects(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_org_for_member(org_id, current_user, db, "member")

    projects = db.query(Project).filter(Project.org_id == org_id).all()

    result = []
    for p in projects:
        total_items = db.query(func.count(BacklogItem.id)).filter(
            BacklogItem.project_id == p.id
        ).scalar() or 0

        completed_items = db.query(func.count(BacklogItem.id)).filter(
            BacklogItem.project_id == p.id,
            BacklogItem.status == ItemStatus.done,
        ).scalar() or 0

        active_sprint = db.query(Sprint).filter(
            Sprint.project_id == p.id,
            Sprint.status == SprintStatus.active,
        ).first()

        progress = (completed_items / total_items * 100) if total_items > 0 else 0.0

        result.append({
            "id": p.id,
            "name": p.name,
            "client_name": p.client_name,
            "description": p.description,
            "project_type": p.project_type,
            "color": p.color,
            "owner_id": p.owner_id,
            "org_id": p.org_id,
            "active_sprint_name": active_sprint.name if active_sprint else None,
            "total_items": total_items,
            "completed_items": completed_items,
            "progress_percentage": round(progress, 1),
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })

    return result


@router.post("/{org_id}/projects", status_code=status.HTTP_201_CREATED)
def create_org_project(
    org_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a project within an organization. Only admin/owner can create."""
    _get_org_for_member(org_id, current_user, db, "admin")

    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")

    from app.models.project import ProjectType
    PRESET_COLORS = [
        "#2563EB", "#10B981", "#F97316", "#8B5CF6",
        "#F43F5E", "#EAB308", "#06B6D4", "#EC4899",
    ]
    existing_count = db.query(func.count(Project.id)).filter(
        Project.org_id == org_id
    ).scalar() or 0
    color = PRESET_COLORS[existing_count % len(PRESET_COLORS)]

    project = Project(
        name=name,
        client_name=data.get("client_name"),
        description=data.get("description"),
        project_type=data.get("project_type", "contract"),
        default_sprint_duration=data.get("default_sprint_duration", 2),
        owner_id=current_user.id,
        org_id=org_id,
        color=color,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "name": project.name,
        "client_name": project.client_name,
        "description": project.description,
        "project_type": project.project_type,
        "default_sprint_duration": project.default_sprint_duration,
        "owner_id": project.owner_id,
        "org_id": project.org_id,
        "color": project.color,
        "active_sprint_name": None,
        "total_items": 0,
        "completed_items": 0,
        "progress_percentage": 0.0,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
    }
