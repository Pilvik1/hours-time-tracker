import os
import sys
from pathlib import Path

import uvicorn
from alembic.config import Config

from alembic import command


def resource_root() -> Path:
    frozen_root = getattr(sys, "_MEIPASS", None)
    if frozen_root:
        return Path(frozen_root)
    return Path(__file__).resolve().parents[2]


def run_migrations() -> None:
    root = resource_root()
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "alembic"))
    command.upgrade(config, "head")


def main() -> None:
    run_migrations()
    from time_tracker.main import create_app

    host = os.environ.get("HOURS_BACKEND_HOST", "127.0.0.1")
    port = int(os.environ.get("HOURS_BACKEND_PORT", "8765"))
    uvicorn.run(create_app(), host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
