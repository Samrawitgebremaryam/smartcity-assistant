class SmartCityAssistantError(Exception):
    """Base application exception."""


class NotFoundError(SmartCityAssistantError):
    """Raised when an entity is not found."""


class ValidationError(SmartCityAssistantError):
    """Raised for application validation failures."""
