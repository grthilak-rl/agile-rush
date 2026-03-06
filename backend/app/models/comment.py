from uuid import uuid4

from sqlalchemy import String, Text, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    backlog_item_id = mapped_column(String(36), ForeignKey("backlog_items.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    author_id = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    mentions = mapped_column(JSON, default=list, nullable=True)
    edited_at = mapped_column(DateTime(timezone=True), nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    backlog_item = relationship("BacklogItem", back_populates="comments")
    project = relationship("Project")
    author = relationship("User")
