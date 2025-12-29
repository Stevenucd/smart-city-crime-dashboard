from __future__ import annotations

import os

from dotenv import load_dotenv


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _parse_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:5173"]
    return [item.strip() for item in value.split(",") if item.strip()]


class Config:
    def __init__(self) -> None:
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        load_dotenv(env_path, override=False)

        self.ENV = os.getenv("FLASK_ENV", "development")
        self.DEBUG = _parse_bool(os.getenv("FLASK_DEBUG"), default=(self.ENV == "development"))
        self.PORT = int(os.getenv("PORT", "5000"))
        self.CORS_ORIGINS = _parse_origins(os.getenv("CORS_ORIGINS"))
        self.DATABASE_URL = os.getenv("DATABASE_URL")
        if not self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL environment variable is required")
