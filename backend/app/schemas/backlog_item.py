from datetime import date, datetime
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer, model_validator

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
    due_date: Optional[date] = None
    start_date: Optional[date] = None


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
    due_date: Optional[date] = None
    start_date: Optional[date] = None


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
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def compute_is_overdue(cls, data):
        if hasattr(data, "__dict__"):
            due = getattr(data, "due_date", None)
            status = getattr(data, "status", None)
        elif isinstance(data, dict):
            due = data.get("due_date")
            status = data.get("status")
        else:
            return data

        if due and status != "done" and due < date.today():
            if hasattr(data, "__dict__"):
                pass  # will be set below
            else:
                data["is_overdue"] = True
                return data

        return data

    @field_serializer("id", "project_id")
    def serialize_uuid(self, v: UUID) -> str:
        return str(v)

    @field_serializer("sprint_id", "assignee_id")
    def serialize_optional_uuid(self, v: Optional[UUID]) -> Optional[str]:
        return str(v) if v else None

    @model_validator(mode="after")
    def set_overdue_flag(self):
        if self.due_date and self.status != "done" and self.due_date < date.today():
            self.is_overdue = True
        else:
            self.is_overdue = False
        return self


class ReorderItem(BaseModel):
    id: str
    position: int
    sprint_id: Optional[str] = None


class ReorderRequest(BaseModel):
    items: List[ReorderItem]
