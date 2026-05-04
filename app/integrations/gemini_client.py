from app.core.config import get_settings


class GeminiClient:
    def __init__(self) -> None:
        self.api_key = get_settings().gemini_api_key
