# smart-city-crime-dashboard
This project builds an interactive map dashboard that shows crime by area and type. Users can explore hotspots and see trends over time etc.<br>
The project will also include crime prediction, such as predicting monthly crime counts in neighbourhoods or estimating the likelihood of certain crime types, and these should be integrated in crime dashboard.

## Dev

### Backend (Flask)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/run.py
```

Health check: `GET http://127.0.0.1:5000/api/health`

### Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server proxies `/api/*` to Flask (`http://127.0.0.1:5000`) via `frontend/vite.config.ts`.

### ML (Training)

```bash
python -m venv .venv-ml
source .venv-ml/bin/activate
pip install -r ml/requirements.txt
python ml/train.py --data ml/data/crime.csv --target target
```
