from functools import lru_cache
from typing import Annotated

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class AppConfig(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Hours Time Tracker API"
    database_url: str = "postgresql+psycopg://timetracker:timetracker@localhost:5432/timetracker"
    time_tracker_cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8080",
        ]
    )
    time_tracker_timezone: str = "UTC"
    time_tracker_password_hash: str = ""
    time_tracker_password: SecretStr = SecretStr("")
    time_tracker_desktop_api_token: SecretStr = SecretStr("")
    time_tracker_session_secret: str = ""
    time_tracker_cookie_secure: bool = False
    time_tracker_session_max_age_seconds: int = Field(default=604800, ge=900, le=2592000)

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if isinstance(value, str):
            if value.startswith("postgres://"):
                return value.replace("postgres://", "postgresql+psycopg://", 1)
            if value.startswith("postgresql://"):
                return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @field_validator("time_tracker_cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_config() -> AppConfig:
    return AppConfig()
