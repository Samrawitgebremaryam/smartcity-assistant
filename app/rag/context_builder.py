from app.db.models.chunk import Chunk
from app.db.models.document import Document


def build_context(items: list[tuple[Document, Chunk]]) -> str:
    blocks: list[str] = []
    for index, (document, chunk) in enumerate(items, start=1):
        blocks.append(f"[Source {index}: {document.title}]\n{chunk.text}")
    return "\n\n".join(blocks)
