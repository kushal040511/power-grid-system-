# GRIDGUARD AI 4.0

AI + LLM Powered National Smart Grid Intelligence Platform for real-time risk intelligence, theft detection, transformer health forecasting, and executive reporting.

---

## Table of Contents

1. Overview  
2. Core Features  
3. Architecture  
4. Tech Stack  
5. Project Structure  
6. Quick Start (Recommended)  
7. Manual Local Setup  
8. Environment Variables  
9. API Overview  
10. Real-Time Data Flow  
11. LLM + Report System  
12. Docker Setup  
13. Deployment Notes (AWS-Ready)  
14. Troubleshooting  
15. Security Notes  
16. License

---

## 1. Overview

GRIDGUARD AI 4.0 is a production-style smart grid intelligence platform designed for:

- Real-time anomaly/theft detection from meter streams
- Transformer risk and health monitoring
- National/state risk visualization (map + dashboards)
- AI/LLM-assisted explanations and executive summaries
- Role-based secure multi-user access
- Continuous simulation for local demo/testing

The platform supports both **hackathon demos** and **enterprise-style architecture evolution**.

---

## 2. Core Features

- Real-time ingestion pipeline for smart meter and transformer telemetry
- Risk map with zone scoring (Green / Yellow / Red)
- Alert Center with acknowledgment workflow
- Executive dashboard with live KPIs
- LLM-powered grid explanation assistant
- Formal report preview + PDF generation
- Role-based auth (JWT + refresh token)
- Audit logging and API protection (validation/rate limiting)
- Continuous simulator (1M+ readings style workflow)
- Optional Electricity Maps sync for external carbon/grid signals

---

## 3. Architecture

### High-Level Services

- **Frontend** (`React + Vite`): map, dashboard, alerts, reports, chat
- **Backend API** (`Node.js + Express`): auth, data APIs, report generation, socket broadcasting
- **AI Service** (`Python/FastAPI`): model training + prediction endpoints
- **PostgreSQL**: primary relational datastore
- **Redis**: cache/session/event support
- **Simulator** (`Python`): synthetic real-time stream injection

### Data + Event Flow

1. Simulator pushes readings every few seconds to backend ingest API  
2. Backend stores telemetry and computes/updates risk signals  
3. Alerts/anomalies are generated and stored  
4. Socket events broadcast updates to frontend  
5. Frontend refreshes dashboard/map/alerts in near real time  
6. LLM endpoints generate explanations and executive summaries from live DB state

---

## 4. Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Leaflet + GeoJSON
- Chart.js
- Axios
- Socket.io client

### Backend

- Node.js
- Express
- PostgreSQL (`pg`)
- Redis
- JWT auth + refresh token
- Rate limiting + input validation
- PDFKit (report generation)
- Socket.io

### AI/ML Service

- Python
- FastAPI
- scikit-learn
- TensorFlow/PyTorch support pattern
- Isolation Forest + LSTM + Autoencoder flow (project structure-ready)

### LLM Layer

- Gemini integration (primary)
- Generic LLM endpoint fallback (optional)

---

## 5. Project Structure

```text
GRIDGUARD-AI-4.0/
├── ai-service/                 # Python AI microservice (train + predict endpoints)
├── backend/                    # Express API, auth, DB, reports, socket, LLM integration
│   ├── migrations/             # SQL migrations
│   ├── scripts/                # bootstrap/seed/backfill helpers
│   ├── src/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   └── reports/                # generated report output
├── frontend/                   # React app
│   ├── public/
│   │   └── data/india.geo.json
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── App.jsx
├── simulator/                  # synthetic telemetry generator
├── ml/                         # ML notebooks/scripts (experimentation zone)
├── docs/                       # supporting docs
├── docker-compose.yml
├── run-local.sh                # one-command startup
└── stop-local.sh               # one-command shutdown


Quick Start (Recommended)
This project is configured for conflict-free local ports:

Frontend: 5210
Backend: 5010
cd "GRIDGUARD-AI-4.0"
./run-local.sh
Open:

http://127.0.0.1:5210/login
Stop everything:

./stop-local.sh
Default login:

admin@gridguard.ai
admin123
7. Manual Local Setup
7.1 Prerequisites
Node.js 18+
Python 3.10+
PostgreSQL 15/16
Redis 7
npm
7.2 Start infrastructure
brew services start postgresql@16
brew services start redis
createdb gridguard
7.3 Backend setup
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run bootstrap:regions
npm run backfill:readings
PORT=5010 npm start
7.4 Frontend setup
cd frontend
cp .env.example .env
npm install
npm run dev -- --host 127.0.0.1 --port 5210 --strictPort
7.5 AI service setup
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train.py
uvicorn main:app --host 0.0.0.0 --port 8001
7.6 Simulator setup
cd simulator
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
BACKEND_URL=http://127.0.0.1:5010 INGEST_API_KEY=gridguard_ingest_key python simulate.py --count 1000000 --interval 3
8. Environment Variables
8.1 Backend (backend/.env)
PORT=5010
DATABASE_URL=postgresql://<user>@localhost:5432/gridguard
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-refresh
CORS_ORIGIN=http://localhost:5210,http://127.0.0.1:5210
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8001

LLM_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta

LLM_API_URL=
LLM_API_KEY=

REPORTS_DIR=./reports
INGEST_API_KEY=gridguard_ingest_key

ELECTRICITYMAPS_API_KEY=
ELECTRICITYMAPS_BASE_URL=https://api.electricitymap.org
ELECTRICITYMAPS_DEFAULT_ZONE=IN
ELECTRICITYMAPS_POLL_SECONDS=3600
ELECTRICITYMAPS_REGION_ZONE_MAP={"Maharashtra":"IN","Gujarat":"IN","Karnataka":"IN","Tamil Nadu":"IN","Delhi":"IN"}
8.2 Frontend (frontend/.env)
VITE_API_URL=http://127.0.0.1:5010/api
VITE_SOCKET_URL=http://127.0.0.1:5010
9. API Overview
Auth
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET /api/auth/regions
Dashboard + Map
GET /api/dashboard
GET /api/dashboard/risk-map
GET /api/regions
GET /api/regions/:regionId
Grid Assets + Readings
GET /api/transformers
GET /api/meters
POST /api/ingest
GET /api/readings/latest
GET /api/readings/trend/:regionId
Alerts
GET /api/alerts
POST /api/alerts/:id/ack
Reports
GET /api/reports/preview
POST /api/reports
GET /api/reports/:id
POST /api/reports/generate (formal CTO markdown mode)
LLM
POST /api/llm/explain
POST /api/llm/chat
Electricity Maps (optional)
GET /api/electricity-maps/apis
GET /api/electricity-maps/proxy?...
GET /api/electricity-maps/signals/latest?zone=IN
POST /api/electricity-maps/sync
10. Real-Time Data Flow
Ingestion frequency: default every 3s from simulator
Backend computes risk/anomaly updates per reading
Socket events push UI refresh triggers
Frontend also performs periodic refresh for resilience
Electricity Maps sync (if key provided) runs on poll interval (default hourly)
11. LLM + Report System
Explanation Engine
/api/llm/explain returns structured risk analysis:

risk_level
risk_score
anomaly_detected
root_cause
recommended_action
technical_summary
Chat Assistant
/api/llm/chat supports operational questions, transformer/risk reasoning, and summary outputs.

Report Engine
/api/reports/preview generates a formal live data preview
/api/reports generates downloadable report artifacts
/api/reports/generate creates formal CTO-style markdown summary
12. Docker Setup
docker compose up --build
Default docker ports:

Frontend: http://localhost:5173
Backend: http://localhost:5001
AI service: http://localhost:8001
PostgreSQL: localhost:5432
Redis: localhost:6379
13. Deployment Notes (AWS-Ready)
Frontend: S3 + CloudFront or containerized behind ALB
Backend: ECS/EC2 + ALB
AI service: ECS/EC2 internal service
PostgreSQL: Amazon RDS
Redis: ElastiCache
Reports: S3 (executive_reports.file_path stores object URL/path)
Secrets: AWS Secrets Manager / SSM Parameter Store
14. Troubleshooting
UI opens but says “Failed to load alerts/reports/map”
Confirm backend is healthy:
curl http://127.0.0.1:5010/health
Confirm frontend env points to backend:
VITE_API_URL=http://127.0.0.1:5010/api
VITE_SOCKET_URL=http://127.0.0.1:5010
Hard refresh browser and login again (token may be stale)
“Safari can’t connect to server”
Ensure exact URL includes port:
http://127.0.0.1:5210/login
Check listeners:
lsof -nP -iTCP:5210 -sTCP:LISTEN
lsof -nP -iTCP:5010 -sTCP:LISTEN
Port conflict with other projects
This repo uses 5010/5210 for local run scripts
If needed, override startup values in shell exports before launch
Simulator not pushing data
Set backend URL explicitly:
BACKEND_URL=http://127.0.0.1:5010
Electricity Maps sync not updating
Add valid ELECTRICITYMAPS_API_KEY in backend env
Trigger manual sync:
POST /api/electricity-maps/sync
15. Security Notes
JWT access + refresh token flow
Password hashing via bcrypt
API rate limiting + validation middleware
Role-based route protection
Audit log events for sensitive actions
Keep all production secrets out of Git
