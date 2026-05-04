install:
	pip install -e .[dev]

run:
	uvicorn app.main:app --reload

test:
	pytest

lint:
	ruff check .

docker-up:
	docker compose up --build
