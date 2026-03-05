import enum
from uuid import uuid4

from sqlalchemy import String, DateTime, ForeignKey, Enum, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ActionType(str, enum.Enum):
    created = "created"
    updated = "updated"
    moved = "moved"
    deleted = "deleted"
    completed = "completed"


class EntityType(str, enum.Enum):
    backlog_item = "backlog_item"
    sprint = "sprint"
    project = "project"
    retro_item = "retro_item"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    user_id = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(
        Enum(ActionType, name="action_type_enum", native_enum=False), nullable=False
    )
    entity_type: Mapped[str] = mapped_column(
        Enum(EntityType, name="entity_type_enum", native_enum=False), nullable=False
    )
    entity_id = mapped_column(String(36), nullable=False)
    details = mapped_column(JSON, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="activity_logs")
    user = relationship("User", back_populates="activity_logs")
