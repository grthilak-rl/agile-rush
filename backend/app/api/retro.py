from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.sprint import Sprint, SprintStatus
from app.models.backlog_item import BacklogItem, ItemStatus
from app.models.retro_item import RetroItem, RetroColumn
from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.schemas.retro_item import (
    RetroItemCreate,
    RetroItemUpdate,
    RetroItemResponse,
    RetroResponse,
)


router = APIRouter(prefix="/api/projects", tags=["retro"])


def verify_project_ownership(project_id: str, user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
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


def item_to_response(item: RetroItem, current_user_id: str, carried_over: bool = False) -> RetroItemResponse:
    voted_by = item.voted_by or []
    return RetroItemResponse(
        id=item.id,
        sprint_id=item.sprint_id,
        project_id=item.project_id,
        column=item.column,
        content=item.content,
        votes=item.votes,
        voted_by=voted_by,
        resolved=item.resolved,
        created_by=item.created_by,
        creator={
            "id": item.creator.id,
            "email": item.creator.email,
            "full_name": item.creator.full_name,
            "avatar_url": item.creator.avatar_url,
            "created_at": item.creator.created_at,
        } if item.creator else None,
        created_at=item.created_at,
        updated_at=item.updated_at,
        carried_over=carried_over,
        user_has_voted=current_user_id in voted_by,
    )


@router.get("/{project_id}/sprints/{sprint_id}/retro")
def get_retro(
    project_id: str,
    sprint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    sprint = db.query(Sprint).filter(
        Sprint.id == sprint_id,
        Sprint.project_id == project_id,
    ).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    items = (
        db.query(RetroItem)
        .options(joinedload(RetroItem.creator))
        .filter(RetroItem.sprint_id == sprint_id, RetroItem.project_id == project_id)
        .order_by(RetroItem.votes.desc(), RetroItem.created_at)
        .all()
    )

    went_well = [item_to_response(i, current_user.id) for i in items if i.column == RetroColumn.went_well]
    didnt_go_well = [item_to_response(i, current_user.id) for i in items if i.column == RetroColumn.didnt_go_well]
    action_item = [item_to_response(i, current_user.id) for i in items if i.column == RetroColumn.action_item]

    # Carried over: unresolved action items from the previous sprint
    carried_over_actions = []
    prev_sprint = (
        db.query(Sprint)
        .filter(
            Sprint.project_id == project_id,
            Sprint.sprint_number == sprint.sprint_number - 1,
        )
        .first()
    )
    if prev_sprint:
        prev_items = (
            db.query(RetroItem)
            .options(joinedload(RetroItem.creator))
            .filter(
                RetroItem.sprint_id == prev_sprint.id,
                RetroItem.project_id == project_id,
                RetroItem.column == RetroColumn.action_item,
                RetroItem.resolved == False,
            )
            .order_by(RetroItem.votes.desc(), RetroItem.created_at)
            .all()
        )
        carried_over_actions = [item_to_response(i, current_user.id, carried_over=True) for i in prev_items]

    # Sprint completion stats
    total_items = db.query(func.count(BacklogItem.id)).filter(BacklogItem.sprint_id == sprint_id).scalar()
    completed_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.sprint_id == sprint_id, BacklogItem.status == ItemStatus.done
    ).scalar()
    total_points = db.query(func.coalesce(func.sum(BacklogItem.story_points), 0)).filter(
        BacklogItem.sprint_id == sprint_id
    ).scalar()
    completed_points = db.query(func.coalesce(func.sum(BacklogItem.story_points), 0)).filter(
        BacklogItem.sprint_id == sprint_id, BacklogItem.status == ItemStatus.done
    ).scalar()

    return {
        "went_well": [r.model_dump() for r in went_well],
        "didnt_go_well": [r.model_dump() for r in didnt_go_well],
        "action_item": [r.model_dump() for r in action_item],
        "carried_over_actions": [r.model_dump() for r in carried_over_actions],
        "sprint": {
            "id": sprint.id,
            "name": sprint.name,
            "goal": sprint.goal,
            "sprint_number": sprint.sprint_number,
            "start_date": str(sprint.start_date) if sprint.start_date else None,
            "end_date": str(sprint.end_date) if sprint.end_date else None,
            "status": sprint.status,
            "items_completed": completed_items,
            "items_total": total_items,
            "points_completed": completed_points,
            "points_total": total_points,
        },
    }


@router.post("/{project_id}/sprints/{sprint_id}/retro", status_code=status.HTTP_201_CREATED)
def create_retro_item(
    project_id: str,
    sprint_id: str,
    data: RetroItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    sprint = db.query(Sprint).filter(
        Sprint.id == sprint_id,
        Sprint.project_id == project_id,
    ).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    if data.column not in [c.value for c in RetroColumn]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid column")

    item = RetroItem(
        sprint_id=sprint_id,
        project_id=project_id,
        column=data.column,
        content=data.content,
        created_by=current_user.id,
        voted_by=[],
    )
    db.add(item)
    db.flush()

    create_activity(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.created,
        entity_type=EntityType.retro_item,
        entity_id=item.id,
        details={"content": item.content[:100], "column": item.column},
    )

    db.commit()
    db.refresh(item)

    loaded = (
        db.query(RetroItem)
        .options(joinedload(RetroItem.creator))
        .filter(RetroItem.id == item.id)
        .first()
    )
    resp = item_to_response(loaded, current_user.id)
    return resp.model_dump()


@router.patch("/{project_id}/sprints/{sprint_id}/retro/{retro_id}")
def update_retro_item(
    project_id: str,
    sprint_id: str,
    retro_id: str,
    data: RetroItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = verify_project_ownership(project_id, current_user, db)

    item = (
        db.query(RetroItem)
        .options(joinedload(RetroItem.creator))
        .filter(RetroItem.id == retro_id, RetroItem.project_id == project_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retro item not found")

    # Only creator or project owner can edit
    if item.created_by != current_user.id and project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this item")

    update_dict = data.model_dump(exclude_unset=True)
    if "column" in update_dict and update_dict["column"] not in [c.value for c in RetroColumn]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid column")

    for key, value in update_dict.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)

    loaded = (
        db.query(RetroItem)
        .options(joinedload(RetroItem.creator))
        .filter(RetroItem.id == item.id)
        .first()
    )
    resp = item_to_response(loaded, current_user.id)
    return resp.model_dump()


@router.delete("/{project_id}/sprints/{sprint_id}/retro/{retro_id}")
def delete_retro_item(
    project_id: str,
    sprint_id: str,
    retro_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = verify_project_ownership(project_id, current_user, db)

    item = db.query(RetroItem).filter(
        RetroItem.id == retro_id,
        RetroItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retro item not found")

    if item.created_by != current_user.id and project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this item")

    db.delete(item)
    db.commit()
    return {"message": "Retro item deleted"}


@router.post("/{project_id}/sprints/{sprint_id}/retro/{retro_id}/vote")
def vote_retro_item(
    project_id: str,
    sprint_id: str,
    retro_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    item = (
        db.query(RetroItem)
        .options(joinedload(RetroItem.creator))
        .filter(RetroItem.id == retro_id, RetroItem.project_id == project_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retro item not found")

    voted_by = list(item.voted_by or [])
    if current_user.id in voted_by:
        voted_by.remove(current_user.id)
        item.votes = max(0, item.votes - 1)
    else:
        voted_by.append(current_user.id)
        item.votes = item.votes + 1

    item.voted_by = voted_by

    db.commit()
    db.refresh(item)

    loaded = (
        db.query(RetroItem)
        .options(joinedload(RetroItem.creator))
        .filter(RetroItem.id == item.id)
        .first()
    )
    resp = item_to_response(loaded, current_user.id)
    return resp.model_dump()
