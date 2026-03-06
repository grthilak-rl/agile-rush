from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_project_with_access
from app.core.notifications import create_notification
from app.models.user import User
from app.models.backlog_item import BacklogItem, ItemType, Priority, ItemStatus
from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.models.notification import Notification, NotificationType
from app.schemas.backlog_item import (
    BacklogItemCreate,
    BacklogItemUpdate,
    BacklogItemResponse,
    ReorderRequest,
)
from app.core.snapshots import maybe_snapshot_active_sprint

router = APIRouter(prefix="/api/projects", tags=["backlog"])


def create_activity(
    db: Session,
    project_id: str,
    user_id: str,
    action: ActionType,
    entity_type: EntityType,
    entity_id: str,
    details: dict = None,
):
    log = ActivityLog(
        project_id=project_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(log)


def check_due_date_notifications(db: Session, item: BacklogItem):
    """Check and create due date notifications if needed."""
    if not item.due_date or not item.assignee_id or item.status == ItemStatus.done:
        return

    today = date.today()
    tomorrow = today + timedelta(days=1)

    if item.due_date == tomorrow:
        # Due tomorrow - check for duplicate
        existing = db.query(Notification).filter(
            Notification.entity_id == item.id,
            Notification.type == NotificationType.due_soon.value,
            Notification.user_id == item.assignee_id,
        ).first()
        if not existing:
            create_notification(
                db=db,
                user_id=item.assignee_id,
                type=NotificationType.due_soon,
                title="Due Tomorrow",
                message=f"'{item.title}' is due tomorrow",
                project_id=item.project_id,
                entity_type="backlog_item",
                entity_id=item.id,
            )
    elif item.due_date < today:
        # Overdue - check for duplicate
        existing = db.query(Notification).filter(
            Notification.entity_id == item.id,
            Notification.type == NotificationType.overdue.value,
            Notification.user_id == item.assignee_id,
        ).first()
        if not existing:
            create_notification(
                db=db,
                user_id=item.assignee_id,
                type=NotificationType.overdue,
                title="Item Overdue",
                message=f"'{item.title}' is overdue",
                project_id=item.project_id,
                entity_type="backlog_item",
                entity_id=item.id,
            )


@router.get("/{project_id}/backlog", response_model=List[BacklogItemResponse])
def list_backlog_items(
    project_id: str,
    type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None, alias="status"),
    sprint_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    overdue: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    query = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(BacklogItem.project_id == project_id)
    )

    if type is not None:
        query = query.filter(BacklogItem.type == type)
    if priority is not None:
        query = query.filter(BacklogItem.priority == priority)
    if status is not None:
        query = query.filter(BacklogItem.status == status)
    if sprint_id is not None:
        query = query.filter(BacklogItem.sprint_id == sprint_id)
    if search is not None:
        query = query.filter(BacklogItem.title.ilike(f"%{search}%"))
    if overdue:
        today = date.today()
        query = query.filter(
            BacklogItem.due_date < today,
            BacklogItem.status != ItemStatus.done,
        )

    items = query.order_by(BacklogItem.position).all()

    # Check due date notifications for items with due dates
    for item in items:
        check_due_date_notifications(db, item)
    db.commit()

    return [BacklogItemResponse.model_validate(item) for item in items]


@router.get("/{project_id}/backlog/upcoming", response_model=List[BacklogItemResponse])
def list_upcoming_items(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    today = date.today()
    next_week = today + timedelta(days=7)

    items = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(
            BacklogItem.project_id == project_id,
            BacklogItem.due_date.isnot(None),
            BacklogItem.due_date <= next_week,
            BacklogItem.status != ItemStatus.done,
        )
        .order_by(BacklogItem.due_date.asc())
        .all()
    )
    return [BacklogItemResponse.model_validate(item) for item in items]


@router.post("/{project_id}/backlog", response_model=BacklogItemResponse, status_code=status.HTTP_201_CREATED)
def create_backlog_item(
    project_id: str,
    item_data: BacklogItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "member")

    max_position = db.query(func.coalesce(func.max(BacklogItem.position), 0)).filter(
        BacklogItem.project_id == project_id
    ).scalar()

    item = BacklogItem(
        project_id=project_id,
        sprint_id=item_data.sprint_id,
        title=item_data.title,
        description=item_data.description,
        type=item_data.type or ItemType.story,
        priority=item_data.priority or Priority.medium,
        status=item_data.status or ItemStatus.backlog,
        story_points=item_data.story_points,
        position=max_position + 1,
        assignee_id=item_data.assignee_id,
        labels=item_data.labels or [],
        acceptance_criteria=item_data.acceptance_criteria,
        due_date=item_data.due_date,
        start_date=item_data.start_date,
    )
    db.add(item)
    db.flush()

    create_activity(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.created,
        entity_type=EntityType.backlog_item,
        entity_id=item.id,
        details={"title": item.title, "type": item.type},
    )

    # Notify assignee if assigned to someone else
    if item.assignee_id and item.assignee_id != current_user.id:
        create_notification(
            db=db,
            user_id=item.assignee_id,
            type=NotificationType.item_assigned,
            title="New Assignment",
            message=f"{current_user.full_name} assigned you '{item.title}'",
            project_id=project_id,
            entity_type="backlog_item",
            entity_id=item.id,
        )

    if item.sprint_id:
        maybe_snapshot_active_sprint(db, project_id)

    db.commit()
    db.refresh(item)

    loaded_item = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(BacklogItem.id == item.id)
        .first()
    )
    return BacklogItemResponse.model_validate(loaded_item)


@router.patch("/{project_id}/backlog/reorder", status_code=200)
def reorder_backlog_items(
    project_id: str,
    reorder_data: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "member")

    for reorder_item in reorder_data.items:
        item = db.query(BacklogItem).filter(
            BacklogItem.id == reorder_item.id,
            BacklogItem.project_id == project_id,
        ).first()
        if item:
            item.position = reorder_item.position
            if "sprint_id" in reorder_item.model_fields_set:
                item.sprint_id = reorder_item.sprint_id or None

    db.commit()
    return {"message": "Items reordered successfully"}


@router.get("/{project_id}/backlog/unassigned", response_model=List[BacklogItemResponse])
def list_unassigned_items(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    items = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(
            BacklogItem.project_id == project_id,
            BacklogItem.sprint_id.is_(None),
            BacklogItem.status == ItemStatus.backlog,
        )
        .order_by(BacklogItem.position)
        .all()
    )
    return [BacklogItemResponse.model_validate(item) for item in items]


@router.patch("/{project_id}/backlog/bulk-move")
def bulk_move_items(
    project_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "member")

    item_ids = data.get("item_ids", [])
    sprint_id = data.get("sprint_id")
    moved = 0

    for item_id in item_ids:
        item = db.query(BacklogItem).filter(
            BacklogItem.id == item_id,
            BacklogItem.project_id == project_id,
        ).first()
        if item:
            item.sprint_id = sprint_id
            if sprint_id:
                item.status = ItemStatus.todo
            moved += 1

    if moved > 0:
        maybe_snapshot_active_sprint(db, project_id)
        db.commit()

    return {"moved": moved}


@router.get("/{project_id}/backlog/{item_id}", response_model=BacklogItemResponse)
def get_backlog_item(
    project_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    item = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(BacklogItem.id == item_id, BacklogItem.project_id == project_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backlog item not found",
        )
    return BacklogItemResponse.model_validate(item)


@router.patch("/{project_id}/backlog/{item_id}", response_model=BacklogItemResponse)
def update_backlog_item(
    project_id: str,
    item_id: str,
    update_data: BacklogItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "member")

    item = db.query(BacklogItem).filter(
        BacklogItem.id == item_id,
        BacklogItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backlog item not found",
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    old_status = item.status
    old_assignee = item.assignee_id

    for key, value in update_dict.items():
        setattr(item, key, value)

    if "status" in update_dict and update_dict["status"] != old_status:
        action = ActionType.completed if update_dict["status"] == ItemStatus.done else ActionType.moved
        create_activity(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            action=action,
            entity_type=EntityType.backlog_item,
            entity_id=item.id,
            details={"title": item.title, "from_status": old_status, "to_status": update_dict["status"]},
        )
        # Notify assignee of status change
        if item.assignee_id and item.assignee_id != current_user.id:
            create_notification(
                db=db,
                user_id=item.assignee_id,
                type=NotificationType.item_status_changed,
                title="Item Updated",
                message=f"'{item.title}' moved to {update_dict['status']}",
                project_id=project_id,
                entity_type="backlog_item",
                entity_id=item.id,
            )
    elif "assignee_id" in update_dict:
        new_assignee = update_dict["assignee_id"]
        if new_assignee != (str(old_assignee) if old_assignee else None):
            create_activity(
                db=db,
                project_id=project_id,
                user_id=current_user.id,
                action=ActionType.updated,
                entity_type=EntityType.backlog_item,
                entity_id=item.id,
                details={"title": item.title, "field": "assignee"},
            )
            # Notify new assignee
            if new_assignee and new_assignee != current_user.id:
                create_notification(
                    db=db,
                    user_id=new_assignee,
                    type=NotificationType.item_assigned,
                    title="New Assignment",
                    message=f"{current_user.full_name} assigned you '{item.title}'",
                    project_id=project_id,
                    entity_type="backlog_item",
                    entity_id=item.id,
                )

    needs_snapshot = (
        "status" in update_dict
        or "story_points" in update_dict
        or "sprint_id" in update_dict
    )
    if needs_snapshot:
        maybe_snapshot_active_sprint(db, project_id)

    db.commit()
    db.refresh(item)

    # Check due date notifications after update
    check_due_date_notifications(db, item)
    db.commit()

    loaded_item = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(BacklogItem.id == item.id)
        .first()
    )
    return BacklogItemResponse.model_validate(loaded_item)


@router.delete("/{project_id}/backlog/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_backlog_item(
    project_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "member")

    item = db.query(BacklogItem).filter(
        BacklogItem.id == item_id,
        BacklogItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backlog item not found",
        )

    create_activity(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.deleted,
        entity_type=EntityType.backlog_item,
        entity_id=item.id,
        details={"title": item.title},
    )

    if item.sprint_id:
        maybe_snapshot_active_sprint(db, project_id)

    db.delete(item)
    db.commit()
    return None
