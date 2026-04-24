import csv
import json
from pathlib import Path


class FileParserService:
    supported_extensions = {".txt", ".md", ".json", ".csv", ".html", ".htm"}

    def extract_text(self, file_path: Path) -> str:
        suffix = file_path.suffix.lower()
        if suffix in {".txt", ".md", ".html", ".htm"}:
            return file_path.read_text(encoding="utf-8")
        if suffix == ".json":
            data = json.loads(file_path.read_text(encoding="utf-8"))
            return json.dumps(data, ensure_ascii=True, indent=2)
        if suffix == ".csv":
            rows: list[str] = []
            with file_path.open("r", encoding="utf-8", newline="") as handle:
                reader = csv.reader(handle)
                for row in reader:
                    rows.append(", ".join(value.strip() for value in row if value.strip()))
            return "\n".join(rows)
        raise ValueError(f"Unsupported file type: {suffix}")
