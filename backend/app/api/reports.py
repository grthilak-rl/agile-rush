from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_project_with_access
from app.models.user import User
from app.models.sprint import Sprint, SprintStatus
from app.models.backlog_item import BacklogItem, ItemStatus
from app.models.daily_snapshot import DailySnapshot

router = APIRouter(prefix="/api/projects", tags=["reports"])


@router.get("/{project_id}/reports/burndown")
def get_burndown_data(
    project_id: str,
    sprint_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    sprint = None
    if sprint_id:
        sprint = db.query(Sprint).filter(
            Sprint.id == sprint_id, Sprint.project_id == project_id
        ).first()
    else:
        sprint = db.query(Sprint).filter(
            Sprint.project_id == project_id, Sprint.status == SprintStatus.active
        ).first()
        if not sprint:
            sprint = (
                db.query(Sprint)
                .filter(
                    Sprint.project_id == project_id,
                    Sprint.status == SprintStatus.completed,
                )
                .order_by(Sprint.sprint_number.desc())
                .first()
            )

    if not sprint or not sprint.start_date or not sprint.end_date:
        return {"sprint": None, "actual": [], "ideal": []}

    snapshots = (
        db.query(DailySnapshot)
        .filter(DailySnapshot.sprint_id == sprint.id)
        .order_by(DailySnapshot.date)
        .all()
    )

    snapshot_map = {s.date: s for s in snapshots}

    actual = []
    start = sprint.start_date
    end = sprint.end_date
    today = date.today()
    effective_end = min(end, today) if sprint.status == SprintStatus.active else end

    last_known_remaining = None
    current = start
    while current <= effective_end:
        if current in snapshot_map:
            last_known_remaining = snapshot_map[current].remaining_points
        if last_known_remaining is not None:
            actual.append({
                "date": str(current),
                "remaining_points": last_known_remaining,
            })
        current += timedelta(days=1)

    if sprint.status == SprintStatus.active:
        items = db.query(BacklogItem).filter(
            BacklogItem.sprint_id == sprint.id
        ).all()
        total_pts = sum(i.story_points or 0 for i in items)
        done_pts = sum(
            (i.story_points or 0) for i in items if i.status == ItemStatus.done
        )
        live_remaining = total_pts - done_pts
        if actual and actual[-1]["date"] == str(today):
            actual[-1]["remaining_points"] = live_remaining
        else:
            actual.append({
                "date": str(today),
                "remaining_points": live_remaining,
            })

    ideal = []
    total_days = (end - start).days
    if total_days > 0 and actual:
        start_points = actual[0]["remaining_points"] if actual else 0
        current = start
        day_idx = 0
        while current <= end:
            remaining = start_points * (1 - day_idx / total_days)
            ideal.append({
                "date": str(current),
                "remaining_points": round(remaining, 1),
            })
            current += timedelta(days=1)
            day_idx += 1

    return {
        "sprint": {
            "id": sprint.id,
            "name": sprint.name,
            "start_date": str(sprint.start_date),
            "end_date": str(sprint.end_date),
            "status": sprint.status,
        },
        "actual": actual,
        "ideal": ideal,
    }


@router.get("/{project_id}/reports/velocity")
def get_velocity_data(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    sprints = (
        db.query(Sprint)
        .filter(
            Sprint.project_id == project_id,
            Sprint.status.in_([SprintStatus.active, SprintStatus.completed]),
        )
        .order_by(Sprint.sprint_number)
        .all()
    )

    sprint_data = []
    completed_velocities = []

    for s in sprints:
        items = db.query(BacklogItem).filter(BacklogItem.sprint_id == s.id).all()
        planned = sum(i.story_points or 0 for i in items)
        completed = sum(
            (i.story_points or 0) for i in items if i.status == ItemStatus.done
        )
        sprint_data.append({
            "name": s.name,
            "sprint_number": s.sprint_number,
            "planned_points": planned,
            "completed_points": completed,
            "status": s.status,
        })
        if s.status == SprintStatus.completed:
            completed_velocities.append(completed)

    avg_velocity = (
        round(sum(completed_velocities) / len(completed_velocities))
        if completed_velocities
        else 0
    )

    trend = "stable"
    if len(completed_velocities) >= 3:
        last3 = completed_velocities[-3:]
        if last3[2] > last3[1] > last3[0]:
            trend = "increasing"
        elif last3[2] < last3[1] < last3[0]:
            trend = "decreasing"
    elif len(completed_velocities) >= 2:
        if completed_velocities[-1] > completed_velocities[-2]:
            trend = "increasing"
        elif completed_velocities[-1] < completed_velocities[-2]:
            trend = "decreasing"

    return {
        "sprints": sprint_data,
        "average_velocity": avg_velocity,
        "trend": trend,
    }


@router.get("/{project_id}/reports/summary")
def get_summary_data(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    sprints = (
        db.query(Sprint)
        .filter(
            Sprint.project_id == project_id,
            Sprint.status.in_([SprintStatus.active, SprintStatus.completed]),
        )
        .order_by(Sprint.sprint_number)
        .all()
    )

    sprint_rows = []
    completed_stats = {
        "total_sprints": 0,
        "total_velocity": 0,
        "total_completion_rate": 0,
        "total_points": 0,
        "total_items": 0,
    }

    for s in sprints:
        items = db.query(BacklogItem).filter(BacklogItem.sprint_id == s.id).all()
        planned = sum(i.story_points or 0 for i in items)
        completed = sum(
            (i.story_points or 0) for i in items if i.status == ItemStatus.done
        )
        items_done = sum(1 for i in items if i.status == ItemStatus.done)
        rate = round((completed / planned * 100) if planned > 0 else 0)

        duration_days = 0
        if s.start_date and s.end_date:
            duration_days = (s.end_date - s.start_date).days

        mid_sprint_count = 0
        if s.start_date:
            for item in items:
                if item.created_at and item.created_at.date() > s.start_date:
                    mid_sprint_count += 1

        sprint_rows.append({
            "name": s.name,
            "sprint_number": s.sprint_number,
            "start_date": str(s.start_date) if s.start_date else None,
            "end_date": str(s.end_date) if s.end_date else None,
            "duration_days": duration_days,
            "planned_points": planned,
            "completed_points": completed,
            "completion_rate": rate,
            "items_total": len(items),
            "items_completed": items_done,
            "items_added_mid_sprint": mid_sprint_count,
            "velocity": completed,
            "status": s.status,
        })

        if s.status == SprintStatus.completed:
            completed_stats["total_sprints"] += 1
            completed_stats["total_velocity"] += completed
            completed_stats["total_completion_rate"] += rate
            completed_stats["total_points"] += completed
            completed_stats["total_items"] += items_done

    n = completed_stats["total_sprints"]
    overall = {
        "total_sprints_completed": n,
        "average_velocity": round(completed_stats["total_velocity"] / n) if n else 0,
        "average_completion_rate": round(completed_stats["total_completion_rate"] / n) if n else 0,
        "total_points_delivered": completed_stats["total_points"],
        "total_items_delivered": completed_stats["total_items"],
    }

    return {
        "sprints": sprint_rows,
        "overall": overall,
    }
