import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_project_with_access
from app.core.notifications import create_notification
from app.models.user import User
from app.models.backlog_item import BacklogItem
from app.models.comment import Comment
from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/projects", tags=["comments"])

MENTION_PATTERN = re.compile(r"@\[([^\]]+)\]\(([^)]+)\)")


class CommentCreate(BaseModel):
    content: str


class CommentUpdate(BaseModel):
    content: str


def _extract_mentions(content: str) -> list[str]:
    """Extract user IDs from @[Name](user_id) patterns."""
    return [match.group(2) for match in MENTION_PATTERN.finditer(content)]


def _comment_response(comment: Comment) -> dict:
    author = None
    if comment.author:
        author = {
            "id": comment.author.id,
            "full_name": comment.author.full_name,
            "avatar_url": comment.author.avatar_url,
        }
    return {
        "id": comment.id,
        "backlog_item_id": comment.backlog_item_id,
        "project_id": comment.project_id,
        "author_id": comment.author_id,
        "author": author,
        "content": comment.content,
        "mentions": comment.mentions or [],
        "edited_at": comment.edited_at.isoformat() if comment.edited_at else None,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
        "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
    }


@router.get("/{project_id}/backlog/{item_id}/comments")
def list_comments(
    project_id: str,
    item_id: str,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    comments = (
        db.query(Comment)
        .filter(
            Comment.backlog_item_id == item_id,
            Comment.project_id == project_id,
        )
        .order_by(Comment.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_comment_response(c) for c in comments]


@router.post("/{project_id}/backlog/{item_id}/comments", status_code=status.HTTP_201_CREATED)
def create_comment(
    project_id: str,
    item_id: str,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "member")

    item = db.query(BacklogItem).filter(
        BacklogItem.id == item_id,
        BacklogItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Backlog item not found")

    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")

    mention_ids = _extract_mentions(data.content)

    comment = Comment(
        backlog_item_id=item_id,
        project_id=project_id,
        author_id=current_user.id,
        content=data.content,
        mentions=mention_ids,
    )
    db.add(comment)
    db.flush()

    # Notify mentioned users
    for user_id in mention_ids:
        if user_id != current_user.id:
            create_notification(
                db=db,
                user_id=user_id,
                type=NotificationType.mentioned,
                title="Mentioned in comment",
                message=f"{current_user.full_name} mentioned you on '{item.title}'",
                project_id=project_id,
                entity_type="backlog_item",
                entity_id=item_id,
            )

    # Notify item assignee if different from author and not already mentioned
    if item.assignee_id and item.assignee_id != current_user.id and item.assignee_id not in mention_ids:
        create_notification(
            db=db,
            user_id=item.assignee_id,
            type=NotificationType.comment_added,
            title="New Comment",
            message=f"{current_user.full_name} commented on '{item.title}'",
            project_id=project_id,
            entity_type="backlog_item",
            entity_id=item_id,
        )

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.created,
        entity_type=EntityType.backlog_item,
        entity_id=item_id,
        details={"title": item.title, "action": "commented"},
    )
    db.add(log)

    db.commit()
    db.refresh(comment)

    return _comment_response(comment)


@router.patch("/{project_id}/backlog/{item_id}/comments/{comment_id}")
def update_comment(
    project_id: str,
    item_id: str,
    comment_id: str,
    data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "member")

    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.backlog_item_id == item_id,
        Comment.project_id == project_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the author can edit this comment")

    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")

    old_mentions = set(comment.mentions or [])
    new_mention_ids = _extract_mentions(data.content)
    new_mentions_set = set(new_mention_ids)

    comment.content = data.content
    comment.mentions = new_mention_ids
    comment.edited_at = datetime.now(timezone.utc)

    # Notify newly mentioned users only
    item = db.query(BacklogItem).filter(BacklogItem.id == item_id).first()
    for user_id in new_mentions_set - old_mentions:
        if user_id != current_user.id:
            create_notification(
                db=db,
                user_id=user_id,
                type=NotificationType.mentioned,
                title="Mentioned in comment",
                message=f"{current_user.full_name} mentioned you on '{item.title}'",
                project_id=project_id,
                entity_type="backlog_item",
                entity_id=item_id,
            )

    db.commit()
    db.refresh(comment)

    return _comment_response(comment)


@router.delete("/{project_id}/backlog/{item_id}/comments/{comment_id}")
def delete_comment(
    project_id: str,
    item_id: str,
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, user_role = get_project_with_access(project_id, current_user, db, "member")

    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.backlog_item_id == item_id,
        Comment.project_id == project_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id and user_role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Not allowed to delete this comment")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
