import enum
from uuid import uuid4

from sqlalchemy import String, Boolean, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

DEFAULT_EMAIL_NOTIFICATIONS = {
    "item_assigned": True,
    "mentioned": True,
    "sprint_events": True,
    "due_dates": True,
    "comments": True,
    "invitations": True,
}


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    email_notifications = mapped_column(JSON, default=lambda: DEFAULT_EMAIL_NOTIFICATIONS.copy(), nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owned_projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    assigned_items = relationship("BacklogItem", back_populates="assignee", foreign_keys="BacklogItem.assignee_id")
    activity_logs = relationship("ActivityLog", back_populates="user")
    retro_items = relationship("RetroItem", back_populates="creator")
    memberships = relationship("ProjectMember", back_populates="user", foreign_keys="ProjectMember.user_id")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    owned_organizations = relationship("Organization", back_populates="owner")
    org_memberships = relationship("OrgMember", back_populates="user", foreign_keys="OrgMember.user_id")
