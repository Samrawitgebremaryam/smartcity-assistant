from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from uuid import uuid4

from app.api.deps import get_db
from app.db.base import Base
from app.main import app


TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Session:
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def get_test_client() -> TestClient:
    return TestClient(app)


def get_auth_headers(client: TestClient) -> dict[str, str]:
    email = f"tester-{uuid4().hex[:8]}@example.com"
    register_payload = {
        "email": email,
        "password": "Secret123!",
        "name": "Test User",
    }
    client.post("/api/v1/auth/register", json=register_payload)

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": register_payload["email"],
            "password": register_payload["password"],
        },
    )
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
