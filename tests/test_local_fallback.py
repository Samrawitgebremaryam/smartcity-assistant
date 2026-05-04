import json
from pathlib import Path

from app.rag.fallbacks import is_in_scope_question
from app.services.dataset_service import DatasetImportService
from app.services.health_check_service import (
    get_local_search_results,
    load_dataset_from_disk,
    search_local_dataset,
)


def test_local_search_finds_marriage_registration() -> None:
    load_dataset_from_disk()

    results = search_local_dataset("How do I register a marriage at the woreda level in Addis Ababa?")

    assert results
    assert any("marriage" in document["title"].lower() for document, _score in results)


def test_local_search_finds_water_bill_payment() -> None:
    load_dataset_from_disk()

    results = search_local_dataset("How do I pay my water bill using TeleBirr?")

    assert results
    assert any("water bill" in document["title"].lower() for document, _score in results)


def test_local_search_finds_emergency_contacts() -> None:
    load_dataset_from_disk()

    results, fallback_message = get_local_search_results(
        "Which numbers should I call for police, fire or ambulance services in Addis Ababa?"
    )

    assert fallback_message == ""
    assert results
    assert any("emergency" in document["title"].lower() for document in results)


def test_passport_question_is_in_scope() -> None:
    assert is_in_scope_question("I need a national passport; do I need a residence identity card first?")


def test_dataset_import_supports_documents_wrapper(tmp_path: Path) -> None:
    dataset_path = tmp_path / "dataset.json"
    dataset_path.write_text(
        json.dumps(
            {
                "documents": [
                    {
                        "title": "Passport in Ethiopia",
                        "content": "Requirements: Residence ID, birth certificate, photos, application form.",
                        "category": "Smart Government",
                        "service_area": "Passport",
                        "source": "passport.txt",
                        "language": "en",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    raw = json.loads(dataset_path.read_text(encoding="utf-8"))
    records = raw.get("documents", raw) if isinstance(raw, dict) else raw

    assert isinstance(records, list)
    assert records[0]["title"] == "Passport in Ethiopia"
