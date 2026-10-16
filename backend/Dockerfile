FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src ./src
COPY alembic.ini ./
COPY alembic ./alembic
COPY scripts ./scripts

RUN python -m pip install --no-cache-dir --upgrade "pip>=26.2" && \
    python -m pip install --no-cache-dir .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn time_tracker.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
