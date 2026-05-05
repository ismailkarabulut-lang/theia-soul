from pathlib import Path

from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parents[1] / ".env")


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Required environment variable '{key}' is not set.")
    return value


def _get(key: str, default: str) -> str:
    return os.getenv(key, default)


# --- API Keys ---
ANTHROPIC_API_KEY: str = _require("ANTHROPIC_API_KEY")
DEEPSEEK_API_KEY: str = _require("DEEPSEEK_API_KEY")
KIMI_API_KEY: str = _require("KIMI_API_KEY")

# --- Model IDs (override via .env) ---
CLAUDE_MODEL_ID: str = _get("CLAUDE_MODEL_ID", "claude-sonnet-4-6")
DEEPSEEK_MODEL_ID: str = _get("DEEPSEEK_MODEL_ID", "deepseek-chat")
KIMI_MODEL_ID: str = _get("KIMI_MODEL_ID", "moonshot-v1-8k")
OLLAMA_MODEL_ID: str = _get("OLLAMA_MODEL_ID", "llama3")

# --- Backends ---
OLLAMA_BASE_URL: str = _get("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL: str = _get("DEFAULT_MODEL", "claude")  # claude | deepseek | kimi | ollama

# --- Storage ---
DB_PATH: str = _get("DB_PATH", str(Path(__file__).parents[1] / "memory" / "theia.db"))

# --- API Server ---
API_HOST: str = _get("API_HOST", "0.0.0.0")
API_PORT: int = int(_get("API_PORT", "8000"))

# --- Logging ---
LOG_LEVEL: str = _get("LOG_LEVEL", "INFO")
