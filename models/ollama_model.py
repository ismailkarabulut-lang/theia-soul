from typing import AsyncIterator

import httpx

from core.base_model import BaseModel, GenerateRequest, GenerateResponse, Message

DEFAULT_BASE_URL = "http://localhost:11434"


def _to_ollama_messages(messages: list[Message]) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in messages]


class OllamaModel(BaseModel):
    def __init__(self, model_id: str = "llama3", base_url: str = DEFAULT_BASE_URL):
        super().__init__(model_id)
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(base_url=self.base_url, timeout=120.0)

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        messages = _to_ollama_messages(request.messages)
        if request.system:
            messages.insert(0, {"role": "system", "content": request.system})

        resp = await self._client.post("/api/chat", json={
            "model": self.model_id,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens,
            },
        })
        resp.raise_for_status()
        data = resp.json()
        return GenerateResponse(
            content=data["message"]["content"],
            model=self.model_id,
            input_tokens=data.get("prompt_eval_count"),
            output_tokens=data.get("eval_count"),
            stop_reason=data.get("done_reason"),
        )

    async def stream(self, request: GenerateRequest) -> AsyncIterator[str]:
        messages = _to_ollama_messages(request.messages)
        if request.system:
            messages.insert(0, {"role": "system", "content": request.system})

        async with self._client.stream("POST", "/api/chat", json={
            "model": self.model_id,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens,
            },
        }) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                import json
                chunk = json.loads(line)
                if content := chunk.get("message", {}).get("content"):
                    yield content

    async def health_check(self) -> bool:
        try:
            resp = await self._client.get("/api/tags")
            return resp.status_code == 200
        except Exception:
            return False
