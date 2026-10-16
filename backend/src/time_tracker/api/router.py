import re
import uuid
from datetime import date, timedelta
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from time_tracker import models, schemas
from time_tracker.database import get_db
from time_tracker.services.common import get_client, get_project, get_settings
from time_tracker.services.entries import (
    create_entry,
    duplicate_entry,
    entry_aggregates,
    list_entries,
    load_entry,
    serialize_entry,
    update_entry,
)
from time_tracker.services.export import create_xlsx
from time_tracker.services.reporting import build_report
from time_tracker.services.timer import (
    load_timer,
    restart_entry,
    serialize_timer,
    start_timer,
    stop_timer,
    update_timer,
)

router = APIRouter(prefix="/api")


def _commit_or_conflict(db: Session, message: str) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=message) from exc


def _date_range(
    db: Session,
    start_date: date | None,
    end_date: date | None,
    day: date | None,
    week: date | None,
    month: str | None,
) -> tuple[date | None, date | None]:
    modes = sum(value is not None for value in (day, week, month))
    if modes > 1 or (modes and (start_date or end_date)):
        raise HTTPException(status_code=422, detail="Use only one date selection mode")
    if day:
        return day, day
    if week:
        settings = get_settings(db)
        offset = week.weekday() if settings.week_starts_on == "monday" else (week.weekday() + 1) % 7
        beginning = week - timedelta(days=offset)
        return beginning, beginning + timedelta(days=6)
    if month:
        if not re.fullmatch(r"\d{4}-\d{2}", month):
            raise HTTPException(status_code=422, detail="month must use YYYY-MM")
        try:
            beginning = date.fromisoformat(f"{month}-01")
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid month") from exc
        next_month = (beginning.replace(day=28) + timedelta(days=4)).replace(day=1)
        return beginning, next_month - timedelta(days=1)
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must not be after end_date")
    return start_date, end_date


@router.get("/settings", response_model=schemas.SettingsRead, tags=["settings"])
def read_settings(db: Session = Depends(get_db)):
    return get_settings(db)


@router.patch("/settings", response_model=schemas.SettingsRead, tags=["settings"])
def patch_settings(payload: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    settings = get_settings(db)
    for field in payload.model_fields_set:
        value = getattr(payload, field)
        if value is not None:
            setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/clients", response_model=list[schemas.ClientRead], tags=["clients"])
def list_clients(active: bool | None = None, db: Session = Depends(get_db)):
    query = select(models.Client).order_by(models.Client.name)
    if active is not None:
        query = query.where(models.Client.active == active)
    return list(db.scalars(query).all())


@router.post("/clients", response_model=schemas.ClientRead, status_code=201, tags=["clients"])
def create_client(payload: schemas.ClientCreate, db: Session = Depends(get_db)):
    client = models.Client(name=payload.name, active=payload.active)
    db.add(client)
    _commit_or_conflict(db, "A client with this name already exists")
    db.refresh(client)
    return client


@router.get("/clients/{client_id}", response_model=schemas.ClientRead, tags=["clients"])
def read_client(client_id: uuid.UUID, db: Session = Depends(get_db)):
    client = db.get(models.Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch("/clients/{client_id}", response_model=schemas.ClientRead, tags=["clients"])
def patch_client(client_id: uuid.UUID, payload: schemas.ClientUpdate, db: Session = Depends(get_db)):
    client = db.get(models.Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for field in payload.model_fields_set:
        value = getattr(payload, field)
        if value is not None:
            setattr(client, field, value.strip() if field == "name" else value)
    _commit_or_conflict(db, "A client with this name already exists")
    db.refresh(client)
    return client


@router.delete("/clients/{client_id}", status_code=204, tags=["clients"])
def delete_client(client_id: uuid.UUID, db: Session = Depends(get_db)):
    client = db.get(models.Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if db.scalar(select(models.Project.id).where(models.Project.client_id == client_id).limit(1)):
        raise HTTPException(status_code=409, detail="Client is used by a project; archive it instead")
    db.delete(client)
    db.commit()
    return Response(status_code=204)


@router.get("/projects", response_model=list[schemas.ProjectRead], tags=["projects"])
def list_projects(active: bool | None = None, db: Session = Depends(get_db)):
    query = select(models.Project).options(joinedload(models.Project.client)).order_by(models.Project.name)
    if active is not None:
        query = query.where(models.Project.active == active)
    return list(db.scalars(query).all())


@router.post("/projects", response_model=schemas.ProjectRead, status_code=201, tags=["projects"])
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    project = models.Project(
        name=payload.name,
        client=get_client(db, payload.client_id),
        color=payload.color.upper(),
        billable_default=payload.billable_default,
        active=payload.active,
    )
    db.add(project)
    _commit_or_conflict(db, "A project with this name already exists")
    return db.scalar(
        select(models.Project).where(models.Project.id == project.id).options(joinedload(models.Project.client))
    )


@router.get("/projects/{project_id}", response_model=schemas.ProjectRead, tags=["projects"])
def read_project(project_id: uuid.UUID, db: Session = Depends(get_db)):
    project = db.scalar(
        select(models.Project).where(models.Project.id == project_id).options(joinedload(models.Project.client))
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/projects/{project_id}", response_model=schemas.ProjectRead, tags=["projects"])
def patch_project(project_id: uuid.UUID, payload: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    fields = payload.model_fields_set
    if "client_id" in fields:
        project.client = get_client(db, payload.client_id)
    for field in fields - {"client_id"}:
        value = getattr(payload, field)
        if value is not None:
            if field == "name":
                value = value.strip()
            if field == "color":
                value = value.upper()
            setattr(project, field, value)
    _commit_or_conflict(db, "A project with this name already exists")
    return db.scalar(
        select(models.Project).where(models.Project.id == project.id).options(joinedload(models.Project.client))
    )


@router.post("/projects/{project_id}/archive", response_model=schemas.ProjectRead, tags=["projects"])
def archive_project(project_id: uuid.UUID, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    project.active = False
    db.commit()
    return db.scalar(
        select(models.Project).where(models.Project.id == project.id).options(joinedload(models.Project.client))
    )


@router.get("/tags", response_model=list[schemas.TagRead], tags=["tags"])
def list_tags(db: Session = Depends(get_db)):
    return list(db.scalars(select(models.Tag).order_by(models.Tag.name)).all())


@router.post("/tags", response_model=schemas.TagRead, status_code=201, tags=["tags"])
def create_tag(payload: schemas.TagCreate, db: Session = Depends(get_db)):
    tag = models.Tag(name=payload.name)
    db.add(tag)
    _commit_or_conflict(db, "A tag with this name already exists")
    db.refresh(tag)
    return tag


@router.patch("/tags/{tag_id}", response_model=schemas.TagRead, tags=["tags"])
def patch_tag(tag_id: uuid.UUID, payload: schemas.TagUpdate, db: Session = Depends(get_db)):
    tag = db.get(models.Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    tag.name = payload.name.strip()
    _commit_or_conflict(db, "A tag with this name already exists")
    db.refresh(tag)
    return tag


@router.get("/tags/{tag_id}", response_model=schemas.TagRead, tags=["tags"])
def read_tag(tag_id: uuid.UUID, db: Session = Depends(get_db)):
    tag = db.get(models.Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.delete("/tags/{tag_id}", status_code=204, tags=["tags"])
def delete_tag(tag_id: uuid.UUID, db: Session = Depends(get_db)):
    tag = db.get(models.Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return Response(status_code=204)


@router.get("/time-entries", response_model=schemas.TimeEntryList, tags=["time entries"])
def read_entries(
    start_date: date | None = None,
    end_date: date | None = None,
    day: date | None = None,
    week: date | None = None,
    month: str | None = None,
    project_id: uuid.UUID | None = None,
    client_id: uuid.UUID | None = None,
    tag_id: uuid.UUID | None = None,
    billable: bool | None = None,
    db: Session = Depends(get_db),
):
    start_date, end_date = _date_range(db, start_date, end_date, day, week, month)
    settings = get_settings(db)
    entries = list_entries(
        db,
        start_date=start_date,
        end_date=end_date,
        project_id=project_id,
        client_id=client_id,
        tag_id=tag_id,
        billable=billable,
    )
    return schemas.TimeEntryList(
        items=[serialize_entry(entry, settings.timezone, settings.rounding_increment) for entry in entries],
        aggregates=entry_aggregates(entries, settings.rounding_increment, settings.week_starts_on),
    )


@router.post("/time-entries", response_model=schemas.TimeEntryRead, status_code=201, tags=["time entries"])
def post_entry(payload: schemas.TimeEntryCreate, db: Session = Depends(get_db)):
    entry = create_entry(db, payload)
    settings = get_settings(db)
    return serialize_entry(entry, settings.timezone, settings.rounding_increment)


@router.get("/time-entries/{entry_id}", response_model=schemas.TimeEntryRead, tags=["time entries"])
def read_entry(entry_id: uuid.UUID, db: Session = Depends(get_db)):
    entry = load_entry(db, entry_id)
    settings = get_settings(db)
    return serialize_entry(entry, settings.timezone, settings.rounding_increment)


@router.patch("/time-entries/{entry_id}", response_model=schemas.TimeEntryRead, tags=["time entries"])
def patch_entry(entry_id: uuid.UUID, payload: schemas.TimeEntryUpdate, db: Session = Depends(get_db)):
    entry = update_entry(db, load_entry(db, entry_id), payload)
    settings = get_settings(db)
    return serialize_entry(entry, settings.timezone, settings.rounding_increment)


@router.delete("/time-entries/{entry_id}", status_code=204, tags=["time entries"])
def delete_entry(entry_id: uuid.UUID, db: Session = Depends(get_db)):
    entry = load_entry(db, entry_id)
    db.delete(entry)
    db.commit()
    return Response(status_code=204)


@router.post(
    "/time-entries/{entry_id}/duplicate", response_model=schemas.TimeEntryRead, status_code=201, tags=["time entries"]
)
def post_duplicate(entry_id: uuid.UUID, payload: schemas.DuplicateEntryRequest, db: Session = Depends(get_db)):
    entry = duplicate_entry(db, load_entry(db, entry_id), payload.date)
    settings = get_settings(db)
    return serialize_entry(entry, settings.timezone, settings.rounding_increment)


@router.get("/timer", response_model=schemas.TimerState, tags=["timer"])
def get_timer(db: Session = Depends(get_db)):
    return serialize_timer(load_timer(db))


@router.post("/timer/start", response_model=schemas.TimerState, status_code=201, tags=["timer"])
def post_timer_start(payload: schemas.TimerStart, db: Session = Depends(get_db)):
    return serialize_timer(start_timer(db, payload))


@router.patch("/timer", response_model=schemas.TimerState, tags=["timer"])
def patch_timer(payload: schemas.TimerUpdate, db: Session = Depends(get_db)):
    return serialize_timer(update_timer(db, payload))


@router.post("/timer/stop", response_model=schemas.TimeEntryRead, tags=["timer"])
def post_timer_stop(payload: schemas.TimerStop = schemas.TimerStop(), db: Session = Depends(get_db)):
    entry = stop_timer(db, payload)
    settings = get_settings(db)
    return serialize_entry(entry, settings.timezone, settings.rounding_increment)


@router.post("/timer/restart/{entry_id}", response_model=schemas.TimerState, status_code=201, tags=["timer"])
def post_timer_restart(entry_id: uuid.UUID, db: Session = Depends(get_db)):
    return serialize_timer(restart_entry(db, entry_id))


@router.get("/reports/summary", response_model=schemas.ReportSummary, tags=["reports"])
def report_summary(
    start_date: date,
    end_date: date,
    project_id: uuid.UUID | None = None,
    client_id: uuid.UUID | None = None,
    tag_id: uuid.UUID | None = None,
    billable: bool | None = None,
    db: Session = Depends(get_db),
):
    if start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must not be after end_date")
    settings = get_settings(db)
    entries = list_entries(
        db,
        start_date=start_date,
        end_date=end_date,
        project_id=project_id,
        client_id=client_id,
        tag_id=tag_id,
        billable=billable,
    )
    return build_report(entries, start_date, end_date, settings.rounding_increment)


@router.get("/exports/xlsx", tags=["exports"])
def export_xlsx(
    start_date: date,
    end_date: date,
    project_id: uuid.UUID | None = None,
    client_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    if start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must not be after end_date")
    settings = get_settings(db)
    entries = list_entries(db, start_date=start_date, end_date=end_date, project_id=project_id, client_id=client_id)
    payload = create_xlsx(entries, settings, start_date, end_date)
    filename = f"timesheet_{start_date.isoformat()}_{end_date.isoformat()}.xlsx"
    return StreamingResponse(
        BytesIO(payload),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
