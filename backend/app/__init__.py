from __future__ import annotations

from flask import Flask

from .config import Config
from .db import init_engine
from .extensions import cors
from .routes import register_routes


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config())

    # Initialize database engine and attach to app for reuse.
    engine = init_engine(app.config["DATABASE_URL"])
    app.extensions["db_engine"] = engine

    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    register_routes(app)

    return app
