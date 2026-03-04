import enum
from uuid import uuid4

from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ItemType(str, enum.Enum):
    story = "story"
    task = "task"
    bug = "bug"


class Priority(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class ItemStatus(str, enum.Enum):
    backlog = "backlog"
    todo = "todo"
    in_progress = "in_progress"
    in_review = "in_review"
    done = "done"


class BacklogItem(Base):
    __tablename__ = "backlog_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    sprint_id = mapped_column(String(36), ForeignKey("sprints.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    type: Mapped[str] = mapped_column(
        Enum(ItemType, name="item_type_enum", native_enum=False), default=ItemType.story, nullable=False
    )
    priority: Mapped[str] = mapped_column(
        Enum(Priority, name="priority_enum", native_enum=False), default=Priority.medium, nullable=False
    )
    status: Mapped[str] = mapped_column(
        Enum(ItemStatus, name="item_status_enum", native_enum=False), default=ItemStatus.backlog, nullable=False
    )
    story_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    assignee_id = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    labels = mapped_column(JSON, default=list, nullable=True)
    acceptance_criteria = mapped_column(JSON, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="backlog_items")
    sprint = relationship("Sprint", back_populates="backlog_items")
    assignee = relationship("User", back_populates="assigned_items", foreign_keys=[assignee_id])
