import uuid
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from time_tracker import models, schemas
from time_tracker.services.common import get_project, get_settings, get_tags
from time_tracker.services.entries import load_entry
from time_tracker.time_utils import as_utc, utc_now


def load_timer(db: Session, for_update: bool = False) -> models.RunningTimer | None:
    query = (
        select(models.RunningTimer).where(models.RunningTimer.id == 1).options(selectinload(models.RunningTimer.tags))
    )
    if for_update:
        query = query.with_for_update()
    return db.scalar(query)


def serialize_timer(timer: models.RunningTimer | None) -> schemas.TimerState:
    if timer is None:
        return schemas.TimerState(
            running=False,
            entry_id=None,
            description=None,
            comment=None,
            project_id=None,
            started_at=None,
            elapsed_seconds=0,
        )
    started_at = as_utc(timer.started_at)
    elapsed = max(0, int((utc_now() - started_at).total_seconds()))
    return schemas.TimerState(
        running=True,
        entry_id=timer.entry_id,
        description=timer.description,
        comment=timer.comment,
        project_id=timer.project_id,
        started_at=started_at,
        elapsed_seconds=elapsed,
        billable=timer.billable,
        tags=timer.tags,
    )


def start_timer(db: Session, payload: schemas.TimerStart) -> models.RunningTimer:
    if load_timer(db, for_update=True) is not None:
        raise HTTPException(status_code=409, detail="A timer is already running")
    settings = get_settings(db)
    project = get_project(db, payload.project_id)
    billable = payload.billable
    if billable is None:
        billable = project.billable_default if project else settings.default_billable
    timer = models.RunningTimer(
        id=1,
        entry_id=uuid.uuid4(),
        description=payload.description.strip(),
        comment=payload.comment,
        project=project,
        started_at=utc_now(),
        billable=billable,
        tags=get_tags(db, payload.tags),
    )
    db.add(timer)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A timer is already running") from exc
    return load_timer(db)  # type: ignore[return-value]


def update_timer(db: Session, payload: schemas.TimerUpdate) -> models.RunningTimer:
    timer = load_timer(db, for_update=True)
    if timer is None:
        raise HTTPException(status_code=409, detail="No timer is running")
    fields = payload.model_fields_set
    if "description" in fields and payload.description is not None:
        timer.description = payload.description.strip()
    if "comment" in fields:
        timer.comment = payload.comment
    if "project_id" in fields:
        timer.project = get_project(db, payload.project_id)
    if "billable" in fields and payload.billable is not None:
        timer.billable = payload.billable
    if "tags" in fields and payload.tags is not None:
        timer.tags = get_tags(db, payload.tags)
    db.commit()
    return load_timer(db)  # type: ignore[return-value]


def stop_timer(db: Session, payload: schemas.TimerStop) -> models.TimeEntry:
    timer = load_timer(db, for_update=True)
    if timer is None:
        raise HTTPException(status_code=409, detail="No timer is running")
    settings = get_settings(db)
    stopped_at = utc_now()
    started_at = as_utc(timer.started_at)
    duration = int((stopped_at - started_at).total_seconds())
    if duration <= 0:
        raise HTTPException(status_code=422, detail="Timer must run for at least one second")
    description = payload.description.strip() if payload.description is not None else timer.description
    comment = payload.comment if "comment" in payload.model_fields_set else timer.comment
    entry_id = timer.entry_id
    entry = models.TimeEntry(
        id=entry_id,
        description=description,
        comment=comment,
        project=timer.project,
        date=started_at.astimezone(ZoneInfo(settings.timezone)).date(),
        start_at=started_at,
        end_at=stopped_at,
        duration_seconds=duration,
        billable=timer.billable,
        tags=list(timer.tags),
    )
    db.delete(timer)
    db.add(entry)
    db.commit()
    return load_entry(db, entry_id)


def restart_entry(db: Session, entry_id: uuid.UUID) -> models.RunningTimer:
    entry = load_entry(db, entry_id)
    payload = schemas.TimerStart(
        description=entry.description,
        comment=entry.comment,
        project_id=entry.project_id,
        tags=[tag.id for tag in entry.tags],
        billable=entry.billable,
    )
    return start_timer(db, payload)
