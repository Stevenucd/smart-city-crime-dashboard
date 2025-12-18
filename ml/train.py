from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor


@dataclass(frozen=True)
class Metrics:
    mae: float
    rmse: float
    r2: float


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _build_preprocessor(df: pd.DataFrame) -> ColumnTransformer:
    numeric_cols = df.select_dtypes(include=["number", "bool"]).columns.tolist()
    categorical_cols = [c for c in df.columns if c not in numeric_cols]

    numeric_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )
    categorical_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipe, numeric_cols),
            ("cat", categorical_pipe, categorical_cols),
        ],
        remainder="drop",
    )


def _build_model(name: str, random_state: int) -> object:
    if name == "random_forest":
        return RandomForestRegressor(
            n_estimators=300,
            random_state=random_state,
            n_jobs=-1,
        )
    if name == "ridge":
        return Ridge(random_state=random_state)
    raise ValueError(f"Unknown model: {name}")


def _compute_metrics(y_true, y_pred) -> Metrics:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(mean_squared_error(y_true, y_pred, squared=False))
    r2 = float(r2_score(y_true, y_pred))
    return Metrics(mae=mae, rmse=rmse, r2=r2)


def main() -> int:
    parser = argparse.ArgumentParser(description="Train a baseline ML model from CSV.")
    parser.add_argument("--data", required=True, help="Path to a CSV file.")
    parser.add_argument("--target", default="target", help="Target column name.")
    parser.add_argument(
        "--model",
        default="random_forest",
        choices=["random_forest", "ridge"],
        help="Model type.",
    )
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument(
        "--output-dir",
        default="ml/artifacts",
        help="Base output directory (a timestamped subfolder will be created).",
    )
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")

    df = pd.read_csv(data_path)
    if args.target not in df.columns:
        raise ValueError(f"Target column '{args.target}' not found in CSV columns: {list(df.columns)}")

    y = df[args.target]
    X = df.drop(columns=[args.target])

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
    )

    preprocessor = _build_preprocessor(X_train)
    model = _build_model(args.model, random_state=args.random_state)
    pipeline = Pipeline(steps=[("preprocess", preprocessor), ("model", model)])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    metrics = _compute_metrics(y_test, y_pred)

    run_dir = Path(args.output_dir) / _utc_timestamp()
    run_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(pipeline, run_dir / "model.joblib")
    (run_dir / "metrics.json").write_text(json.dumps(asdict(metrics), indent=2), encoding="utf-8")

    metadata = {
        "data": os.fspath(data_path),
        "target": args.target,
        "model": args.model,
        "test_size": args.test_size,
        "random_state": args.random_state,
        "features": list(X.columns),
    }
    (run_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(f"Saved artifacts to: {run_dir}")
    print(f"Metrics: {asdict(metrics)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

