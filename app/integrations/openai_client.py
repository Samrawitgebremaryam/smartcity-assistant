from app.core.config import get_settings


class OpenAIClient:
    def __init__(self) -> None:
        self.api_key = get_settings().openai_api_key
