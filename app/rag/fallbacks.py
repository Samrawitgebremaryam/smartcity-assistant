from __future__ import annotations

from urllib.parse import urlencode

from app.core.config import get_settings
from app.schemas.chat import SearchSuggestionItem, SourceItem


INSUFFICIENT_DATA_ANSWER = "I don't have sufficient data to answer that."
GREETING_ANSWER = "Hello! Please ask a specific question about Addis Ababa municipal services or public information."
OUT_OF_SCOPE_ANSWER = (
    "I can help with Addis Ababa city services such as registration, bill payments, transport, "
    "telecom support, emergency contacts, and business licensing. I can't answer general questions "
    "outside those topics."
)
UNCLEAR_ANSWER = (
    "I can help, but I need a more specific city-service question. Please ask about a service, procedure, "
    "bill payment, contact, route, or registration topic."
)
MISSING_DATA_FALLBACK = (
    "I don't have sufficient data to answer that from the current city-service documents. "
    "Please try a more specific Addis Ababa service question or use the official search suggestion below."
)
GREETING_TERMS = {
    "hello",
    "hi",
    "hey",
    "selam",
    "good morning",
    "good afternoon",
    "good evening",
}
SUPPORTED_TOPIC_PROMPTS = [
    "How do I pay my electricity bill?",
    "How do I register a birth certificate?",
    "What are the Anbessa city bus routes?",
    "How do I apply for a business licence?",
    "What are the emergency contact numbers?",
]
IN_SCOPE_KEYWORDS = {
    "addis", "ababa", "city", "service", "services", "municipal", "registration", "certificate", "birth",
    "marriage", "electricity", "water", "bill", "payment", "telebirr", "cbe", "banking", "bus", "route",
    "transport", "ethiotelecom", "telecom", "ussd", "volte", "business", "licence", "license", "hospital",
    "emergency", "contact", "administration", "civil", "resident", "residency", "permit", "office",
}


def normalize_answer(answer: str | None) -> str:
    if not answer:
        return INSUFFICIENT_DATA_ANSWER

    normalized = answer.strip()
    if not normalized:
        return INSUFFICIENT_DATA_ANSWER
    return normalized


def is_greeting(question: str) -> bool:
    normalized = " ".join(question.lower().split()).strip("!?. ,")
    return normalized in GREETING_TERMS


def is_unclear_question(question: str) -> bool:
    normalized = " ".join(question.lower().split()).strip()
    if len(normalized) < 4:
        return True
    vague_prompts = {
        "what is this",
        "what is this about",
        "help",
        "can you help",
        "tell me more",
        "more",
        "explain",
    }
    return normalized in vague_prompts


def is_in_scope_question(question: str) -> bool:
    tokens = _tokenize(question)
    return any(token in IN_SCOPE_KEYWORDS for token in tokens)


def build_suggested_questions(question: str, response_kind: str) -> list[str]:
    if response_kind == "greeting":
        return SUPPORTED_TOPIC_PROMPTS[:4]
    if response_kind == "out_of_scope":
        return SUPPORTED_TOPIC_PROMPTS[:4]
    if response_kind == "unclear":
        return SUPPORTED_TOPIC_PROMPTS[:4]
    if response_kind == "missing_data":
        return [
            "How do I pay my electricity bill?",
            "How do I register a marriage certificate?",
            "What are the emergency contact numbers?",
            "How do I apply for a business licence?",
        ]
    return []


def is_insufficient_answer(answer: str, sources: list[SourceItem]) -> bool:
    normalized = " ".join(normalize_answer(answer).split()).strip().lower()
    if not sources:
        return True
    return normalized == INSUFFICIENT_DATA_ANSWER.lower()


def append_citations(answer: str, sources: list[SourceItem]) -> str:
    answer = normalize_answer(answer)
    if not sources:
        return answer

    seen: set[str] = set()
    citations: list[str] = []
    for source in sources:
        title = source.title.strip()
        if not title or title in seen:
            continue
        seen.add(title)
        citations.append(f"[{title}]")

    if not citations:
        return answer

    citation_block = " ".join(citations)
    if citation_block in answer:
        return answer
    label = "Source" if len(citations) == 1 else "Sources"
    return f"{answer}\n\n{label}: {citation_block}"


def build_search_suggestions(question: str) -> list[SearchSuggestionItem]:
    settings = get_settings()
    query = f'Addis Ababa city services "{question}" site:gov.et OR site:addisababa.gov.et'
    url = f"{settings.fallback_search_base_url}?{urlencode({'q': query})}"
    return [
        SearchSuggestionItem(
            label="Search official government sources",
            url=url,
        )
    ]


def _tokenize(question: str) -> list[str]:
    normalized = "".join(character.lower() if character.isalnum() else " " for character in question)
    return [token for token in normalized.split() if token]
