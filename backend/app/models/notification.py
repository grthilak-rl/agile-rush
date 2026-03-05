import enum
from uuid import uuid4

from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NotificationType(str, enum.Enum):
    invitation = "invitation"
    item_assigned = "item_assigned"
    item_status_changed = "item_status_changed"
    sprint_started = "sprint_started"
    sprint_ending_soon = "sprint_ending_soon"
    sprint_completed = "sprint_completed"
    mentioned = "mentioned"
    retro_started = "retro_started"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(
        Enum(NotificationType, name="notification_type_enum", native_enum=False),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    project_id = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notifications")
    project = relationship("Project")
