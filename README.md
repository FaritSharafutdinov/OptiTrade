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

### Быстрый запуск всех сервисов (рекомендуется)

Используйте скрипты для автоматического запуска всех компонентов:

**Windows:**
```powershell
# PowerShell
.\scripts\start_all.ps1

# Или Batch
scripts\start_all.bat
```

**Linux/macOS:**
```bash
chmod +x scripts/start_all.sh
./scripts/start_all.sh
```

Скрипты автоматически:
- Создадут виртуальное окружение (если нужно)
- Установят зависимости
- Запустят все три сервиса (Model Service, Backend, Frontend)

### Ручной запуск

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # or create manually
npm run dev -- --host
```

Open the printed URL (defaults to `http://localhost:5173/`). If Supabase credentials are missing, the app automatically falls back to a demo mode so you can click through the UI.

#### Backend + model service

Python 3.9+ and PostgreSQL are required. From the repo root:

**1. Setup PostgreSQL database:**

```bash
# Install PostgreSQL (if not installed)
# macOS - automated:
./scripts/install_postgresql.sh

# macOS - manual:
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database and user (after PostgreSQL is installed and running)
./scripts/setup_db.sh

# Or manually:
psql postgres
CREATE DATABASE optitrade;
CREATE USER optitrade WITH PASSWORD 'optitrade';
GRANT ALL PRIVILEGES ON DATABASE optitrade TO optitrade;
\q
```

**2. Install dependencies and run services:**

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Terminal 1 – model service (с поддержкой RL моделей)
MODEL_TYPE=ppo USE_RL_MODEL=true uvicorn model_service.main:app --host 127.0.0.1 --port 8001 --reload

# Terminal 2 – backend gateway
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- `http://127.0.0.1:8000/health` — backend health check
- `http://127.0.0.1:8000/bot/status` — bot status from database
- `http://127.0.0.1:8000/model/predict` — backend proxy to the model service
- `http://127.0.0.1:8001/predict` — direct model endpoint
- `http://127.0.0.1:8001/health` — model service health check

The backend automatically creates all tables on first run. All data is persisted in PostgreSQL.

**Note:** If PostgreSQL is not set up, the backend will show a warning but still start. Tables will be created automatically when the database becomes available.

### ML/RL Models Integration 🤖

Проект интегрирован с обученными RL моделями из папки `RL_algorithms/`:
- **PPO** (Proximal Policy Optimization) - по умолчанию
- **A2C** (Advantage Actor-Critic)
- **SAC** (Soft Actor-Critic)

Модели автоматически загружаются из `RL_algorithms/models/{MODEL_TYPE}/` при запуске Model Service.

Если RL модель не найдена или отключена, используется упрощенный режим предсказаний.

## Environment variables 🔐

Frontend:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Backend + Model Service (loaded via `.env` or host environment):

```bash
# Create .env file in project root:
ADMIN_API_KEY=devkey
MODEL_SERVICE_URL=http://127.0.0.1:8001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/optitrade

# Model Service configuration:
MODEL_TYPE=ppo                    # ppo, a2c, or sac
USE_RL_MODEL=true                 # true to use RL models, false for simple mode
# MODEL_PATH=                     # Optional: explicit path to model file
```

**Default PostgreSQL connection:**

- User: `postgres`
- Password: `postgres`
- Database: `optitrade`
- Host: `localhost:5432`

### Database Setup

**Local PostgreSQL:**

1. Install PostgreSQL (if not already installed):

   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15

   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. Create database and user:

   ```bash
   # Connect to PostgreSQL
   psql postgres

   # Create database and user
   CREATE DATABASE optitrade;
   CREATE USER optitrade WITH PASSWORD 'optitrade';
   GRANT ALL PRIVILEGES ON DATABASE optitrade TO optitrade;
   \q
   ```

3. The application will automatically create tables on first run.

**For production**, update `DATABASE_URL` in your environment to point to your cloud PostgreSQL instance (e.g., AWS RDS, Supabase, Neon, etc.).

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

- `DEPLOYMENT.md` – deployment guide for local setup
- `DEPLOYMENT_VPS.md` – comprehensive VPS deployment guide
- `docs/STRUCTURE.md` – project anatomy and conventions
- `docs/IMPROVEMENTS.md` – prioritized backlog with recommended libraries
- `docs/PAPER_VS_LIVE_TRADING.md` – explanation of trading modes
- `docs/BACKTESTING.md` – backtesting documentation
- `docs/MODEL_MANAGEMENT.md` – RL model management guide

## Deployment 🚀

### Local Development
See `DEPLOYMENT.md` for detailed local setup instructions.

### VPS Deployment
See `DEPLOYMENT_VPS.md` for complete VPS deployment guide with:
- System setup and dependencies
- Systemd service configuration
- Nginx reverse proxy setup
- SSL certificates with Let's Encrypt
- Security recommendations
- Performance optimization
- Troubleshooting guide

## Contributing

Before pushing to GitHub:
1. Remove temporary files and logs
2. Update `.env.example` with required variables (no secrets!)
3. Ensure all tests pass
4. Update documentation if needed

## License

See `LICENSE` file for details.
