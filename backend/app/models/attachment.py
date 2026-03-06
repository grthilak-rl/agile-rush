from uuid import uuid4

from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    backlog_item_id = mapped_column(String(36), ForeignKey("backlog_items.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(255), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    backlog_item = relationship("BacklogItem", back_populates="attachments")
    uploader = relationship("User")
