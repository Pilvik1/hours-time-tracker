import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Table, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from time_tracker.database import Base

time_entry_tags = Table(
    "time_entry_tags",
    Base.metadata,
    Column("time_entry_id", Uuid(as_uuid=True), ForeignKey("time_entries.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Uuid(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

running_timer_tags = Table(
    "running_timer_tags",
    Base.metadata,
    Column("timer_id", Integer, ForeignKey("running_timers.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Uuid(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Client(TimestampMixin, Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    projects: Mapped[list["Project"]] = relationship(back_populates="client")


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    color: Mapped[str] = mapped_column(String(7), default="#4F46E5", nullable=False)
    billable_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    client: Mapped[Client | None] = relationship(back_populates="projects")
    entries: Mapped[list["TimeEntry"]] = relationship(back_populates="project")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)


class TimeEntry(TimestampMixin, Base):
    __tablename__ = "time_entries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    description: Mapped[str] = mapped_column(String(240), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    billable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    project: Mapped[Project | None] = relationship(back_populates="entries")
    tags: Mapped[list[Tag]] = relationship(secondary=time_entry_tags, lazy="selectin")


class RunningTimer(Base):
    __tablename__ = "running_timers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    entry_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4)
    description: Mapped[str] = mapped_column(String(240), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    billable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    project: Mapped[Project | None] = relationship()
    tags: Mapped[list[Tag]] = relationship(secondary=running_timer_tags, lazy="selectin")


class UserSettings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    employer_name: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    timezone: Mapped[str] = mapped_column(String(80), default="UTC", nullable=False)
    date_format: Mapped[str] = mapped_column(String(32), default="DD.MM.YYYY", nullable=False)
    week_starts_on: Mapped[str] = mapped_column(String(12), default="monday", nullable=False)
    duration_format: Mapped[str] = mapped_column(String(12), default="hh:mm", nullable=False)
    rounding_increment: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    default_billable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
