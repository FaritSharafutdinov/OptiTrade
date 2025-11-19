# OptiTrade Frontend

OptiTrade is a Vite + React single-page application for monitoring and operating our trading agent. Supabase powers auth/data, Tailwind handles styling, and TypeScript keeps state predictable. This document is the on-ramp for new contributors.

## Repository layout

| Path               | Purpose                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `frontend/`        | React application (source, configs, tooling)                         |
| `backend/`         | FastAPI gateway for bot control, trades, and Supabase-facing APIs    |
| `model_service/`   | Lightweight FastAPI wrapper around the trading model                 |
| `scripts/`         | Data collection + feature engineering utilities for the ML pipeline  |
| `docs/`            | Living documentation bundle: structure guide, improvements, work log |
| `requirements.txt` | Python dependencies for backend + model services                     |
| `README.md`        | Quick-start checklist (this file)                                    |

Need more detail? `docs/STRUCTURE.md` walks through every folder and convention.

## Quick start 🚀

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # or create manually
npm run dev -- --host
```

Open the printed URL (defaults to `http://localhost:5173/`). If Supabase credentials are missing, the app automatically falls back to a demo mode so you can click through the UI.

### Backend + model service

Python 3.9+ is required. From the repo root:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Terminal 1 – model service
uvicorn model_service.main:app --host 127.0.0.1 --port 8001 --reload

# Terminal 2 – backend gateway
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- `http://127.0.0.1:8000/health` — backend health check
- `http://127.0.0.1:8000/bot/status` — in-memory bot status (demo)
- `http://127.0.0.1:8000/model/predict` — backend proxy to the model service
- `http://127.0.0.1:8001/predict` — direct model endpoint (FastAPI demo policy)

The backend talks to the model service via `MODEL_SERVICE_URL` (defaults to `http://127.0.0.1:8001`), persists bot configs/trades/backtests in SQLite, and exposes admin endpoints under `/bot/*`.

## Environment variables 🔐

Frontend:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Backend (loaded via `.env` or host environment):

```
ADMIN_API_KEY=devkey
MODEL_SERVICE_URL=http://127.0.0.1:8001
DATABASE_URL=sqlite:///./agent.db
```

Copy `frontend/.env.example`, paste your Supabase values, and keep `.env` local (Git already ignores it).

> ⚠️ Right now `frontend/.env` ships with placeholder values (`placeholder.supabase.co`). Replace them with real Supabase keys before release.

## NPM scripts

Run every command from `frontend/`:

- `npm run dev` – Vite dev server
- `npm run build` – production build
- `npm run preview` – serve the production bundle locally
- `npm run lint` – ESLint
- `npm run typecheck` – isolated `tsc` run
- `npm run format` / `npm run format:check` – Prettier write/check
- `npm run test` / `npm run test:run` – Vitest + Testing Library suite (JSDOM)

## Documentation 📚

- `docs/STRUCTURE.md` – project anatomy and conventions
- `docs/IMPROVEMENTS.md` – prioritized backlog with recommended libraries
- `docs/WORK_REPORT.md` – log of completed tasks and owners

# Keep these docs current whenever you add subsystems or change workflows—the next teammate will thank you.
