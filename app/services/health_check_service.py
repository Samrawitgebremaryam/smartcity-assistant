"""Health check and local search service for fallback functionality."""

import json
import logging
from pathlib import Path
from typing import Any

import requests

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Global flag to track backend availability
backend_available: bool = True

# Global variable to store the loaded dataset
_local_dataset: list[dict[str, Any]] = []

# Default path to dataset
DEFAULT_DATASET_PATH = "ethiopia_smartcity_dataset.json"

# Configurable similarity threshold (0.0 to 1.0)
SIMILARITY_THRESHOLD: float = 0.3

# Out-of-scope response message
OUT_OF_SCOPE_MESSAGE = (
    "I'm sorry, that topic is outside the services I cover. "
    "I can help with registrations, utilities, telecom, transport, "
    "business licensing, emergencies and hospitals."
)

# Core service keywords for in-scope detection
CORE_SERVICE_KEYWORDS = {
    "registrations": ["birth", "marriage", "death", "residence", "id", "passport", "license", "permit"],
    "utilities": ["electricity", "water", "bill", "payment", "meter"],
    "telecom": ["ethiotelecom", "phone", "sim", "mobile", "ussd"],
    "transport": ["bus", "route", "taxi", "traffic", "road", "parking", "metro", "rail"],
    "business": ["business", "license", "trade", "permit", "tax", "tin"],
    "emergency": ["hospital", "police", "fire", "ambulance", "emergency", "health"],
    "smart_government": ["digital", "government", "city", "woreda", "kebele"],
    "economy": ["business", "economy", "small enterprise", "sme", "market"],
    "environment": ["environment", "waste", "recycling", "green", "park", "air quality", "pollution"],
    "living": ["housing", "apartment", "rent", "park", "community", "property"],
    "mobility": ["transport", "taxi", "bus", "metro", "ride", "traffic"],
    "people": ["education", "school", "social", "service", "support"],
    "tax_and_revenue": ["tax", "revenue", "property tax", "withholding", "vat", "income tax"],
    "id_renewal": ["id", "passport", "driver", "license", "renewal", "national"],
    "education": ["school", "university", "college", "training", "tvet", "education"],
    "waste_environment": ["waste", "garbage", "collection", "recycling", "pollution", "tree"],
    "housing_property": ["housing", "rent", "property", "apartment", "lease", "building"],
    "tourism_events": ["tourism", "hotel", "event", "festival", "cultural"],
}


def check_backend_health(url: str = "http://localhost:8000/api/v1/health") -> bool:
    """
    Ping the backend health endpoint.

    Args:
        url: The health check endpoint URL.

    Returns:
        True if backend is healthy, False otherwise.
    """
    global backend_available
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            backend_available = True
            logger.info("Backend health check: OK")
            return True
        else:
            backend_available = False
            logger.warning(f"Backend health check failed with status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        backend_available = False
        logger.warning(f"Backend health check failed: {e}")
        return False


def get_backend_status() -> bool:
    """Get the current backend availability status."""
    return backend_available


def set_backend_status(available: bool) -> None:
    """Manually set the backend availability status."""
    global backend_available
    backend_available = available


def load_dataset_from_disk(dataset_path: str | None = None) -> list[dict[str, Any]]:
    """
    Load the dataset from disk at startup.

    Args:
        dataset_path: Optional path to the dataset file.

    Returns:
        List of document dictionaries.
    """
    global _local_dataset

    if dataset_path is None:
        settings = get_settings()
        base_dir = Path(__file__).parent.parent.parent
        dataset_path = base_dir / settings.bootstrap_dataset_glob.replace("*", "")

    # Try multiple possible paths
    possible_paths = [
        Path(dataset_path),
        Path("ethiopia_smartcity_dataset.json"),
        Path(__file__).parent.parent.parent / "ethiopia_smartcity_dataset.json",
    ]

    for path in possible_paths:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "documents" in data:
                        _local_dataset = data["documents"]
                    elif isinstance(data, list):
                        _local_dataset = data
                    logger.info(f"Loaded {len(_local_dataset)} documents from {path}")
                    return _local_dataset
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Failed to load dataset from {path}: {e}")

    logger.warning("No dataset found, using empty dataset")
    _local_dataset = []
    return _local_dataset


def get_local_dataset() -> list[dict[str, Any]]:
    """Get the currently loaded local dataset."""
    return _local_dataset


def is_in_service_scope(question: str) -> bool:
    """
    Check if the question is within the service scope.

    Args:
        question: The user's question.

    Returns:
        True if in scope, False otherwise.
    """
    question_lower = question.lower()

    for category, keywords in CORE_SERVICE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in question_lower:
                return True
    return False


def search_local_dataset(
    query: str,
    threshold: float | None = None,
) -> list[tuple[dict[str, Any], int]]:
    """
    Search the local dataset for documents containing all keywords in the query.

    Args:
        query: The search query.
        threshold: Optional similarity threshold (0.0 to 1.0).

    Returns:
        List of tuples (document, match_score) ranked by number of matched keywords.
    """
    if threshold is None:
        threshold = SIMILARITY_THRESHOLD

    if not _local_dataset:
        load_dataset_from_disk()

    query_keywords = set(query.lower().split())
    results: list[tuple[dict[str, Any], int]] = []

    for doc in _local_dataset:
        content = (doc.get("content", "") + " " + doc.get("title", "")).lower()
        doc_keywords = set(content.split())

        # Count matching keywords
        matched_keywords = query_keywords & doc_keywords
        match_score = len(matched_keywords) / len(query_keywords) if query_keywords else 0

        if match_score >= threshold and matched_keywords:
            results.append((doc, match_score))

    # Sort by match score descending
    results.sort(key=lambda x: x[1], reverse=True)
    return results


def get_local_search_results(
    query: str,
    max_results: int = 5,
) -> tuple[list[dict[str, Any]], str]:
    """
    Get local search results for a query with out-of-scope detection.

    Args:
        query: The search query.
        max_results: Maximum number of results to return.

    Returns:
        Tuple of (list of matching documents, response message).
    """
    # First check if the question is in service scope
    if not is_in_service_scope(query):
        return [], OUT_OF_SCOPE_MESSAGE

    # Search local dataset
    results = search_local_dataset(query)

    if not results:
        return [], OUT_OF_SCOPE_MESSAGE

    # Return top results
    return [doc for doc, _ in results[:max_results]], ""


def set_similarity_threshold(threshold: float) -> None:
    """Set the similarity threshold for local search."""
    global SIMILARITY_THRESHOLD
    if 0.0 <= threshold <= 1.0:
        SIMILARITY_THRESHOLD = threshold
    else:
        raise ValueError("Threshold must be between 0.0 and 1.0")


def get_similarity_threshold() -> float:
    """Get the current similarity threshold."""
    return SIMILARITY_THRESHOLD
