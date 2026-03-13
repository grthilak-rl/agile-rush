from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.core.notifications import create_notification
from app.models.user import User
from app.models.organization import Organization
from app.models.org_member import OrgMember, OrgMemberStatus
from app.models.project_member import ProjectMember, MemberStatus
from app.models.project import Project
from app.models.notification import NotificationType
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
    )
    db.add(user)
    db.flush()

    # Auto-link pending org invitations by email
    pending_org_invites = db.query(OrgMember).filter(
        OrgMember.email == user_data.email,
        OrgMember.status == OrgMemberStatus.pending,
        OrgMember.user_id == None,  # noqa: E711
    ).all()

    for invite in pending_org_invites:
        invite.user_id = user.id
        org = db.query(Organization).filter(Organization.id == invite.org_id).first()
        org_name = org.name if org else "an organization"
        create_notification(
            db=db,
            user_id=user.id,
            type=NotificationType.invitation,
            title="Organization Invitation",
            message=f"You've been invited to join {org_name}",
            entity_type="organization",
            entity_id=invite.org_id,
        )

    # Auto-link pending project invitations by email
    pending_project_invites = db.query(ProjectMember).filter(
        ProjectMember.email == user_data.email,
        ProjectMember.status == MemberStatus.pending,
        ProjectMember.user_id == None,  # noqa: E711
    ).all()

    for invite in pending_project_invites:
        invite.user_id = user.id
        proj = db.query(Project).filter(Project.id == invite.project_id).first()
        proj_name = proj.name if proj else "a project"
        create_notification(
            db=db,
            user_id=user.id,
            type=NotificationType.invitation,
            title="Project Invitation",
            message=f"You've been invited to {proj_name}",
            project_id=invite.project_id,
            entity_type="project",
            entity_id=invite.project_id,
        )

    db.commit()
    db.refresh(user)

    access_token = create_access_token(str(user.id), user.full_name)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(str(user.id), user.full_name)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
def logout():
    return {"message": "Successfully logged out"}


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_resp = UserResponse.model_validate(current_user)
    user_dict = user_resp.model_dump()

    # Add organizations
    memberships = db.query(OrgMember).filter(
        OrgMember.user_id == current_user.id,
        OrgMember.status == OrgMemberStatus.active,
    ).all()

    orgs = []
    for m in memberships:
        org = db.query(Organization).filter(Organization.id == m.org_id).first()
        if org:
            orgs.append({
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "role": m.role,
            })

    user_dict["organizations"] = orgs
    return user_dict
