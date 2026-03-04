from datetime import datetime, date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer


class SprintCreate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    duration_weeks: Optional[int] = None


class SprintResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    goal: Optional[str] = None
    sprint_number: int
    duration_weeks: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("id", "project_id")
    def serialize_uuid(self, v: UUID) -> str:
        return str(v)
