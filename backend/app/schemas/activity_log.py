from datetime import datetime
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer

from app.schemas.user import UserResponse


class ActivityLogResponse(BaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID
    action: str
    entity_type: str
    entity_id: UUID
    details: Optional[Any] = None
    created_at: datetime
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("id", "project_id", "user_id", "entity_id")
    def serialize_uuid(self, v: UUID) -> str:
        return str(v)
