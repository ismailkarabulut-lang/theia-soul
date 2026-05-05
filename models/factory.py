from core.base_model import BaseModel
from core import config

_registry: dict[str, BaseModel] = {}


def get_model(name: str | None = None) -> BaseModel:
    """
    Returns a cached model instance by name.
    name: "claude" | "deepseek" | "kimi" | "ollama" — falls back to DEFAULT_MODEL.
    """
    key = (name or config.DEFAULT_MODEL).lower()

    if key not in _registry:
        _registry[key] = _build(key)

    return _registry[key]


def _build(key: str) -> BaseModel:
    if key == "claude":
        from models.claude_model import ClaudeModel
        return ClaudeModel(model_id=config.CLAUDE_MODEL_ID, api_key=config.ANTHROPIC_API_KEY)

    if key == "deepseek":
        from models.deepseek_model import DeepSeekModel
        return DeepSeekModel(model_id=config.DEEPSEEK_MODEL_ID, api_key=config.DEEPSEEK_API_KEY)

    if key == "kimi":
        from models.kimi_model import KimiModel
        return KimiModel(model_id=config.KIMI_MODEL_ID, api_key=config.KIMI_API_KEY)

    if key == "ollama":
        from models.ollama_model import OllamaModel
        return OllamaModel(model_id=config.OLLAMA_MODEL_ID, base_url=config.OLLAMA_BASE_URL)

    raise ValueError(f"Unknown model '{key}'. Choose: claude | deepseek | kimi | ollama")
