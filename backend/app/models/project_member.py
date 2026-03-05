import enum
from uuid import uuid4

from sqlalchemy import String, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MemberRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    viewer = "viewer"


class MemberStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    removed = "removed"


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(
        Enum(MemberRole, name="member_role_enum", native_enum=False),
        default=MemberRole.member, nullable=False,
    )
    invited_by = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    invited_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    joined_at = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(MemberStatus, name="member_status_enum", native_enum=False),
        default=MemberStatus.pending, nullable=False,
    )
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], back_populates="memberships")
    inviter = relationship("User", foreign_keys=[invited_by])
