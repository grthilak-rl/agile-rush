from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_project_with_access
from app.core.storage import storage_service
from app.models.user import User
from app.models.backlog_item import BacklogItem
from app.models.attachment import Attachment
from app.models.activity_log import ActivityLog, ActionType, EntityType

router = APIRouter(prefix="/api/projects", tags=["attachments"])

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/markdown", "text/csv",
    "application/zip",
}

BLOCKED_EXTENSIONS = {".exe", ".sh", ".bat", ".cmd", ".ps1", ".py", ".js"}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_ATTACHMENTS_PER_ITEM = 20


def _attachment_response(att: Attachment) -> dict:
    uploader = None
    if att.uploader:
        uploader = {
            "id": att.uploader.id,
            "full_name": att.uploader.full_name,
            "avatar_url": att.uploader.avatar_url,
        }
    return {
        "id": att.id,
        "filename": att.filename,
        "file_size": att.file_size,
        "mime_type": att.mime_type,
        "thumbnail_url": storage_service.get_url(att.thumbnail_url) if att.thumbnail_url else None,
        "download_url": storage_service.get_url(att.file_key),
        "uploaded_by": uploader,
        "created_at": att.created_at.isoformat() if att.created_at else None,
    }


@router.post("/{project_id}/backlog/{item_id}/attachments")
async def upload_attachment(
    project_id: str,
    item_id: str,
    file: UploadFile = File(...),
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

    # Check attachment count
    count = db.query(Attachment).filter(Attachment.backlog_item_id == item_id).count()
    if count >= MAX_ATTACHMENTS_PER_ITEM:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_ATTACHMENTS_PER_ITEM} attachments per item",
        )

    # Check file extension
    filename = file.filename or ""
    import os
    ext = os.path.splitext(filename)[1].lower()
    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")

    # Check MIME type
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' not allowed")

    # Check file size by reading content
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_FILE_SIZE // (1024 * 1024)}MB limit",
        )
    # Seek back so storage service can read
    await file.seek(0)

    # Upload file
    result = await storage_service.upload(file, project_id, item_id)

    attachment = Attachment(
        backlog_item_id=item_id,
        uploaded_by=current_user.id,
        filename=filename,
        file_key=result["file_key"],
        file_size=result["file_size"],
        mime_type=result["mime_type"],
        thumbnail_url=result["thumbnail_url"],
    )
    db.add(attachment)

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        user_id=current_user.id,
        action=ActionType.updated,
        entity_type=EntityType.backlog_item,
        entity_id=item_id,
        details={"title": item.title, "action": "attached", "filename": filename},
    )
    db.add(log)

    db.commit()
    db.refresh(attachment)

    return _attachment_response(attachment)


@router.get("/{project_id}/backlog/{item_id}/attachments")
def list_attachments(
    project_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_project_with_access(project_id, current_user, db, "viewer")

    attachments = (
        db.query(Attachment)
        .filter(Attachment.backlog_item_id == item_id)
        .order_by(Attachment.created_at.desc())
        .all()
    )
    return [_attachment_response(att) for att in attachments]


@router.delete("/{project_id}/backlog/{item_id}/attachments/{attachment_id}")
async def delete_attachment(
    project_id: str,
    item_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, user_role = get_project_with_access(project_id, current_user, db, "member")

    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.backlog_item_id == item_id,
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Only uploader or admin/owner can delete
    if attachment.uploaded_by != current_user.id and user_role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Not allowed to delete this attachment")

    await storage_service.delete(attachment.file_key)

    db.delete(attachment)
    db.commit()
    return {"message": "Attachment deleted"}
