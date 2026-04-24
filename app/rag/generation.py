from __future__ import annotations

import asyncio
import re
from abc import ABC, abstractmethod
from typing import AsyncGenerator

from app.core.config import get_settings
from app.core.exceptions import ValidationError
from app.rag.fallbacks import INSUFFICIENT_DATA_ANSWER
from app.rag.prompts import SYSTEM_PROMPT


class GenerationService(ABC):
    @abstractmethod
    def generate_answer(self, question: str, context: str) -> tuple[str, float]:
        raise NotImplementedError

    async def generate_streaming(self, question: str, context: str) -> AsyncGenerator[str, None]:
        """Yield tokens one by one for streaming response."""
        answer, _ = self.generate_answer(question, context)
        for char in answer:
            yield char
            await asyncio.sleep(0.01)


class MockGenerationService(GenerationService):
    def generate_answer(self, question: str, context: str) -> tuple[str, float]:
        if not context.strip():
            return INSUFFICIENT_DATA_ANSWER, 0.0

        blocks = self._parse_context_blocks(context)
        if not blocks:
            return INSUFFICIENT_DATA_ANSWER, 0.0

        _, best_text = blocks[0]
        formatted = self._format_block(best_text)
        if not formatted:
            return INSUFFICIENT_DATA_ANSWER, 0.0
        _ = SYSTEM_PROMPT
        return formatted, 0.72

    def _parse_context_blocks(self, context: str) -> list[tuple[str, str]]:
        blocks: list[tuple[str, str]] = []
        current_title = ""
        current_lines: list[str] = []

        for raw_line in context.splitlines():
            line = raw_line.strip()
            if not line:
                if current_lines:
                    current_lines.append("")
                continue

            if line.startswith("[Source ") and ":" in line and line.endswith("]"):
                if current_lines:
                    blocks.append((current_title, "\n".join(current_lines).strip()))
                current_title = line.split(":", 1)[1].rstrip("]").strip()
                current_lines = []
                continue

            current_lines.append(line)

        if current_lines:
            blocks.append((current_title, "\n".join(current_lines).strip()))
        return blocks

    def _format_block(self, text: str) -> str:
        cleaned = self._clean_text(text)
        if not cleaned:
            return ""

        lines = [line.strip() for line in cleaned.splitlines()]
        paragraphs: list[str] = []
        list_items: list[str] = []
        numbered_items: list[str] = []
        sections: list[str] = []

        for line in lines:
            if not line:
                continue
            if line.startswith("#"):
                heading = line.lstrip("#").strip()
                if heading:
                    sections.append(f"## {heading}")
                continue
            if line.startswith("- "):
                list_items.append(line)
                continue
            if re.match(r"^\d+\.\s", line):
                numbered_items.append(line)
                continue
            if line.endswith(":") and len(line.split()) <= 6:
                sections.append(f"## {line[:-1]}")
                continue
            paragraphs.append(line)

        answer_parts: list[str] = []
        if paragraphs:
            answer_parts.append(self._normalize_paragraph(paragraphs[0]))

        if len(paragraphs) > 1 and len(answer_parts[0]) < 200:
            answer_parts.append(self._normalize_paragraph(paragraphs[1]))

        if sections:
            answer_parts.extend(sections[:3])
        if numbered_items:
            answer_parts.extend(numbered_items[:6])
        elif list_items:
            answer_parts.extend(list_items[:6])

        answer = "\n\n".join(part for part in answer_parts if part).strip()
        if len(answer) > 900:
            answer = answer[:897].rstrip() + "..."
        return answer

    def _clean_text(self, text: str) -> str:
        cleaned = text
        replacements = {
            "Â": "",
            "â€™": "'",
            "â€˜": "'",
            "â€œ": '"',
            "â€�": '"',
            "â€‘": "-",
            "â€“": "-",
            "â€”": "-",
            "ã€": "",
        }
        for source, target in replacements.items():
            cleaned = cleaned.replace(source, target)
        cleaned = re.sub(r"【[^】]+】", "", cleaned)
        cleaned = re.sub(r"\s+\*\s+", "\n- ", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    def _normalize_paragraph(self, paragraph: str) -> str:
        normalized = re.sub(r"\s+", " ", paragraph).strip()
        normalized = re.sub(r"\*\*(.*?)\*\*", r"\1", normalized)
        return normalized

    async def generate_streaming(self, question: str, context: str) -> AsyncGenerator[str, None]:
        answer, _ = self.generate_answer(question, context)
        words = answer.split()
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.05)


class OpenAIGenerationService(GenerationService):
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.openai_api_key:
            raise ValidationError("OPENAI_API_KEY is required for the OpenAI provider.")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise ValidationError("openai is not installed. Install it to use OpenAI.") from exc

        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def generate_answer(self, question: str, context: str) -> tuple[str, float]:
        if not context.strip():
            return INSUFFICIENT_DATA_ANSWER, 0.0

        response = self.client.responses.create(
            model=self.model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion:\n{question}",
                },
            ],
        )
        answer = getattr(response, "output_text", "").strip()
        if not answer:
            answer = INSUFFICIENT_DATA_ANSWER
        return answer, 0.9

    async def generate_streaming(self, question: str, context: str) -> AsyncGenerator[str, None]:
        if not context.strip():
            yield INSUFFICIENT_DATA_ANSWER
            return

        try:
            stream = self.client.responses.create(
                model=self.model,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"Context:\n{context}\n\nQuestion:\n{question}",
                    },
                ],
                stream=True,
            )
            for event in stream:
                if event.type == "response.output_text.delta":
                    yield event.delta
        except Exception:
            answer, _ = self.generate_answer(question, context)
            for word in answer.split():
                yield word + " "
                await asyncio.sleep(0.02)


class GeminiGenerationService(GenerationService):
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise ValidationError("GEMINI_API_KEY is required for the Gemini provider.")

        import httpx

        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_model
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self._client = httpx.Client(timeout=60.0)

    def generate_answer(self, question: str, context: str) -> tuple[str, float]:
        if not context.strip():
            return INSUFFICIENT_DATA_ANSWER, 0.0

        prompt = f"{SYSTEM_PROMPT}\n\nContext:\n{context}\n\nQuestion:\n{question}"

        url = f"{self.base_url}/models/{self.model}:generateContent"
        headers = {"Content-Type": "application/json"}
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
                "topP": 0.95,
                "topK": 40
            }
        }

        response = self._client.post(
            url,
            headers=headers,
            params={"key": self.api_key},
            json=body
        )

        if response.status_code != 200:
            raise ValidationError(f"Gemini API error: {response.status_code} - {response.text}")

        result = response.json()
        candidates = result.get("candidates", [])
        if not candidates:
            raise ValidationError("Gemini returned no candidates")

        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        if not parts:
            raise ValidationError("Gemini returned no content parts")

        answer = parts[0].get("text", "").strip()
        if not answer:
            answer = INSUFFICIENT_DATA_ANSWER

        return answer, 0.9

    async def generate_streaming(self, question: str, context: str) -> AsyncGenerator[str, None]:
        answer, _ = self.generate_answer(question, context)
        for word in answer.split():
            yield word + " "
            await asyncio.sleep(0.02)


def get_generation_service() -> GenerationService:
    settings = get_settings()
    if settings.llm_provider == "mock":
        return MockGenerationService()
    if settings.llm_provider == "openai":
        return OpenAIGenerationService()
    if settings.llm_provider == "gemini":
        return GeminiGenerationService()
    raise ValidationError(f"Unsupported LLM provider: {settings.llm_provider}")
