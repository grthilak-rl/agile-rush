from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.schemas.user import UserResponse


class RetroItemCreate(BaseModel):
    content: str = Field(min_length=1)
    column: str  # "went_well" | "didnt_go_well" | "action_item"


class RetroItemUpdate(BaseModel):
    content: Optional[str] = None
    column: Optional[str] = None
    resolved: Optional[bool] = None


class RetroItemResponse(BaseModel):
    id: UUID
    sprint_id: UUID
    project_id: UUID
    column: str
    content: str
    votes: int
    voted_by: List[str] = []
    resolved: bool
    created_by: UUID
    creator: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime
    carried_over: bool = False
    user_has_voted: bool = False

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("id", "sprint_id", "project_id", "created_by")
    def serialize_uuid(self, v: UUID) -> str:
        return str(v)


class RetroResponse(BaseModel):
    went_well: List[RetroItemResponse]
    didnt_go_well: List[RetroItemResponse]
    action_item: List[RetroItemResponse]
    carried_over_actions: List[RetroItemResponse] = []
    sprint: Optional[dict] = None
