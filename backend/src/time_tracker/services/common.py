import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from time_tracker import models
from time_tracker.config import get_config


def get_settings(db: Session) -> models.UserSettings:
    settings = db.get(models.UserSettings, 1)
    if settings is None:
        settings = models.UserSettings(id=1, timezone=get_config().time_tracker_timezone)
        db.add(settings)
        try:
            db.commit()
        except IntegrityError:
            # Multiple first-load requests can race to create the singleton row.
            # The winner committed valid settings; reload those settings for the
            # losing request instead of surfacing a transient 500 response.
            db.rollback()
            settings = db.get(models.UserSettings, 1)
            if settings is None:
                raise
        db.refresh(settings)
    return settings


def get_project(db: Session, project_id: uuid.UUID | None) -> models.Project | None:
    if project_id is None:
        return None
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=422, detail="Project not found")
    return project


def get_client(db: Session, client_id: uuid.UUID | None) -> models.Client | None:
    if client_id is None:
        return None
    client = db.get(models.Client, client_id)
    if client is None:
        raise HTTPException(status_code=422, detail="Client not found")
    return client


def get_tags(db: Session, tag_ids: list[uuid.UUID]) -> list[models.Tag]:
    if not tag_ids:
        return []
    unique_ids = list(dict.fromkeys(tag_ids))
    tags = list(db.scalars(select(models.Tag).where(models.Tag.id.in_(unique_ids))).all())
    if len(tags) != len(unique_ids):
        found = {tag.id for tag in tags}
        missing = [str(tag_id) for tag_id in unique_ids if tag_id not in found]
        raise HTTPException(status_code=422, detail={"message": "Tag not found", "ids": missing})
    by_id = {tag.id: tag for tag in tags}
    return [by_id[tag_id] for tag_id in unique_ids]
