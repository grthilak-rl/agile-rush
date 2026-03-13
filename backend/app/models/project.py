import enum
from uuid import uuid4

from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProjectType(str, enum.Enum):
    contract = "contract"
    full_time = "full_time"
    one_off = "one_off"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    project_type: Mapped[str] = mapped_column(
        Enum(ProjectType, name="project_type_enum", native_enum=False), default=ProjectType.contract, nullable=False
    )
    default_sprint_duration: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    owner_id = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    org_id = mapped_column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#2563EB")
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_projects")
    backlog_items = relationship("BacklogItem", back_populates="project", cascade="all, delete-orphan")
    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="project", cascade="all, delete-orphan")
    retro_items = relationship("RetroItem", back_populates="project", cascade="all, delete-orphan")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    organization = relationship("Organization", back_populates="projects")
