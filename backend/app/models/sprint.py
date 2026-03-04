import enum
from uuid import uuid4

from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SprintStatus(str, enum.Enum):
    planning = "planning"
    active = "active"
    completed = "completed"


class Sprint(Base):
    __tablename__ = "sprints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    goal: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    sprint_number: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_weeks: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    start_date = mapped_column(Date, nullable=True)
    end_date = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(SprintStatus, name="sprint_status_enum", native_enum=False), default=SprintStatus.planning, nullable=False
    )
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="sprints")
    backlog_items = relationship("BacklogItem", back_populates="sprint")
