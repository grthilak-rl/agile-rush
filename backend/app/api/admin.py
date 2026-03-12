import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_admin_user
from app.core.security import hash_password
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.backlog_item import BacklogItem

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def get_admin_stats(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    total_users = db.query(func.count(User.id)).scalar()
    total_projects = db.query(func.count(Project.id)).scalar()
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_users_this_week = db.query(func.count(User.id)).filter(
        User.created_at >= one_week_ago
    ).scalar()

    return {
        "total_users": total_users,
        "total_projects": total_projects,
        "new_users_this_week": new_users_this_week,
    }


@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: str = Query(None),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if q:
        search = f"%{q}%"
        query = query.filter(
            (User.email.ilike(search)) | (User.full_name.ilike(search))
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    results = []
    for user in users:
        project_count = db.query(func.count(Project.id)).filter(
            Project.owner_id == user.id
        ).scalar()
        results.append({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "is_admin": user.is_admin,
            "is_disabled": user.is_disabled,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "project_count": project_count,
        })

    return {
        "users": results,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.patch("/users/{user_id}/disable")
def disable_user(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot disable yourself",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_disabled = True
    db.commit()
    return {"message": f"User {user.email} has been disabled"}


@router.patch("/users/{user_id}/enable")
def enable_user(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_disabled = False
    db.commit()
    return {"message": f"User {user.email} has been enabled"}


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_password = secrets.token_urlsafe(12)
    user.hashed_password = hash_password(temp_password)
    db.commit()

    return {
        "message": f"Password reset for {user.email}",
        "temporary_password": temp_password,
    }


@router.patch("/users/{user_id}/toggle-admin")
def toggle_admin(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own admin status",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_admin = not user.is_admin
    db.commit()

    return {
        "message": f"User {user.email} admin status set to {user.is_admin}",
        "is_admin": user.is_admin,
    }


@router.get("/projects")
def list_projects(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: str = Query(None),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(Project)
    if q:
        search = f"%{q}%"
        query = query.filter(
            (Project.name.ilike(search)) | (Project.client_name.ilike(search))
        )

    total = query.count()
    projects = query.order_by(Project.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    results = []
    for project in projects:
        owner = db.query(User).filter(User.id == project.owner_id).first()
        member_count = db.query(func.count(ProjectMember.id)).filter(
            ProjectMember.project_id == project.id
        ).scalar()
        item_count = db.query(func.count(BacklogItem.id)).filter(
            BacklogItem.project_id == project.id
        ).scalar()
        results.append({
            "id": project.id,
            "name": project.name,
            "client_name": project.client_name,
            "description": project.description,
            "project_type": project.project_type,
            "owner_name": owner.full_name if owner else None,
            "owner_email": owner.email if owner else None,
            "member_count": member_count,
            "item_count": item_count,
            "created_at": project.created_at.isoformat() if project.created_at else None,
        })

    return {
        "projects": results,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.delete("/projects/{project_id}")
def delete_project(
    project_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_name = project.name
    db.delete(project)
    db.commit()

    return {"message": f"Project '{project_name}' has been deleted"}
