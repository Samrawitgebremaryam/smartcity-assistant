from app.db.models.chunk import Chunk
from app.db.models.document import Document
from app.schemas.chat import SourceItem


def build_sources(items: list[tuple[Document, Chunk]]) -> list[SourceItem]:
    sources: list[SourceItem] = []
    seen_titles: set[str] = set()
    for document, chunk in items:
        title = document.title.strip()
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)
        sources.append(
            SourceItem(
                title=title,
                category=document.category,
                source=document.source,
                document_id=document.id,
                chunk_id=chunk.id,
            )
        )
        if len(sources) >= 3:
            break
    return sources
