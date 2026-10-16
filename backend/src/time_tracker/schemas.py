import uuid
from datetime import date as Date
from datetime import datetime, time
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ClientCreate(ApiModel):
    name: str = Field(min_length=1, max_length=120)
    active: bool = True

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class ClientUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    active: bool | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class ClientRead(ApiModel):
    id: uuid.UUID
    name: str
    active: bool
    created_at: datetime
    updated_at: datetime


class ProjectCreate(ApiModel):
    name: str = Field(min_length=1, max_length=120)
    client_id: uuid.UUID | None = None
    color: str = Field(default="#4F46E5", pattern=r"^#[0-9A-Fa-f]{6}$")
    billable_default: bool = False
    active: bool = True

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class ProjectUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    client_id: uuid.UUID | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    billable_default: bool | None = None
    active: bool | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class ProjectBrief(ApiModel):
    id: uuid.UUID
    name: str
    client_id: uuid.UUID | None
    color: str


class ProjectRead(ProjectBrief):
    billable_default: bool
    active: bool
    created_at: datetime
    updated_at: datetime
    client: ClientRead | None = None


class TagCreate(ApiModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class TagUpdate(ApiModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class TagRead(ApiModel):
    id: uuid.UUID
    name: str


class TimeEntryCreate(ApiModel):
    description: str = Field(min_length=1, max_length=240)
    comment: str | None = None
    project_id: uuid.UUID | None = None
    date: Date
    start_time: time | None = None
    end_time: time | None = None
    duration_seconds: int | None = Field(default=None, gt=0)
    billable: bool | None = None
    tags: list[uuid.UUID] = Field(default_factory=list)

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Description cannot be blank")
        return value

    @model_validator(mode="after")
    def validate_time_mode(self):
        has_start = self.start_time is not None
        has_end = self.end_time is not None
        if has_start != has_end:
            raise ValueError("start_time and end_time must be supplied together")
        if has_start == (self.duration_seconds is not None):
            raise ValueError("Provide either start_time/end_time or duration_seconds")
        return self


class TimeEntryUpdate(ApiModel):
    description: str | None = Field(default=None, min_length=1, max_length=240)
    comment: str | None = None
    project_id: uuid.UUID | None = None
    date: Date | None = None
    start_time: time | None = None
    end_time: time | None = None
    duration_seconds: int | None = Field(default=None, gt=0)
    billable: bool | None = None
    tags: list[uuid.UUID] | None = None

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Description cannot be blank")
        return value


class DuplicateEntryRequest(ApiModel):
    date: Date | None = None


class TimeEntryRead(ApiModel):
    id: uuid.UUID
    description: str
    comment: str | None
    project_id: uuid.UUID | None
    date: Date
    start_time: time | None
    end_time: time | None
    start_at: datetime | None
    end_at: datetime | None
    duration_seconds: int
    reported_duration_seconds: int
    billable: bool
    tags: list[TagRead]
    project: ProjectBrief | None
    created_at: datetime
    updated_at: datetime


class DailyTotal(ApiModel):
    date: Date
    seconds: int
    reported_seconds: int
    decimal_hours: float
    reported_decimal_hours: float


class WeeklyTotal(ApiModel):
    week_start: Date
    seconds: int
    reported_seconds: int


class EntryAggregates(ApiModel):
    daily_totals: list[DailyTotal]
    weekly_totals: list[WeeklyTotal]
    total_seconds: int
    reported_total_seconds: int
    weekly_total_seconds: int


class TimeEntryList(ApiModel):
    items: list[TimeEntryRead]
    aggregates: EntryAggregates


class TimerStart(ApiModel):
    description: str = Field(min_length=1, max_length=240)
    comment: str | None = None
    project_id: uuid.UUID | None = None
    tags: list[uuid.UUID] = Field(default_factory=list)
    billable: bool | None = None

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Description cannot be blank")
        return value


class TimerUpdate(ApiModel):
    description: str | None = Field(default=None, min_length=1, max_length=240)
    comment: str | None = None
    project_id: uuid.UUID | None = None
    tags: list[uuid.UUID] | None = None
    billable: bool | None = None

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Description cannot be blank")
        return value


class TimerStop(ApiModel):
    description: str | None = Field(default=None, min_length=1, max_length=240)
    comment: str | None = None

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Description cannot be blank")
        return value


class TimerState(ApiModel):
    running: bool
    entry_id: uuid.UUID | None
    description: str | None
    comment: str | None
    project_id: uuid.UUID | None
    started_at: datetime | None
    elapsed_seconds: int
    billable: bool | None = None
    tags: list[TagRead] = Field(default_factory=list)


class SettingsRead(ApiModel):
    name: str
    employer_name: str
    timezone: str
    date_format: str
    week_starts_on: Literal["monday", "sunday"]
    duration_format: Literal["hh:mm", "decimal"]
    rounding_increment: Literal[0, 5, 15, 30]
    default_billable: bool


class SettingsUpdate(ApiModel):
    name: str | None = Field(default=None, max_length=120)
    employer_name: str | None = Field(default=None, max_length=160)
    timezone: str | None = None
    date_format: str | None = Field(default=None, max_length=32)
    week_starts_on: Literal["monday", "sunday"] | None = None
    duration_format: Literal["hh:mm", "decimal"] | None = None
    rounding_increment: Literal[0, 5, 15, 30] | None = None
    default_billable: bool | None = None

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown timezone") from exc
        return value


class ReportBucket(ApiModel):
    key: str
    name: str
    seconds: int
    reported_seconds: int
    decimal_hours: float
    reported_decimal_hours: float


class ReportSummary(ApiModel):
    start_date: Date
    end_date: Date
    total_seconds: int
    reported_total_seconds: int
    decimal_hours: float
    reported_decimal_hours: float
    by_day: list[ReportBucket]
    by_project: list[ReportBucket]
    by_client: list[ReportBucket]
    by_tag: list[ReportBucket]
