import enum
from uuid import uuid4

from sqlalchemy import String, DateTime, ForeignKey, Enum, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OrgRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"


class OrgMemberStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    removed = "removed"


class OrgMember(Base):
    __tablename__ = "org_members"

    __table_args__ = (
        UniqueConstraint("org_id", "user_id", name="uq_org_members_org_user"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    org_id = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(
        Enum(OrgRole, name="org_role_enum", native_enum=False),
        default=OrgRole.member, nullable=False,
    )
    invited_by = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(OrgMemberStatus, name="org_member_status_enum", native_enum=False),
        default=OrgMemberStatus.pending, nullable=False,
    )
    joined_at = mapped_column(DateTime(timezone=True), nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], back_populates="org_memberships")
    inviter = relationship("User", foreign_keys=[invited_by])
