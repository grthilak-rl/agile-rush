import enum
from uuid import uuid4

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Enum, Text, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RetroColumn(str, enum.Enum):
    went_well = "went_well"
    didnt_go_well = "didnt_go_well"
    action_item = "action_item"


class RetroItem(Base):
    __tablename__ = "retro_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    sprint_id = mapped_column(String(36), ForeignKey("sprints.id"), nullable=False)
    project_id = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    column: Mapped[str] = mapped_column(
        Enum(RetroColumn, name="retro_column_enum", native_enum=False), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    votes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    voted_by = mapped_column(JSON, default=list, nullable=False)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    sprint = relationship("Sprint", back_populates="retro_items")
    project = relationship("Project", back_populates="retro_items")
    creator = relationship("User", back_populates="retro_items")
