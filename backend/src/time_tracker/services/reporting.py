from collections import defaultdict
from datetime import date

from time_tracker import models, schemas
from time_tracker.time_utils import decimal_hours, round_seconds


def _bucket(key: str, name: str, totals: list[int]) -> schemas.ReportBucket:
    return schemas.ReportBucket(
        key=key,
        name=name,
        seconds=totals[0],
        reported_seconds=totals[1],
        decimal_hours=decimal_hours(totals[0]),
        reported_decimal_hours=decimal_hours(totals[1]),
    )


def build_report(
    entries: list[models.TimeEntry], start_date: date, end_date: date, rounding_increment: int
) -> schemas.ReportSummary:
    days: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    projects: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    clients: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    tags: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])

    for entry in entries:
        exact = entry.duration_seconds
        reported = round_seconds(exact, rounding_increment)
        day_key = entry.date.isoformat()
        days[(day_key, day_key)][0] += exact
        days[(day_key, day_key)][1] += reported

        project_key = str(entry.project_id) if entry.project_id else "unassigned"
        project_name = entry.project.name if entry.project else "No project"
        projects[(project_key, project_name)][0] += exact
        projects[(project_key, project_name)][1] += reported

        client = entry.project.client if entry.project else None
        client_key = str(client.id) if client else "unassigned"
        client_name = client.name if client else "No client"
        clients[(client_key, client_name)][0] += exact
        clients[(client_key, client_name)][1] += reported

        entry_tags = entry.tags or [None]
        for tag in entry_tags:
            tag_key = str(tag.id) if tag else "untagged"
            tag_name = tag.name if tag else "Untagged"
            tags[(tag_key, tag_name)][0] += exact
            tags[(tag_key, tag_name)][1] += reported

    exact_total = sum(entry.duration_seconds for entry in entries)
    reported_total = sum(round_seconds(entry.duration_seconds, rounding_increment) for entry in entries)
    return schemas.ReportSummary(
        start_date=start_date,
        end_date=end_date,
        total_seconds=exact_total,
        reported_total_seconds=reported_total,
        decimal_hours=decimal_hours(exact_total),
        reported_decimal_hours=decimal_hours(reported_total),
        by_day=[_bucket(*key, totals) for key, totals in sorted(days.items())],
        by_project=[_bucket(*key, totals) for key, totals in sorted(projects.items(), key=lambda item: item[0][1])],
        by_client=[_bucket(*key, totals) for key, totals in sorted(clients.items(), key=lambda item: item[0][1])],
        by_tag=[_bucket(*key, totals) for key, totals in sorted(tags.items(), key=lambda item: item[0][1])],
    )
