import enum
import re
from uuid import uuid4

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OrgPlan(str, enum.Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


PLAN_MAX_MEMBERS = {
    OrgPlan.free: 5,
    OrgPlan.pro: 50,
    OrgPlan.enterprise: 999999,
}


def generate_slug(name: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return slug


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    owner_id = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    plan: Mapped[str] = mapped_column(
        Enum(OrgPlan, name="org_plan_enum", native_enum=False),
        default=OrgPlan.free, nullable=False,
    )
    max_members: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_organizations")
    members = relationship("OrgMember", back_populates="organization", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="organization")
