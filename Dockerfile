FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml README.md ./
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
COPY tests ./tests
COPY ethiopia_smartcity_dataset.json ./

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e .[ai] && \
    pip install --no-cache-dir google-genai openai

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
