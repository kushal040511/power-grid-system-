#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
PID_DIR="$ROOT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

is_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

start_service() {
  local name="$1"
  local cmd="$2"
  local workdir="$3"
  local logfile="$4"
  local pidfile="$5"

  if [[ -f "$pidfile" ]]; then
    local old_pid
    old_pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" >/dev/null 2>&1; then
      echo "$name already running (pid $old_pid)"
      return
    fi
  fi

  (
    cd "$workdir"
    nohup bash -lc "$cmd" >>"$logfile" 2>&1 &
    echo $! >"$pidfile"
  )
  echo "Started $name"
}

echo "Starting GRIDGUARD local stack..."

if command -v brew >/dev/null 2>&1; then
  brew services start postgresql@16 >/dev/null 2>&1 || true
  brew services start redis >/dev/null 2>&1 || true
fi

if ! is_listening 5010; then
  start_service \
    "backend" \
    "PORT=5010 npm start" \
    "$ROOT_DIR/backend" \
    "$LOG_DIR/backend.log" \
    "$PID_DIR/backend.pid"
else
  echo "backend already listening on 5010"
fi

if ! is_listening 5210; then
  start_service \
    "frontend" \
    "VITE_API_URL=http://127.0.0.1:5010/api VITE_SOCKET_URL=http://127.0.0.1:5010 npm run dev -- --host 127.0.0.1 --port 5210 --strictPort" \
    "$ROOT_DIR/frontend" \
    "$LOG_DIR/frontend.log" \
    "$PID_DIR/frontend.pid"
else
  echo "frontend already listening on 5210"
fi

for i in {1..30}; do
  if curl -sf "http://127.0.0.1:5010/health" >/dev/null 2>&1 && \
     curl -sf "http://127.0.0.1:5210/login" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! is_listening 5010 || ! is_listening 5210; then
  echo "Startup failed. Check logs:"
  echo "  $LOG_DIR/backend.log"
  echo "  $LOG_DIR/frontend.log"
  exit 1
fi

if [[ "${1:-}" != "--no-simulator" ]]; then
  start_service \
    "simulator" \
    "BACKEND_URL=http://127.0.0.1:5010 INGEST_API_KEY=gridguard_ingest_key python3 simulate.py --count 1000000 --interval 3" \
    "$ROOT_DIR/simulator" \
    "$LOG_DIR/simulator.log" \
    "$PID_DIR/simulator.pid"
fi

echo "GRIDGUARD is live:"
echo "  Frontend: http://127.0.0.1:5210/login"
echo "  Backend:  http://127.0.0.1:5010/health"
echo "Logs:"
echo "  $LOG_DIR/backend.log"
echo "  $LOG_DIR/frontend.log"
echo "  $LOG_DIR/simulator.log"
