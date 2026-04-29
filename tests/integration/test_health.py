from tests.conftest import get_test_client


def test_health_endpoint() -> None:
    client = get_test_client()
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "smartcity-assistant",
    }


def test_documents_list_endpoint_returns_ok() -> None:
    client = get_test_client()
    response = client.get("/api/v1/documents")

    assert response.status_code == 200
    assert response.json() == []


def test_upload_rejects_unsupported_extension() -> None:
    client = get_test_client()
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("guide.pdf", b"fake-pdf", "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Unsupported file type: .pdf"}
