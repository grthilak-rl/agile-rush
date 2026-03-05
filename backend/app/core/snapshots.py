"""Utility functions for creating and updating daily sprint snapshots."""

from datetime import date

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.sprint import Sprint, SprintStatus
from app.models.backlog_item import BacklogItem, ItemStatus
from app.models.daily_snapshot import DailySnapshot


def create_daily_snapshot(db: Session, sprint_id: str) -> DailySnapshot | None:
    """Create or update a daily snapshot for the given sprint.

    Returns the snapshot or None if the sprint is not found.
    """
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        return None

    today = date.today()

    # Calculate current state
    items = db.query(BacklogItem).filter(BacklogItem.sprint_id == sprint_id).all()
    total_points = sum(i.story_points or 0 for i in items)
    completed_points = sum(
        (i.story_points or 0) for i in items if i.status == ItemStatus.done
    )
    remaining_points = total_points - completed_points
    items_count = len(items)

    # Check if snapshot already exists for today
    existing = (
        db.query(DailySnapshot)
        .filter(DailySnapshot.sprint_id == sprint_id, DailySnapshot.date == today)
        .first()
    )

    if existing:
        existing.total_points = total_points
        existing.completed_points = completed_points
        existing.remaining_points = remaining_points
        existing.items_count = items_count
        db.flush()
        return existing
    else:
        snapshot = DailySnapshot(
            sprint_id=sprint_id,
            date=today,
            total_points=total_points,
            completed_points=completed_points,
            remaining_points=remaining_points,
            items_count=items_count,
        )
        db.add(snapshot)
        db.flush()
        return snapshot


def maybe_snapshot_active_sprint(db: Session, project_id: str) -> None:
    """If there's an active sprint for this project, create/update today's snapshot."""
    sprint = (
        db.query(Sprint)
        .filter(Sprint.project_id == project_id, Sprint.status == SprintStatus.active)
        .first()
    )
    if sprint:
        create_daily_snapshot(db, sprint.id)
