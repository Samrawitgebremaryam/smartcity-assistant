from pathlib import Path

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    sample_file = Path("data/sample/broken_streetlight_guide.txt")
    target_file = upload_dir / sample_file.name
    target_file.write_text(sample_file.read_text(encoding="utf-8"), encoding="utf-8")


if __name__ == "__main__":
    main()
