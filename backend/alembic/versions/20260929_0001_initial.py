"""Initial time tracker schema.

Revision ID: 20260929_0001
Revises:
Create Date: 2026-09-29
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260929_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "clients",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("employer_name", sa.String(length=160), nullable=False),
        sa.Column("timezone", sa.String(length=80), nullable=False),
        sa.Column("date_format", sa.String(length=32), nullable=False),
        sa.Column("week_starts_on", sa.String(length=12), nullable=False),
        sa.Column("duration_format", sa.String(length=12), nullable=False),
        sa.Column("rounding_increment", sa.Integer(), nullable=False),
        sa.Column("default_billable", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "tags",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=True),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("billable_default", sa.Boolean(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "running_timers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entry_id", sa.Uuid(), nullable=False),
        sa.Column("description", sa.String(length=240), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("billable", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entry_id"),
    )
    op.create_table(
        "time_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("description", sa.String(length=240), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("billable", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_time_entries_date"), "time_entries", ["date"], unique=False)
    op.create_index(op.f("ix_time_entries_project_id"), "time_entries", ["project_id"], unique=False)
    op.create_table(
        "running_timer_tags",
        sa.Column("timer_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["timer_id"], ["running_timers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("timer_id", "tag_id"),
    )
    op.create_table(
        "time_entry_tags",
        sa.Column("time_entry_id", sa.Uuid(), nullable=False),
        sa.Column("tag_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["time_entry_id"], ["time_entries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("time_entry_id", "tag_id"),
    )


def downgrade() -> None:
    op.drop_table("time_entry_tags")
    op.drop_table("running_timer_tags")
    op.drop_index(op.f("ix_time_entries_project_id"), table_name="time_entries")
    op.drop_index(op.f("ix_time_entries_date"), table_name="time_entries")
    op.drop_table("time_entries")
    op.drop_table("running_timers")
    op.drop_table("projects")
    op.drop_table("tags")
    op.drop_table("settings")
    op.drop_table("clients")
