from typing import Optional
from pydantic import BaseModel, Field
import uuid


class ChatRequest(BaseModel):
    message: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model: Optional[str] = None
    system: Optional[str] = None
    stream: bool = False
    max_tokens: int = 2048
    temperature: float = 0.7


class ChatResponse(BaseModel):
    session_id: str
    message: str
    model: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


class SessionInfo(BaseModel):
    id: str
    model: str
    title: Optional[str]
    created_at: str
    updated_at: str


class MemoryEntry(BaseModel):
    key: str
    value: str
    updated_at: str
    entry_type: Optional[str] = "memory"
    energy_level: Optional[int] = None


class HealthResponse(BaseModel):
    status: str
    models: dict[str, bool]


class MemoryWrite(BaseModel):
    value: str
    entry_type: str = "memory"
    energy_level: Optional[int] = None
    session_id: Optional[str] = None
