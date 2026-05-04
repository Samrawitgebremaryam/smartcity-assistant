from dataclasses import dataclass


@dataclass
class ChunkedText:
    chunk_index: int
    text: str
    token_count: int
    section: str | None = None


class TextChunker:
    def __init__(self, chunk_size: int, chunk_overlap: int) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> list[ChunkedText]:
        words = text.split()
        if not words:
            return []

        chunks: list[ChunkedText] = []
        start = 0
        chunk_index = 0

        while start < len(words):
            end = min(start + self.chunk_size, len(words))
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words).strip()
            if chunk_text:
                chunks.append(
                    ChunkedText(
                        chunk_index=chunk_index,
                        text=chunk_text,
                        token_count=len(chunk_words),
                    )
                )
                chunk_index += 1

            if end == len(words):
                break

            start = max(end - self.chunk_overlap, start + 1)

        return chunks
