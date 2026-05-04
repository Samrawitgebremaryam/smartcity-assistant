#!/bin/bash
set -e

echo "Starting SmartCity Assistant in production mode..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

echo "Loading dataset into memory..."
python -c "from app.services.health_check_service import load_dataset_from_disk; load_dataset_from_disk()"

echo "Starting application server..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --proxy-headers \
    --forwarded-allow-ips='*'