# OptiTrade Repository Structure

This note is the “map legend” for the project. When you add new top-level folders or conventions, document them here so the rest of the team can find their way around.

## High-level layout

| Path            | Purpose                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `README.md`     | Quick start guide and onboarding checklist                                   |
| `docs/`         | Extended documentation (structure guide, improvements backlog, work reports) |
| `frontend/`     | Vite + React application (source code, configs, tooling)                     |
| `backend/`      | FastAPI gateway (bot control, trades, model proxy, DB access)                |
| `model_service/`| FastAPI microservice that wraps the trading model                            |
| `scripts/`      | Data collection + feature engineering utilities for the ML workflow          |
| `requirements.txt` | Shared Python dependencies for backend + model service                   |

## Documentation set (`docs/`)

- `STRUCTURE.md` (this file) – repo map and conventions  
- `IMPROVEMENTS.md` – prioritized backlog with recommended libraries  
- `WORK_REPORT.md` – record of what shipped, when, and by whom  

Add future knowledge-base docs here (architecture decisions, release plans, troubleshooting, etc.) to keep the root clean.

## Frontend application (`frontend/`)

| Path                                       | Description                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `package.json`                             | Scripts (`dev`, `build`, `lint`, `typecheck`, `format`) + dependencies                         |
| `tsconfig*.json`                           | TypeScript configs (app build + Node tooling)                                                  |
| `vite.config.ts`                           | Vite setup with React plugin                                                                  |
| `tailwind.config.js` / `postcss.config.js` | Styling toolchain                                                                             |
| `.prettierrc` / `.prettierignore`          | Formatting rules                                                                              |
| `src/main.tsx`                             | React entry point bootstrapped by Vite                                                        |
| `src/App.tsx`                              | Route composition, providers, error boundary                                                  |
| `src/components/`                          | Shared UI/infrastructure pieces (`Sidebar`, `ProtectedRoute`, `ErrorBoundary`, etc.)          |
| `src/pages/`                               | Route-level screens (`Dashboard`, `Portfolio`, `Backtesting`, …)                              |
| `src/lib/`                                 | Supabase client plus domain helpers (`auth`, `portfolio`, future APIs)                        |
| `src/types/`                               | Centralized TypeScript definitions                                                            |
| `src/index.css`                            | Tailwind directives and global styles                                                         |

### Source-code organization tips

- Keep truly reusable pieces in `components/`.  
- Keep each route in `pages/` until it grows enough to justify a dedicated feature folder.  
- Use `lib/` for API adapters, domain logic, and Supabase helpers.  
- Treat `types/` as the single source of truth for app-specific interfaces.  
- When a feature grows (data fetching, hooks, tests), colocate it under `src/features/<name>/`.

## Environment variables

- Frontend: `frontend/.env` (copy from `.env.example`) contains `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Git ignores these files; replace placeholder values before release.
- Backend/model: load via `.env` or host environment. Key knobs: `ADMIN_API_KEY` (protect admin endpoints), `MODEL_SERVICE_URL` (defaults to `http://127.0.0.1:8001`), `DATABASE_URL` (defaults to SQLite file).

## Backend + model service

| Path                  | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `backend/main.py`     | FastAPI app exposing `/bot/*`, `/trades`, `/trades/record`, `/model/predict`, `/health` |
| `model_service/main.py` | FastAPI demo `/predict` endpoint (replace with real model inference)      |
| `requirements.txt`    | Python deps: FastAPI, Uvicorn, SQLAlchemy, httpx, Alembic, pytest, etc.     |

### Runbook

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Terminal 1 – model
uvicorn model_service.main:app --host 127.0.0.1 --port 8001 --reload

# Terminal 2 – backend gateway
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- `GET /health` verifies backend readiness.  
- `GET /bot/status` returns the in-memory bot snapshot (demo).  
- `POST /model/predict` proxies payloads to the model service (`MODEL_SERVICE_URL`).  
- `POST /trades/record` persists trades in SQLite and updates bot metrics.  
- Tables (`trades`, `bot_configs`, `backtests`) are auto-created via SQLAlchemy on startup.

## ML scripts

Located in `/scripts` (sourced from the `ML` branch):

- `data_fetch.py` — downloads OHLCV + open-interest data.  
- `feature_engineering.py` — builds technical indicators, log returns, and time-based features (see comments).  
- `pipeline.py` — orchestrates fetch + feature steps (cron-friendly, contains `run_batch_history()` bootstrap helper).  
- `scripts/Readme.md` — usage guidance (when to run each script, how to bootstrap historical data).  
- `scripts/requirements.txt` — Python deps for the data tooling.

Set up a dedicated virtualenv or reuse the root one before running these utilities.

## Day-to-day workflow 🛠️

```bash
cd frontend
npm install          # install dependencies
npm run dev          # Vite dev server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # production bundle
npm run format       # Prettier write
```

Use this document as the canonical reference whenever the project layout evolves. If something feels undocumented, drop a note here.
