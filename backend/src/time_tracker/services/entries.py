import uuid
from collections import defaultdict
from datetime import date, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload, selectinload

from time_tracker import models, schemas
from time_tracker.services.common import get_project, get_settings, get_tags
from time_tracker.time_utils import as_utc, calculate_interval, decimal_hours, round_seconds

ENTRY_LOAD_OPTIONS = (
    joinedload(models.TimeEntry.project).joinedload(models.Project.client),
    selectinload(models.TimeEntry.tags),
)


def load_entry(db: Session, entry_id: uuid.UUID) -> models.TimeEntry:
    entry = db.scalar(select(models.TimeEntry).where(models.TimeEntry.id == entry_id).options(*ENTRY_LOAD_OPTIONS))
    if entry is None:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return entry


def serialize_entry(entry: models.TimeEntry, timezone_name: str, rounding_increment: int) -> schemas.TimeEntryRead:
    zone = ZoneInfo(timezone_name)
    start_at = as_utc(entry.start_at) if entry.start_at else None
    end_at = as_utc(entry.end_at) if entry.end_at else None
    return schemas.TimeEntryRead(
        id=entry.id,
        description=entry.description,
        comment=entry.comment,
        project_id=entry.project_id,
        date=entry.date,
        start_time=start_at.astimezone(zone).time().replace(tzinfo=None, microsecond=0) if start_at else None,
        end_time=end_at.astimezone(zone).time().replace(tzinfo=None, microsecond=0) if end_at else None,
        start_at=start_at,
        end_at=end_at,
        duration_seconds=entry.duration_seconds,
        reported_duration_seconds=round_seconds(entry.duration_seconds, rounding_increment),
        billable=entry.billable,
        tags=entry.tags,
        project=entry.project,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


def create_entry(db: Session, payload: schemas.TimeEntryCreate) -> models.TimeEntry:
    settings = get_settings(db)
    project = get_project(db, payload.project_id)
    tags = get_tags(db, payload.tags)
    start_at = end_at = None
    if payload.start_time is not None and payload.end_time is not None:
        start_at, end_at, duration = calculate_interval(
            payload.date, payload.start_time, payload.end_time, settings.timezone
        )
    else:
        duration = payload.duration_seconds
    assert duration is not None
    billable = payload.billable
    if billable is None:
        billable = project.billable_default if project else settings.default_billable
    entry = models.TimeEntry(
        description=payload.description.strip(),
        comment=payload.comment,
        project=project,
        date=payload.date,
        start_at=start_at,
        end_at=end_at,
        duration_seconds=duration,
        billable=billable,
        tags=tags,
    )
    db.add(entry)
    db.commit()
    return load_entry(db, entry.id)


def update_entry(db: Session, entry: models.TimeEntry, payload: schemas.TimeEntryUpdate) -> models.TimeEntry:
    settings = get_settings(db)
    fields = payload.model_fields_set
    if "description" in fields and payload.description is not None:
        entry.description = payload.description.strip()
    if "comment" in fields:
        entry.comment = payload.comment
    if "project_id" in fields:
        entry.project = get_project(db, payload.project_id)
    if "billable" in fields and payload.billable is not None:
        entry.billable = payload.billable
    if "tags" in fields and payload.tags is not None:
        entry.tags = get_tags(db, payload.tags)

    target_date = payload.date if "date" in fields and payload.date is not None else entry.date
    time_fields = {"start_time", "end_time"} & fields
    if "duration_seconds" in fields and payload.duration_seconds is not None:
        if time_fields:
            raise HTTPException(status_code=422, detail="Cannot set duration_seconds together with start/end times")
        entry.start_at = None
        entry.end_at = None
        entry.duration_seconds = payload.duration_seconds
    elif time_fields:
        if payload.start_time is None or payload.end_time is None:
            raise HTTPException(status_code=422, detail="start_time and end_time must be supplied together")
        entry.start_at, entry.end_at, entry.duration_seconds = calculate_interval(
            target_date, payload.start_time, payload.end_time, settings.timezone
        )
    elif "date" in fields and payload.date is not None and entry.start_at and entry.end_at:
        zone = ZoneInfo(settings.timezone)
        old_start = as_utc(entry.start_at).astimezone(zone).time().replace(tzinfo=None)
        old_end = as_utc(entry.end_at).astimezone(zone).time().replace(tzinfo=None)
        entry.start_at, entry.end_at, entry.duration_seconds = calculate_interval(
            target_date, old_start, old_end, settings.timezone
        )
    entry.date = target_date
    db.commit()
    return load_entry(db, entry.id)


def duplicate_entry(db: Session, entry: models.TimeEntry, target_date: date | None) -> models.TimeEntry:
    settings = get_settings(db)
    new_date = target_date or entry.date
    start_at = entry.start_at
    end_at = entry.end_at
    duration = entry.duration_seconds
    if target_date and start_at and end_at:
        zone = ZoneInfo(settings.timezone)
        start_time = as_utc(start_at).astimezone(zone).time().replace(tzinfo=None)
        end_time = as_utc(end_at).astimezone(zone).time().replace(tzinfo=None)
        start_at, end_at, duration = calculate_interval(new_date, start_time, end_time, settings.timezone)
    copy = models.TimeEntry(
        description=entry.description,
        comment=entry.comment,
        project=entry.project,
        date=new_date,
        start_at=start_at,
        end_at=end_at,
        duration_seconds=duration,
        billable=entry.billable,
        tags=list(entry.tags),
    )
    db.add(copy)
    db.commit()
    return load_entry(db, copy.id)


def entries_query(
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    project_id: uuid.UUID | None = None,
    client_id: uuid.UUID | None = None,
    tag_id: uuid.UUID | None = None,
    billable: bool | None = None,
) -> Select:
    query = select(models.TimeEntry).options(*ENTRY_LOAD_OPTIONS)
    if start_date:
        query = query.where(models.TimeEntry.date >= start_date)
    if end_date:
        query = query.where(models.TimeEntry.date <= end_date)
    if project_id:
        query = query.where(models.TimeEntry.project_id == project_id)
    if client_id:
        query = query.join(models.TimeEntry.project).where(models.Project.client_id == client_id)
    if tag_id:
        query = query.join(models.TimeEntry.tags).where(models.Tag.id == tag_id)
    if billable is not None:
        query = query.where(models.TimeEntry.billable == billable)
    return query.order_by(models.TimeEntry.date, models.TimeEntry.start_at, models.TimeEntry.created_at)


def list_entries(db: Session, **filters) -> list[models.TimeEntry]:
    return list(db.scalars(entries_query(**filters)).unique().all())


def entry_aggregates(
    entries: list[models.TimeEntry], rounding_increment: int, week_starts_on: str
) -> schemas.EntryAggregates:
    by_day: dict[date, list[int]] = defaultdict(lambda: [0, 0])
    by_week: dict[date, list[int]] = defaultdict(lambda: [0, 0])
    week_offset = 0 if week_starts_on == "monday" else 1
    for entry in entries:
        reported = round_seconds(entry.duration_seconds, rounding_increment)
        by_day[entry.date][0] += entry.duration_seconds
        by_day[entry.date][1] += reported
        days_since_start = (entry.date.weekday() + week_offset) % 7
        week_start = entry.date - timedelta(days=days_since_start)
        by_week[week_start][0] += entry.duration_seconds
        by_week[week_start][1] += reported
    daily = [
        schemas.DailyTotal(
            date=day,
            seconds=totals[0],
            reported_seconds=totals[1],
            decimal_hours=decimal_hours(totals[0]),
            reported_decimal_hours=decimal_hours(totals[1]),
        )
        for day, totals in sorted(by_day.items())
    ]
    weekly = [
        schemas.WeeklyTotal(week_start=day, seconds=totals[0], reported_seconds=totals[1])
        for day, totals in sorted(by_week.items())
    ]
    exact = sum(entry.duration_seconds for entry in entries)
    reported = sum(round_seconds(entry.duration_seconds, rounding_increment) for entry in entries)
    return schemas.EntryAggregates(
        daily_totals=daily,
        weekly_totals=weekly,
        total_seconds=exact,
        reported_total_seconds=reported,
        weekly_total_seconds=exact,
    )
