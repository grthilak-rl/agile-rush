from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.sprint import Sprint, SprintStatus
from app.models.backlog_item import BacklogItem, ItemStatus
from app.models.retro_item import RetroItem
from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.schemas.sprint import SprintCreate, SprintUpdate, SprintComplete, SprintResponse
from app.schemas.backlog_item import BacklogItemResponse


class BulkMoveRequest(BaseModel):
    item_ids: List[str]
    sprint_id: Optional[str] = None

router = APIRouter(prefix="/api/projects", tags=["sprints"])


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


@router.get("/{project_id}/sprints", response_model=List[SprintResponse])
def list_sprints(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    sprints = (
        db.query(Sprint)
        .filter(Sprint.project_id == project_id)
        .order_by(Sprint.sprint_number)
        .all()
    )
    return [SprintResponse.model_validate(s) for s in sprints]


@router.get("/{project_id}/sprints/active", response_model=Optional[SprintResponse])
def get_active_sprint(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    sprint = (
        db.query(Sprint)
        .filter(Sprint.project_id == project_id, Sprint.status == SprintStatus.active)
        .first()
    )
    if not sprint:
        return None
    return SprintResponse.model_validate(sprint)


@router.post("/{project_id}/sprints", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
def create_sprint(
    project_id: str,
    sprint_data: SprintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = verify_project_ownership(project_id, current_user, db)

    max_sprint_number = db.query(func.coalesce(func.max(Sprint.sprint_number), 0)).filter(
        Sprint.project_id == project_id
    ).scalar()
    next_number = max_sprint_number + 1

    name = sprint_data.name if sprint_data.name else f"Sprint {next_number}"
    duration = sprint_data.duration_weeks if sprint_data.duration_weeks else project.default_sprint_duration

    sprint = Sprint(
        project_id=project_id,
        name=name,
        goal=sprint_data.goal,
        sprint_number=next_number,
        duration_weeks=duration,
        status=SprintStatus.planning,
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)

    return SprintResponse.model_validate(sprint)


@router.get("/{project_id}/sprints/{sprint_id}", response_model=SprintResponse)
def get_sprint(
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sprint not found",
        )
    return SprintResponse.model_validate(sprint)


@router.patch("/{project_id}/sprints/{sprint_id}", response_model=SprintResponse)
def update_sprint(
    project_id: str,
    sprint_id: str,
    update_data: SprintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    sprint = db.query(Sprint).filter(
        Sprint.id == sprint_id,
        Sprint.project_id == project_id,
    ).first()
    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sprint not found",
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(sprint, key, value)

    create_activity(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.updated,
        entity_type=EntityType.sprint,
        entity_id=sprint.id,
        details={"name": sprint.name},
    )

    create_activity(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.created,
        entity_type=EntityType.sprint,
        entity_id=sprint.id,
        details={"name": sprint.name},
    )

    db.commit()
    db.refresh(sprint)
    return SprintResponse.model_validate(sprint)


@router.post("/{project_id}/sprints/{sprint_id}/start", response_model=SprintResponse)
def start_sprint(
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sprint not found",
        )
    if sprint.status != SprintStatus.planning:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only planning sprints can be started",
        )

    existing_active = db.query(Sprint).filter(
        Sprint.project_id == project_id,
        Sprint.status == SprintStatus.active,
    ).first()
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Another sprint is already active. Complete it first.",
        )

    sprint.status = SprintStatus.active
    sprint.start_date = date.today()
    sprint.end_date = date.today() + timedelta(weeks=sprint.duration_weeks)

    create_activity(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.updated,
        entity_type=EntityType.sprint,
        entity_id=sprint.id,
        details={"name": sprint.name, "action": "started"},
    )

    db.commit()
    db.refresh(sprint)
    return SprintResponse.model_validate(sprint)


@router.post("/{project_id}/sprints/{sprint_id}/complete", response_model=SprintResponse)
def complete_sprint(
    project_id: str,
    sprint_id: str,
    complete_data: SprintComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    sprint = db.query(Sprint).filter(
        Sprint.id == sprint_id,
        Sprint.project_id == project_id,
    ).first()
    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sprint not found",
        )
    if sprint.status != SprintStatus.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active sprints can be completed",
        )

    incomplete_items = db.query(BacklogItem).filter(
        BacklogItem.sprint_id == sprint_id,
        BacklogItem.status != ItemStatus.done,
    ).all()

    if complete_data.action == "move_to_backlog":
        for item in incomplete_items:
            item.sprint_id = None
            item.status = ItemStatus.backlog
    elif complete_data.action == "move_to_next_sprint":
        next_sprint = db.query(Sprint).filter(
            Sprint.project_id == project_id,
            Sprint.status == SprintStatus.planning,
        ).order_by(Sprint.sprint_number).first()

        if not next_sprint:
            max_num = db.query(func.coalesce(func.max(Sprint.sprint_number), 0)).filter(
                Sprint.project_id == project_id
            ).scalar()
            next_sprint = Sprint(
                project_id=project_id,
                name=f"Sprint {max_num + 1}",
                sprint_number=max_num + 1,
                duration_weeks=sprint.duration_weeks,
                status=SprintStatus.planning,
            )
            db.add(next_sprint)
            db.flush()

        for item in incomplete_items:
            item.sprint_id = next_sprint.id

    sprint.status = SprintStatus.completed
    sprint.end_date = date.today()

    create_activity(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.completed,
        entity_type=EntityType.sprint,
        entity_id=sprint.id,
        details={
            "name": sprint.name,
            "incomplete_items": len(incomplete_items),
            "action": complete_data.action,
        },
    )

    db.commit()
    db.refresh(sprint)
    return SprintResponse.model_validate(sprint)


@router.delete("/{project_id}/sprints/{sprint_id}")
def delete_sprint(
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

    if sprint.status == SprintStatus.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an active sprint. Complete it first.",
        )

    items = db.query(BacklogItem).filter(BacklogItem.sprint_id == sprint_id).all()
    items_count = len(items)
    for item in items:
        item.sprint_id = None
        if item.status in (ItemStatus.todo, ItemStatus.in_progress, ItemStatus.in_review):
            item.status = ItemStatus.backlog

    db.query(RetroItem).filter(RetroItem.sprint_id == sprint_id).delete()

    create_activity(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.deleted,
        entity_type=EntityType.sprint,
        entity_id=sprint.id,
        details={"name": sprint.name, "items_unassigned": items_count},
    )

    db.delete(sprint)
    db.commit()
    return {"message": "Sprint deleted", "items_unassigned": items_count}


@router.get("/{project_id}/backlog/unassigned")
def get_unassigned_backlog(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    items = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(
            BacklogItem.project_id == project_id,
            BacklogItem.sprint_id == None,
        )
        .order_by(BacklogItem.position)
        .all()
    )
    return [BacklogItemResponse.model_validate(item) for item in items]


@router.get("/{project_id}/sprints/{sprint_id}/items")
def get_sprint_items(
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
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(BacklogItem.sprint_id == sprint_id, BacklogItem.project_id == project_id)
        .order_by(BacklogItem.position)
        .all()
    )
    return [BacklogItemResponse.model_validate(item) for item in items]


@router.get("/{project_id}/sprints/{sprint_id}/capacity")
def get_sprint_capacity(
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

    total_items = db.query(func.count(BacklogItem.id)).filter(
        BacklogItem.sprint_id == sprint_id
    ).scalar()
    total_points = db.query(func.coalesce(func.sum(BacklogItem.story_points), 0)).filter(
        BacklogItem.sprint_id == sprint_id
    ).scalar()

    completed_sprints = (
        db.query(Sprint)
        .filter(
            Sprint.project_id == project_id,
            Sprint.status == SprintStatus.completed,
        )
        .order_by(Sprint.sprint_number.desc())
        .limit(3)
        .all()
    )

    team_velocity = None
    if completed_sprints:
        sprint_ids = [s.id for s in completed_sprints]
        completed_points_list = []
        for sid in sprint_ids:
            pts = db.query(func.coalesce(func.sum(BacklogItem.story_points), 0)).filter(
                BacklogItem.sprint_id == sid,
                BacklogItem.status == ItemStatus.done,
            ).scalar()
            completed_points_list.append(pts)
        team_velocity = round(sum(completed_points_list) / len(completed_points_list))

    capacity_status = "under"
    if team_velocity is not None:
        if total_points > team_velocity:
            capacity_status = "over"
        elif total_points >= team_velocity * 0.9:
            capacity_status = "at"

    return {
        "sprint_id": sprint.id,
        "sprint_name": sprint.name,
        "total_items": total_items,
        "total_points": total_points,
        "team_velocity": team_velocity,
        "capacity_status": capacity_status,
    }


@router.patch("/{project_id}/backlog/bulk-move")
def bulk_move_items(
    project_id: str,
    data: BulkMoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_project_ownership(project_id, current_user, db)

    if data.sprint_id:
        sprint = db.query(Sprint).filter(
            Sprint.id == data.sprint_id,
            Sprint.project_id == project_id,
        ).first()
        if not sprint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    moved = 0
    for item_id in data.item_ids:
        item = db.query(BacklogItem).filter(
            BacklogItem.id == item_id,
            BacklogItem.project_id == project_id,
        ).first()
        if item:
            old_sprint_id = item.sprint_id
            item.sprint_id = data.sprint_id
            if data.sprint_id is None and item.status in (ItemStatus.todo, ItemStatus.in_progress, ItemStatus.in_review):
                item.status = ItemStatus.backlog
            elif data.sprint_id and item.status == ItemStatus.backlog:
                item.status = ItemStatus.todo
            moved += 1

            create_activity(
                db=db,
                project_id=project_id,
                user_id=current_user.id,
                action=ActionType.moved,
                entity_type=EntityType.backlog_item,
                entity_id=item.id,
                details={
                    "title": item.title,
                    "from_sprint": old_sprint_id,
                    "to_sprint": data.sprint_id,
                },
            )

    db.commit()
    return {"moved": moved}


@router.get("/{project_id}/sprints/{sprint_id}/summary")
def get_sprint_summary(
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

    all_items = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(BacklogItem.sprint_id == sprint_id)
        .all()
    )

    completed_items = [i for i in all_items if i.status == ItemStatus.done]
    incomplete_items = [i for i in all_items if i.status != ItemStatus.done]

    planned_points = sum(i.story_points or 0 for i in all_items)
    completed_points = sum(i.story_points or 0 for i in completed_items)
    completion_rate = round((completed_points / planned_points * 100) if planned_points > 0 else 0)

    items_added_mid_sprint = 0
    if sprint.start_date:
        for item in all_items:
            if item.created_at and item.created_at.date() > sprint.start_date:
                items_added_mid_sprint += 1

    duration_days = 0
    if sprint.start_date and sprint.end_date:
        duration_days = (sprint.end_date - sprint.start_date).days

    has_retro = db.query(RetroItem).filter(RetroItem.sprint_id == sprint_id).first() is not None

    return {
        "sprint": {
            "id": sprint.id,
            "name": sprint.name,
            "goal": sprint.goal,
            "sprint_number": sprint.sprint_number,
            "start_date": str(sprint.start_date) if sprint.start_date else None,
            "end_date": str(sprint.end_date) if sprint.end_date else None,
            "status": sprint.status,
            "duration_weeks": sprint.duration_weeks,
        },
        "planned_points": planned_points,
        "completed_points": completed_points,
        "completion_rate": completion_rate,
        "items_completed": len(completed_items),
        "items_total": len(all_items),
        "items_added_mid_sprint": items_added_mid_sprint,
        "velocity": completed_points,
        "duration_days": duration_days,
        "has_retro": has_retro,
        "completed_items": [
            BacklogItemResponse.model_validate(i).model_dump()
            for i in completed_items
        ],
        "incomplete_items": [
            BacklogItemResponse.model_validate(i).model_dump()
            for i in incomplete_items
        ],
    }
