from datetime import UTC, date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status


def utc_now() -> datetime:
    return datetime.now(UTC)


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def timezone_or_422(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown timezone: {name}",
        ) from exc


def local_datetime(day: date, value: time, timezone_name: str) -> datetime:
    return datetime.combine(day, value, tzinfo=timezone_or_422(timezone_name))


def calculate_interval(
    day: date,
    start: time,
    end: time,
    timezone_name: str,
) -> tuple[datetime, datetime, int]:
    if start == end:
        raise HTTPException(status_code=422, detail="Start time and end time cannot be equal")
    start_local = local_datetime(day, start, timezone_name)
    end_day = day + timedelta(days=1) if end < start else day
    end_local = local_datetime(end_day, end, timezone_name)
    start_utc = start_local.astimezone(UTC)
    end_utc = end_local.astimezone(UTC)
    seconds = int((end_utc - start_utc).total_seconds())
    if seconds <= 0:
        raise HTTPException(status_code=422, detail="Duration must be greater than zero")
    return start_utc, end_utc, seconds


def round_seconds(seconds: int, increment_minutes: int) -> int:
    if increment_minutes == 0:
        return seconds
    increment_seconds = increment_minutes * 60
    increments = (Decimal(seconds) / Decimal(increment_seconds)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(increments) * increment_seconds


def decimal_hours(seconds: int) -> float:
    return round(seconds / 3600, 4)


def duration_hhmm(seconds: int) -> str:
    hours, remainder = divmod(seconds, 3600)
    minutes = remainder // 60
    return f"{hours:02d}:{minutes:02d}"
