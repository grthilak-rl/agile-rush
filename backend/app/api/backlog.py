from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.backlog_item import BacklogItem, ItemType, Priority, ItemStatus
from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.schemas.backlog_item import (
    BacklogItemCreate,
    BacklogItemUpdate,
    BacklogItemResponse,
    ReorderRequest,
)

router = APIRouter(prefix="/api/projects", tags=["backlog"])


def verify_project_ownership(project_id: str, user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


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


@router.get("/{project_id}/backlog", response_model=List[BacklogItemResponse])
def list_backlog_items(
    project_id: str,
    type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None, alias="status"),
    sprint_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

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

    items = query.order_by(BacklogItem.position).all()
    return [BacklogItemResponse.model_validate(item) for item in items]


@router.post("/{project_id}/backlog", response_model=BacklogItemResponse, status_code=status.HTTP_201_CREATED)
def create_backlog_item(
    project_id: str,
    item_data: BacklogItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

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

    db.commit()
    db.refresh(item)

    loaded_item = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(BacklogItem.id == item.id)
        .first()
    )
    return BacklogItemResponse.model_validate(loaded_item)


@router.patch("/{project_id}/backlog/reorder", status_code=status.HTTP_200_OK)
def reorder_backlog_items(
    project_id: str,
    reorder_data: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    for reorder_item in reorder_data.items:
        item = db.query(BacklogItem).filter(
            BacklogItem.id == reorder_item.id,
            BacklogItem.project_id == project_id,
        ).first()
        if item:
            item.position = reorder_item.position
            if reorder_item.sprint_id is not None:
                item.sprint_id = reorder_item.sprint_id

    db.commit()
    return {"message": "Items reordered successfully"}


@router.get("/{project_id}/backlog/{item_id}", response_model=BacklogItemResponse)
def get_backlog_item(
    project_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

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
    verify_project_ownership(project_id, current_user, db)

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
    elif "assignee_id" in update_dict and update_dict["assignee_id"] != str(old_assignee) if old_assignee else True:
        create_activity(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            action=ActionType.updated,
            entity_type=EntityType.backlog_item,
            entity_id=item.id,
            details={"title": item.title, "field": "assignee"},
        )

    db.commit()
    db.refresh(item)

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
    verify_project_ownership(project_id, current_user, db)

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

    db.delete(item)
    db.commit()
    return None
