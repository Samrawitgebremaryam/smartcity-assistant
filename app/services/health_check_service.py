"""Health check and local dataset fallback helpers."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

import requests

from app.core.config import get_settings

logger = logging.getLogger(__name__)

backend_available: bool = True

DEFAULT_DATASET_PATH = "ethiopia_smartcity_dataset.json"
SIMILARITY_THRESHOLD: float = 0.34

OUT_OF_SCOPE_MESSAGE = (
    "I'm sorry, that topic is outside the services I cover. "
    "I can help with registrations, utilities, telecom, transport, "
    "business licensing, emergencies and hospitals."
)

CORE_SERVICE_KEYWORDS = {
    "registrations": {"birth", "marriage", "death", "residence", "residency", "certificate", "id", "passport"},
    "utilities": {"electricity", "water", "bill", "payment", "meter", "telebirr", "cbe"},
    "telecom": {"ethiotelecom", "phone", "sim", "mobile", "ussd", "volte", "apn"},
    "transport": {"bus", "route", "routes", "taxi", "traffic", "road", "parking", "metro", "rail", "anbessa"},
    "business": {"business", "licence", "license", "trade", "permit", "tin", "renewal"},
    "emergency": {"hospital", "police", "fire", "ambulance", "emergency", "health"},
    "smart_government": {"digital", "government", "city", "woreda", "kebele"},
    "economy": {"economy", "small", "enterprise", "market", "tax"},
    "environment": {"environment", "waste", "recycling", "green", "air", "pollution"},
    "living": {"housing", "apartment", "rent", "community", "property"},
    "mobility": {"transport", "taxi", "bus", "metro", "ride", "traffic"},
    "people": {"education", "school", "social", "service", "support"},
}

STOPWORDS = {
    "the", "and", "for", "with", "what", "where", "when", "how", "can",
    "are", "you", "about", "this", "that", "from", "have", "will", "your",
    "into", "they", "them", "their", "would", "please", "does", "need",
    "apply", "get", "tell", "give", "show", "today", "there", "more",
}

TOKEN_ALIASES = {
    "marry": {"marriage", "marry", "wedding", "spouse"},
    "marriage": {"marriage", "marry", "wedding", "spouse"},
    "register": {"register", "registration", "certificate", "recording"},
    "registration": {"register", "registration", "certificate", "recording"},
    "bill": {"bill", "bills", "payment", "pay"},
    "payment": {"bill", "payment", "pay"},
    "water": {"water", "utility", "utilities", "webirr"},
    "electricity": {"electricity", "utility", "utilities", "eeu"},
    "telebirr": {"telebirr", "telebirr", "webirr", "ussd"},
    "passport": {"passport", "immigration", "travel"},
    "residence": {"residence", "residency", "resident", "id", "identity"},
    "emergency": {"emergency", "police", "fire", "ambulance", "traffic", "hospital", "hotline"},
}

_local_dataset: list[dict[str, Any]] = []


def check_backend_health(url: str = "http://localhost:8000/api/v1/health") -> bool:
    """Ping the backend health endpoint and update the availability flag."""
    global backend_available

    try:
        response = requests.get(url, timeout=3)
    except requests.exceptions.RequestException as exc:
        backend_available = False
        logger.warning("Backend health check failed: %s", exc)
        return False

    backend_available = response.status_code == 200
    if not backend_available:
        logger.warning("Backend health check returned status %s", response.status_code)
    return backend_available


def get_backend_status() -> bool:
    """Return the cached backend availability flag."""
    return backend_available


def set_backend_status(available: bool) -> None:
    """Set the cached backend availability flag."""
    global backend_available
    backend_available = available


def load_dataset_from_disk(dataset_path: str | Path | None = None) -> list[dict[str, Any]]:
    """Load the JSON dataset once and normalize metadata for local fallback search."""
    global _local_dataset

    if dataset_path is None:
        settings = get_settings()
        repo_root = Path(__file__).resolve().parents[2]
        candidates = [
            repo_root / DEFAULT_DATASET_PATH,
            repo_root / settings.bootstrap_dataset_glob.replace("*", ""),
        ]
    else:
        candidates = [Path(dataset_path)]

    for path in candidates:
        if not path.exists():
            continue
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Failed to load dataset from %s: %s", path, exc)
            continue

        documents = raw.get("documents", raw) if isinstance(raw, dict) else raw
        if not isinstance(documents, list):
            continue

        _local_dataset = [_normalize_document(item) for item in documents if isinstance(item, dict)]
        logger.info("Loaded %s local fallback documents from %s", len(_local_dataset), path)
        return _local_dataset

    logger.warning("No local dataset could be loaded for fallback search")
    _local_dataset = []
    return _local_dataset


def get_local_dataset() -> list[dict[str, Any]]:
    """Return the in-memory local fallback dataset."""
    return _local_dataset


def is_in_service_scope(question: str) -> bool:
    """Return True when a question overlaps the supported smart-city service scope."""
    tokens = set(_tokenize(question))
    return any(tokens & keywords for keywords in CORE_SERVICE_KEYWORDS.values())


def search_local_dataset(query: str, threshold: float | None = None) -> list[tuple[dict[str, Any], float]]:
    """Search the local dataset with keyword overlap ranking."""
    if threshold is None:
        threshold = SIMILARITY_THRESHOLD

    if not _local_dataset:
        load_dataset_from_disk()

    query_tokens = _expand_tokens(_tokenize(query))
    if not query_tokens:
        return []

    query_token_set = set(query_tokens)
    results: list[tuple[dict[str, Any], float]] = []

    for doc in _local_dataset:
        searchable_text = " ".join(
            [
                doc.get("title", ""),
                doc.get("category", ""),
                doc.get("service_area", ""),
                doc.get("content", ""),
            ]
        ).lower()
        doc_tokens = set(_expand_tokens(_tokenize(searchable_text)))
        matched_tokens = query_token_set & doc_tokens
        if not matched_tokens:
            continue

        coverage = len(matched_tokens) / len(query_token_set)
        title_text = doc.get("title", "").lower()
        service_text = doc.get("service_area", "").lower()
        category_text = doc.get("category", "").lower()
        title_bonus = sum(1 for token in matched_tokens if token in title_text) * 0.18
        service_bonus = sum(1 for token in matched_tokens if token in service_text) * 0.14
        category_bonus = sum(1 for token in matched_tokens if token in category_text) * 0.08
        phrase_bonus = 0.18 if _contains_phrase_match(query, searchable_text) else 0.0
        score = coverage + title_bonus + service_bonus + category_bonus + phrase_bonus

        if score >= threshold:
            results.append((doc, score))

    results.sort(key=lambda item: item[1], reverse=True)
    return results


def get_local_search_results(query: str, max_results: int = 3) -> tuple[list[dict[str, Any]], str]:
    """Return local fallback documents or the scoped fallback message."""
    if not is_in_service_scope(query):
        return [], OUT_OF_SCOPE_MESSAGE

    results = search_local_dataset(query)
    if not results:
        return [], OUT_OF_SCOPE_MESSAGE

    return [document for document, _score in results[:max_results]], ""


def set_similarity_threshold(threshold: float) -> None:
    """Set the local search threshold."""
    global SIMILARITY_THRESHOLD
    if not 0.0 <= threshold <= 1.0:
        raise ValueError("Threshold must be between 0.0 and 1.0")
    SIMILARITY_THRESHOLD = threshold


def get_similarity_threshold() -> float:
    """Return the current local search threshold."""
    return SIMILARITY_THRESHOLD


def _normalize_document(document: dict[str, Any]) -> dict[str, Any]:
    content = str(document.get("content") or "").strip()
    chunk_text = str(document.get("chunk_text") or "").strip()
    if chunk_text and chunk_text not in content:
        combined_content = f"{content}\n\n{chunk_text}".strip()
    else:
        combined_content = content or chunk_text

    return {
        "title": str(document.get("title", "")).strip() or "Untitled document",
        "category": str(document.get("category", "")).strip(),
        "service_area": str(document.get("service_area", "")).strip(),
        "content": combined_content,
        "source_url": str(document.get("source_url") or document.get("source") or "").strip(),
    }


def _tokenize(text: str) -> list[str]:
    normalized = re.sub(r"[^a-z0-9]+", " ", text.lower())
    return [token for token in normalized.split() if len(token) >= 2 and token not in STOPWORDS]


def _expand_tokens(tokens: list[str]) -> list[str]:
    expanded: set[str] = set(tokens)
    for token in tokens:
        expanded.update(TOKEN_ALIASES.get(token, {token}))
    return list(expanded)


def _contains_phrase_match(query: str, searchable_text: str) -> bool:
    normalized_query = " ".join(_tokenize(query))
    if not normalized_query:
        return False
    return normalized_query in searchable_text
