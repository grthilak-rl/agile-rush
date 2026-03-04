from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer

from app.schemas.user import UserResponse


class BacklogItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: Optional[str] = "story"
    priority: Optional[str] = "medium"
    status: Optional[str] = "backlog"
    story_points: Optional[int] = None
    assignee_id: Optional[str] = None
    sprint_id: Optional[str] = None
    labels: Optional[List[str]] = []
    acceptance_criteria: Optional[Any] = None


class BacklogItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    story_points: Optional[int] = None
    assignee_id: Optional[str] = None
    sprint_id: Optional[str] = None
    labels: Optional[List[str]] = None
    acceptance_criteria: Optional[Any] = None


class BacklogItemResponse(BaseModel):
    id: UUID
    project_id: UUID
    sprint_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    type: str
    priority: str
    status: str
    story_points: Optional[int] = None
    position: int
    assignee_id: Optional[UUID] = None
    labels: Optional[List[str]] = []
    acceptance_criteria: Optional[Any] = None
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("id", "project_id")
    def serialize_uuid(self, v: UUID) -> str:
        return str(v)

    @field_serializer("sprint_id", "assignee_id")
    def serialize_optional_uuid(self, v: Optional[UUID]) -> Optional[str]:
        return str(v) if v else None


class ReorderItem(BaseModel):
    id: str
    position: int
    sprint_id: Optional[str] = None


class ReorderRequest(BaseModel):
    items: List[ReorderItem]
