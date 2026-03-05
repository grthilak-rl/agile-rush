"""
Server-side notification creation helpers.
Notifications are created on events - the frontend only reads them.
"""

from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.models.project_member import ProjectMember, MemberStatus
from app.models.project import Project


def create_notification(
    db: Session,
    user_id: str,
    type: NotificationType,
    title: str,
    message: str,
    project_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
):
    notif = Notification(
        user_id=user_id,
        type=type.value,
        title=title,
        message=message,
        project_id=project_id,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)
    return notif


def notify_project_members(
    db: Session,
    project_id: str,
    type: NotificationType,
    title: str,
    message: str,
    exclude_user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
):
    """Send a notification to all active members + owner of a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return

    recipient_ids = set()

    # Add owner
    if project.owner_id != exclude_user_id:
        recipient_ids.add(project.owner_id)

    # Add active members
    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.status == MemberStatus.active,
        ProjectMember.user_id.isnot(None),
    ).all()

    for m in members:
        if m.user_id != exclude_user_id:
            recipient_ids.add(m.user_id)

    for uid in recipient_ids:
        create_notification(
            db=db,
            user_id=uid,
            type=type,
            title=title,
            message=message,
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
        )
