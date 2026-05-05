from typing import AsyncIterator

import anthropic

from core.base_model import BaseModel, GenerateRequest, GenerateResponse, Message


def _to_anthropic_messages(messages: list[Message]) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in messages if m.role != "system"]


class ClaudeModel(BaseModel):
    def __init__(self, model_id: str = "claude-sonnet-4-6", api_key: str | None = None):
        super().__init__(model_id)
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        system = request.system or anthropic.NOT_GIVEN
        response = await self.client.messages.create(
            model=self.model_id,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system=system,
            messages=_to_anthropic_messages(request.messages),
        )
        return GenerateResponse(
            content=response.content[0].text,
            model=response.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            stop_reason=response.stop_reason,
        )

    async def stream(self, request: GenerateRequest) -> AsyncIterator[str]:
        system = request.system or anthropic.NOT_GIVEN
        async with self.client.messages.stream(
            model=self.model_id,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system=system,
            messages=_to_anthropic_messages(request.messages),
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def health_check(self) -> bool:
        try:
            await self.client.models.retrieve(self.model_id)
            return True
        except Exception:
            return False
