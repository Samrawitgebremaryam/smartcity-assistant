#!/usr/bin/env bash
set -euo pipefail

echo "========================================"
echo "  SmartCity RAG Assistant"
echo "  Starting Docker services..."
echo "========================================"
echo

docker compose up -d --build

echo
echo "Waiting for frontend on http://localhost:3000 ..."

for _ in $(seq 1 60); do
  if curl -fsS http://localhost:3000 >/dev/null 2>&1; then
    echo "Frontend is ready."
    break
  fi
  sleep 2
done

if ! curl -fsS http://localhost:3000 >/dev/null 2>&1; then
  echo
  echo "Services started, but the frontend did not become ready in time."
  echo "Check logs with: docker compose logs -f frontend"
  exit 1
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open http://localhost:3000 >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open http://localhost:3000 >/dev/null 2>&1 || true
fi

echo
echo "========================================"
echo "  Services are running"
echo "========================================"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo "  Qdrant:      http://localhost:6333"
