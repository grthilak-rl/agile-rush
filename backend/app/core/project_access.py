"""
Reusable project access dependency.
Checks user is owner, active ProjectMember, or org member with sufficient role.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_member import ProjectMember, MemberRole, MemberStatus
from app.models.org_member import OrgMember, OrgRole, OrgMemberStatus
from app.models.user import User

ROLE_HIERARCHY = {
    MemberRole.viewer: 0,
    MemberRole.member: 1,
    MemberRole.admin: 2,
    MemberRole.owner: 3,
}


def get_project_with_access(
    project_id: str,
    user: User,
    db: Session,
    min_role: str = "viewer",
) -> tuple:
    """
    Check if user has access to a project with at least min_role.
    Returns (project, user_role_str).
    Raises 404 if no access, 403 if insufficient role.

    Access is granted if:
    1. User is the project owner
    2. User is a direct project member (active)
    3. User is an active org member (if project belongs to an org)
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Check if user is owner
    if project.owner_id == user.id:
        user_role = MemberRole.owner
    else:
        # Check direct project membership
        membership = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
            ProjectMember.status == MemberStatus.active,
        ).first()
        if membership:
            user_role = MemberRole(membership.role)
        elif project.org_id:
            # Check org membership
            org_member = db.query(OrgMember).filter(
                OrgMember.org_id == project.org_id,
                OrgMember.user_id == user.id,
                OrgMember.status == OrgMemberStatus.active,
            ).first()
            if org_member:
                # Map org role to project role for access
                if org_member.role in (OrgRole.owner, OrgRole.admin):
                    user_role = MemberRole.admin
                else:
                    user_role = MemberRole.member
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

    min_role_enum = MemberRole(min_role)
    if ROLE_HIERARCHY.get(user_role, 0) < ROLE_HIERARCHY.get(min_role_enum, 0):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission",
        )

    return project, user_role.value


def get_user_role(project_id: str, user: User, db: Session) -> str | None:
    """Get user's role in a project, or None if no access."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return None
    if project.owner_id == user.id:
        return MemberRole.owner.value
    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id,
        ProjectMember.status == MemberStatus.active,
    ).first()
    if membership:
        return membership.role
    # Check org membership
    if project.org_id:
        org_member = db.query(OrgMember).filter(
            OrgMember.org_id == project.org_id,
            OrgMember.user_id == user.id,
            OrgMember.status == OrgMemberStatus.active,
        ).first()
        if org_member:
            if org_member.role in (OrgRole.owner, OrgRole.admin):
                return MemberRole.admin.value
            return MemberRole.member.value
    return None


def get_accessible_project_ids(user: User, db: Session) -> list[str]:
    """Get all project IDs the user has access to (owner, active member, or org member)."""
    owned = db.query(Project.id).filter(Project.owner_id == user.id).all()
    member_of = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == user.id,
        ProjectMember.status == MemberStatus.active,
    ).all()

    # Org projects: get all orgs user belongs to, then all projects in those orgs
    user_org_ids = db.query(OrgMember.org_id).filter(
        OrgMember.user_id == user.id,
        OrgMember.status == OrgMemberStatus.active,
    ).all()
    org_ids = [o.org_id for o in user_org_ids]

    org_project_ids = []
    if org_ids:
        org_projects = db.query(Project.id).filter(
            Project.org_id.in_(org_ids)
        ).all()
        org_project_ids = [p.id for p in org_projects]

    return list(set(
        [p.id for p in owned]
        + [m.project_id for m in member_of]
        + org_project_ids
    ))
