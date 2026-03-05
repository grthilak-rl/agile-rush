from uuid import uuid4

from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DailySnapshot(Base):
    __tablename__ = "daily_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    sprint_id = mapped_column(String(36), ForeignKey("sprints.id"), nullable=False)
    date = mapped_column(Date, nullable=False)
    total_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    remaining_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    sprint = relationship("Sprint", backref="daily_snapshots")
