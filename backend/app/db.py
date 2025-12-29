from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from flask import current_app


def init_engine(database_url: str) -> Engine:
    # Validate and normalize URL early to fail fast on misconfigurations.
    url = make_url(database_url)
    return create_engine(url, pool_pre_ping=True, future=True)


def get_engine() -> Engine:
    engine = current_app.extensions.get("db_engine")
    if engine is None:
        raise RuntimeError("Database engine is not initialized")
    return engine
