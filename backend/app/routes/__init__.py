from __future__ import annotations

from flask import Flask

from .health import health_bp
from .incidents import incidents_bp


def register_routes(app: Flask) -> None:
    app.register_blueprint(health_bp)
    app.register_blueprint(incidents_bp)
