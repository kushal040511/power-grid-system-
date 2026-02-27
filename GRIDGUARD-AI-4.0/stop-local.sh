#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"

stop_pid_file() {
  local name="$1"
  local pidfile="$2"

  if [[ ! -f "$pidfile" ]]; then
    echo "$name not running (no pid file)"
    return
  fi

  local pid
  pid="$(cat "$pidfile" 2>/dev/null || true)"
  if [[ -z "${pid:-}" ]]; then
    rm -f "$pidfile"
    echo "$name not running (empty pid file)"
    return
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    echo "Stopped $name (pid $pid)"
  else
    echo "$name not running (stale pid $pid)"
  fi

  rm -f "$pidfile"
}

echo "Stopping GRIDGUARD local stack..."
stop_pid_file "simulator" "$PID_DIR/simulator.pid"
stop_pid_file "frontend" "$PID_DIR/frontend.pid"
stop_pid_file "backend" "$PID_DIR/backend.pid"
echo "Done."

