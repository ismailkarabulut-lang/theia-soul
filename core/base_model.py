from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional


@dataclass
class Message:
    role: str  # "user" | "assistant" | "system"
    content: str


@dataclass
class GenerateRequest:
    messages: list[Message]
    system: Optional[str] = None
    max_tokens: int = 2048
    temperature: float = 0.7
    stream: bool = False
    metadata: dict = field(default_factory=dict)


@dataclass
class GenerateResponse:
    content: str
    model: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    stop_reason: Optional[str] = None


class BaseModel(ABC):
    def __init__(self, model_id: str):
        self.model_id = model_id

    @abstractmethod
    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        """Single-shot generation."""
        ...

    @abstractmethod
    async def stream(self, request: GenerateRequest) -> AsyncIterator[str]:
        """Streaming generation — yields text chunks."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Returns True if the backend is reachable."""
        ...

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(model_id={self.model_id!r})"
