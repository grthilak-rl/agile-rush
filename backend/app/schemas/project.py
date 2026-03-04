from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer


class ProjectCreate(BaseModel):
    name: str
    client_name: Optional[str] = None
    description: Optional[str] = None
    project_type: Optional[str] = "contract"
    default_sprint_duration: Optional[int] = 2


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    description: Optional[str] = None
    project_type: Optional[str] = None
    default_sprint_duration: Optional[int] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    client_name: Optional[str] = None
    description: Optional[str] = None
    project_type: str
    default_sprint_duration: int
    owner_id: UUID
    color: str
    created_at: datetime
    updated_at: datetime
    active_sprint_name: Optional[str] = None
    total_items: int = 0
    completed_items: int = 0
    progress_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("id", "owner_id")
    def serialize_uuid(self, v: UUID) -> str:
        return str(v)


class ProjectStatsResponse(BaseModel):
    total_items: int = 0
    new_items: int = 0
    in_progress: int = 0
    completed: int = 0
    total_points: int = 0
    completed_points: int = 0
    items_this_week: int = 0
    items_last_week: int = 0
