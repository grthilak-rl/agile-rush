"""
Sprint deadline check utility.
Checks for sprints ending within 2 days and creates notifications.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.sprint import Sprint, SprintStatus
from app.models.notification import Notification, NotificationType
from app.models.project import Project
from app.core.notifications import notify_project_members


def check_sprint_deadlines(db: Session):
    """Check for active sprints ending within 2 days and notify members."""
    today = date.today()
    deadline = today + timedelta(days=2)

    sprints = db.query(Sprint).filter(
        Sprint.status == SprintStatus.active,
        Sprint.end_date <= deadline,
        Sprint.end_date >= today,
    ).all()

    for sprint in sprints:
        # Check if we already sent a notification for this sprint
        existing = db.query(Notification).filter(
            Notification.type == NotificationType.sprint_ending_soon.value,
            Notification.entity_type == "sprint",
            Notification.entity_id == sprint.id,
        ).first()

        if existing:
            continue

        project = db.query(Project).filter(Project.id == sprint.project_id).first()
        if not project:
            continue

        days_left = (sprint.end_date - today).days
        msg = f"{sprint.name} ends in {days_left} day{'s' if days_left != 1 else ''}"

        notify_project_members(
            db=db,
            project_id=sprint.project_id,
            type=NotificationType.sprint_ending_soon,
            title="Sprint Ending Soon",
            message=msg,
            entity_type="sprint",
            entity_id=sprint.id,
        )

    db.commit()
