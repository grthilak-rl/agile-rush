from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.sprint import Sprint, SprintStatus
from app.models.backlog_item import BacklogItem, ItemStatus
from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.schemas.sprint import SprintCreate, SprintUpdate, SprintComplete, SprintResponse

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
