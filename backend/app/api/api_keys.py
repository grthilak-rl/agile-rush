import secrets
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.api_key import ApiKey

router = APIRouter(prefix="/api/settings", tags=["api-keys"])


class CreateApiKeyRequest(BaseModel):
    name: str


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
def create_api_key(
    data: CreateApiKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Generate a random API key
    random_part = secrets.token_hex(32)
    plaintext_key = f"ar_live_{random_part}"
    key_hash = _hash_key(plaintext_key)
    key_prefix = plaintext_key[:14]

    api_key = ApiKey(
        user_id=current_user.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=data.name,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    # Return the plaintext key ONCE
    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": plaintext_key,
        "key_prefix": key_prefix,
        "created_at": api_key.created_at.isoformat() if api_key.created_at else None,
    }


@router.get("/api-keys")
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    keys = db.query(ApiKey).filter(
        ApiKey.user_id == current_user.id,
        ApiKey.is_active == True,
    ).order_by(ApiKey.created_at.desc()).all()

    return [
        {
            "id": k.id,
            "name": k.name,
            "key_prefix": k.key_prefix,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        }
        for k in keys
    ]


@router.delete("/api-keys/{key_id}")
def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    api_key = db.query(ApiKey).filter(
        ApiKey.id == key_id,
        ApiKey.user_id == current_user.id,
    ).first()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    db.delete(api_key)
    db.commit()
    return {"message": "API key revoked"}
