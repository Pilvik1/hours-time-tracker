from sqlalchemy import select

from time_tracker.database import SessionLocal
from time_tracker.models import Project


def main() -> None:
    with SessionLocal() as db:
        existing = set(db.scalars(select(Project.name)).all())
        for name, color in [("Northstar", "#2563EB"), ("Writing", "#7C3AED"), ("Personal", "#059669")]:
            if name not in existing:
                db.add(Project(name=name, color=color))
        db.commit()
    print("Development seed data is ready.")


if __name__ == "__main__":
    main()
