# GRIDGUARD AI 4.0
AI + LLM Powered National Smart Grid Intelligence Platform

## Architecture
- Frontend: React + Tailwind + Leaflet + Chart.js + Socket.io
- Backend API: Node.js + Express + PostgreSQL + Redis + JWT
- AI Engine: Python FastAPI microservice (Isolation Forest + LSTM + Autoencoder)
- Real-time: Socket.io events + Electricity Maps periodic sync

## Folder Structure
```
GRIDGUARD-AI-4.0/
  backend/
  frontend/
  ai-service/
  simulator/
  docker-compose.yml
```

## Local Setup
### Quick Start (Recommended)
```bash
cd GRIDGUARD-AI-4.0
./run-local.sh
```

Stop all local processes:
```bash
./stop-local.sh
```

### 1) Start PostgreSQL + Redis
```bash
brew services start postgresql
brew services start redis
createdb gridguard
```

### 2) Backend
```bash
cd GRIDGUARD-AI-4.0/backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run bootstrap:regions
npm run backfill:readings
npm run dev
```

Set your Electricity Maps token in `backend/.env`:
```bash
ELECTRICITYMAPS_API_KEY=<your-electricity-maps-token>
ELECTRICITYMAPS_BASE_URL=https://api.electricitymap.org
```
If `ELECTRICITYMAPS_API_KEY` is not set, simulator data continues to drive the map and `/api/electricity-maps/sync` returns `400` (to avoid overwriting live values with empty data).

Configure Google Gemini 1.5 Flash in `backend/.env`:
```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=<your-google-ai-key>
GEMINI_MODEL=gemini-1.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```
Note: if `gemini-1.5-flash` is unavailable for your Google account/version, backend auto-falls back to available Flash models (for example `gemini-flash-latest`).
Fallback mode (if Gemini key is not set):
```bash
LLM_API_URL=<your-custom-llm-endpoint>
LLM_API_KEY=<your-custom-llm-key>
```

Backend runs on `http://localhost:5001`.

### 3) AI Service
```bash
cd GRIDGUARD-AI-4.0/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train.py
uvicorn main:app --host 0.0.0.0 --port 8001
```

### 4) Frontend
```bash
cd GRIDGUARD-AI-4.0/frontend
cp .env.example .env
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open: `http://127.0.0.1:5173`

Login:
- `admin@gridguard.ai`
- Use the `ADMIN_PASSWORD` value from your local `backend/.env`.

Signup:
- Open `http://127.0.0.1:5173/signup`
- New users are created as `analyst` role.

### 5) Simulator
```bash
cd GRIDGUARD-AI-4.0/simulator
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export BACKEND_URL=http://localhost:5001
export ADMIN_EMAIL=admin@gridguard.ai
export ADMIN_PASSWORD=<your-admin-password>
export INGEST_API_KEY=<your-ingest-api-key>
python simulate.py --count 1000000 --interval 3
```

## Electricity Maps Integration
Backend provides an authenticated proxy and sync layer:
- `GET /api/electricity-maps/apis` -> supported API catalog
- `GET /api/electricity-maps/proxy?path=/v3/carbon-intensity/latest&zone=IN`
- `GET /api/electricity-maps/signals/latest?zone=IN` -> combined latest signals from multiple APIs
- `POST /api/electricity-maps/sync` -> force sync to `regions` table and emit websocket updates

Automatic sync runs every `ELECTRICITYMAPS_POLL_SECONDS` seconds if `ELECTRICITYMAPS_API_KEY` is set.
Default is hourly: `ELECTRICITYMAPS_POLL_SECONDS=3600`.

## Core API Endpoints
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/dashboard`
- `GET /api/dashboard/risk-map`
- `GET /api/regions`
- `GET /api/regions/:regionId`
- `GET /api/transformers`
- `GET /api/meters`
- `POST /api/ingest`
- `GET /api/readings/latest`
- `GET /api/readings/trend/:regionId`
- `GET /api/alerts`
- `POST /api/alerts/:id/ack`
- `POST /api/reports`
- `POST /api/reports/generate` (CTO Markdown report mode)
- `GET /api/reports/preview`
- `GET /api/reports/:id`
- `POST /api/llm/explain`
- `POST /api/llm/chat`

Report behavior:
- Reports are generated from live database state (regions, transformers, meters, alerts, anomalies, and recent readings).
- The PDF includes formal sections: national snapshot, risk zone distribution, alert intelligence, top risky regions, top transformers, top anomalies, 24h trend, and recommended actions.
- LLM behavior uses Google Gemini 1.5 Flash when `GEMINI_API_KEY` is configured.

LLM behavior profile:
- GRIDGUARD system persona is embedded in backend prompting (grid analyst + electrical + data science role).
- `POST /api/llm/explain` returns structured analysis with India-specific risk thresholds and JSON fields:
  `risk_level`, `risk_score`, `anomaly_detected`, `root_cause`, `recommended_action`, `technical_summary`.
- `POST /api/llm/chat` remains chat-oriented and concise.
- CTO report mode is available through `POST /api/reports/generate` and returns formal Markdown sections for Ministry-style reporting.

## Docker
```bash
cd GRIDGUARD-AI-4.0
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- AI service: `http://localhost:8001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## AWS Deployment Notes
- Backend -> ECS/EC2 + ALB
- AI Service -> ECS/EC2
- PostgreSQL -> RDS
- Redis -> ElastiCache
- Reports -> S3 (store S3 URL in `executive_reports.file_path`)

## GeoJSON
Map geometry is loaded from `frontend/public/data/india.geo.json`.
Match state names with `regions.name` for region-level coloring.
