"""
Base importer infrastructure and shared import logic.
All importers convert their source format into a normalized structure
before writing to the database.
"""

from abc import ABC, abstractmethod
from datetime import datetime, date
from typing import Any, List, Dict, Optional

from sqlalchemy.orm import Session

from app.models.backlog_item import BacklogItem, ItemType, Priority, ItemStatus
from app.models.project_member import ProjectMember, MemberStatus
from app.models.user import User


class ImportResult:
    def __init__(self):
        self.items_created: int = 0
        self.labels_found: List[str] = []
        self.errors: List[str] = []
        self.warnings: List[str] = []

    @property
    def success(self) -> bool:
        return len(self.errors) == 0

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "items_created": self.items_created,
            "labels_found": self.labels_found,
            "errors": self.errors,
            "warnings": self.warnings,
        }


class BaseImporter(ABC):
    @abstractmethod
    def parse(self, data: Any) -> Dict:
        """Parse raw data into the normalized intermediate structure."""
        pass


def parse_date_safe(date_str: Optional[str]) -> Optional[date]:
    """Parse a YYYY-MM-DD date string safely."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip()[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def find_member_by_name_or_email(
    db: Session, project_id: str, identifier: str
) -> Optional[User]:
    """Try to match an identifier (email, username, or name) to a project member."""
    if not identifier:
        return None

    identifier_lower = identifier.lower().strip()

    # Get all active members of the project
    members = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.status == MemberStatus.active,
            ProjectMember.user_id.isnot(None),
        )
        .all()
    )

    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if not user:
            continue
        # Match by email
        if user.email.lower() == identifier_lower:
            return user
        # Match by full name (case-insensitive)
        if user.full_name.lower() == identifier_lower:
            return user
        # Partial match on name or email prefix
        if identifier_lower in user.email.lower() or identifier_lower in user.full_name.lower():
            return user

    return None


VALID_TYPES = {t.value for t in ItemType}
VALID_PRIORITIES = {p.value for p in Priority}
VALID_STATUSES = {s.value for s in ItemStatus}


def import_items_to_project(
    parsed_data: dict,
    project_id: str,
    user_id: str,
    db: Session,
) -> ImportResult:
    """Import normalized data into the database. Shared by all importers."""
    result = ImportResult()

    # Get the current max position in backlog
    max_pos = (
        db.query(BacklogItem.position)
        .filter(BacklogItem.project_id == project_id)
        .order_by(BacklogItem.position.desc())
        .first()
    )
    start_position = (max_pos[0] + 1) if max_pos else 0

    for i, item_data in enumerate(parsed_data.get("items", [])):
        try:
            title = (item_data.get("title") or "").strip()[:500]
            if not title:
                result.warnings.append(f"Row {i + 1}: Skipped item with empty title")
                continue

            item_type = item_data.get("type", "task")
            if item_type not in VALID_TYPES:
                item_type = "task"

            priority = item_data.get("priority", "medium")
            if priority not in VALID_PRIORITIES:
                priority = "medium"

            status = item_data.get("status", "backlog")
            if status not in VALID_STATUSES:
                status = "backlog"

            backlog_item = BacklogItem(
                project_id=project_id,
                title=title,
                description=(item_data.get("description") or None),
                type=item_type,
                priority=priority,
                status=status,
                story_points=item_data.get("story_points"),
                labels=item_data.get("labels", []),
                due_date=parse_date_safe(item_data.get("due_date")),
                acceptance_criteria=item_data.get("acceptance_criteria") or [],
                position=start_position + i,
            )

            # Try to match assignee to existing project member
            assignee_identifier = item_data.get("assignee_email")
            if assignee_identifier:
                member = find_member_by_name_or_email(db, project_id, assignee_identifier)
                if member:
                    backlog_item.assignee_id = member.id
                else:
                    result.warnings.append(
                        f"Assignee '{assignee_identifier}' not found for '{title}'"
                    )

            db.add(backlog_item)
            result.items_created += 1

        except Exception as e:
            result.errors.append(
                f"Row {i + 1}: Failed to import '{item_data.get('title', 'unknown')}': {str(e)}"
            )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        result.errors.append(f"Database error: {str(e)}")
        result.items_created = 0

    # Collect unique labels
    result.labels_found = list(
        set(label for item in parsed_data.get("items", []) for label in item.get("labels", []) if label)
    )

    return result
