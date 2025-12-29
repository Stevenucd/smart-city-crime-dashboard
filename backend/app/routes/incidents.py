from __future__ import annotations

from datetime import datetime, time
from typing import Any, Dict, Tuple

from flask import Blueprint, jsonify, request
from sqlalchemy import text

from app.db import get_engine

MAX_LIMIT = 1000

incidents_bp = Blueprint("incidents", __name__, url_prefix="/api")


def _parse_datetime(value: str) -> datetime | None:
    candidate = value.strip()
    candidate = candidate[:-1] if candidate.endswith("Z") else candidate
    try:
        parsed = datetime.fromisoformat(candidate)
        if isinstance(parsed, datetime):
            return parsed
    except ValueError:
        pass

    try:
        date_only = datetime.strptime(candidate, "%Y-%m-%d").date()
        return datetime.combine(date_only, time.min)
    except ValueError:
        return None


def _extract_range() -> Tuple[datetime, datetime] | None:
    from_param = request.args.get("from")
    to_param = request.args.get("to")
    if not from_param or not to_param:
        return None

    start = _parse_datetime(from_param)
    end = _parse_datetime(to_param)
    if not start or not end:
        return None

    return start, end


def _build_filters() -> tuple[str, Dict[str, Any]] | tuple[None, None]:
    range_values = _extract_range()
    if not range_values:
        return None, None
    start, end = range_values

    conditions = ["occur_time >= :from_time", "occur_time < :to_time"]
    params: Dict[str, Any] = {"from_time": start, "to_time": end}

    crime_type = request.args.get("crimeType")
    if crime_type:
        conditions.append("crime_type = :crime_type")
        params["crime_type"] = crime_type

    bbox_params = (
        request.args.get("minLat"),
        request.args.get("minLon"),
        request.args.get("maxLat"),
        request.args.get("maxLon"),
    )

    if all(bbox_params):
        try:
            min_lat, min_lon, max_lat, max_lon = (float(item) for item in bbox_params)
            conditions.extend(
                [
                    "lat >= :min_lat",
                    "lat <= :max_lat",
                    "lon >= :min_lon",
                    "lon <= :max_lon",
                ]
            )
            params.update(
                {
                    "min_lat": min_lat,
                    "max_lat": max_lat,
                    "min_lon": min_lon,
                    "max_lon": max_lon,
                }
            )
        except ValueError:
            return None, None

    return " AND ".join(conditions), params


def _count_incidents(where_clause: str, params: Dict[str, Any]) -> int:
    query = text(f"SELECT COUNT(*) AS total FROM incidents WHERE {where_clause}")
    with get_engine().connect() as conn:
        result = conn.execute(query, params).scalar_one()
        return int(result)


@incidents_bp.get("/incidents/count")
def count_incidents():
    where_clause, params = _build_filters()
    if not where_clause:
        return jsonify({"error": "from/to are required and must be valid ISO strings"}), 400

    total = _count_incidents(where_clause, params)  # type: ignore[arg-type]
    return jsonify({"count": total, "cap": MAX_LIMIT})


@incidents_bp.get("/incidents")
def list_incidents():
    where_clause, params = _build_filters()
    if not where_clause:
        return jsonify({"error": "from/to are required and must be valid ISO strings"}), 400

    try:
        requested_limit = int(request.args.get("limit", MAX_LIMIT))
    except ValueError:
        requested_limit = MAX_LIMIT
    limit = min(requested_limit, MAX_LIMIT)

    total = _count_incidents(where_clause, params)  # type: ignore[arg-type]

    select_sql = text(
        f"""
        SELECT
            id,
            dr_no,
            area_name,
            crime_desc,
            premise_desc,
            weapon_desc,
            status_desc,
            location,
            lat,
            lon,
            crime_type,
            occur_time
        FROM incidents
        WHERE {where_clause}
        ORDER BY occur_time DESC
        LIMIT :limit
        """
    )

    query_params = dict(params or {})
    query_params["limit"] = limit

    with get_engine().connect() as conn:
        rows = conn.execute(select_sql, query_params).mappings().all()

    records = [
        {
            "id": row["id"],
            "drNo": row["dr_no"],
            "areaName": row["area_name"],
            "crimeDesc": row["crime_desc"],
            "premiseDesc": row["premise_desc"],
            "weaponDesc": row["weapon_desc"],
            "statusDesc": row["status_desc"],
            "location": row["location"],
            "lat": row["lat"],
            "lon": row["lon"],
            "crimeType": row["crime_type"],
            "occurTime": row["occur_time"].isoformat() if row["occur_time"] else None,
        }
        for row in rows
    ]

    truncated = total > MAX_LIMIT
    return jsonify(
        {
            "total": total,
            "cap": MAX_LIMIT,
            "truncated": truncated,
            "records": records,
        }
    )
