from typing import AsyncIterator

from openai import AsyncOpenAI

from core.base_model import BaseModel, GenerateRequest, GenerateResponse, Message

DEEPSEEK_BASE_URL = "https://api.deepseek.com"


def _to_openai_messages(messages: list[Message], system: str | None) -> list[dict]:
    result = []
    if system:
        result.append({"role": "system", "content": system})
    result.extend({"role": m.role, "content": m.content} for m in messages)
    return result


class DeepSeekModel(BaseModel):
    def __init__(self, model_id: str = "deepseek-chat", api_key: str | None = None):
        super().__init__(model_id)
        self.client = AsyncOpenAI(api_key=api_key, base_url=DEEPSEEK_BASE_URL)

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        response = await self.client.chat.completions.create(
            model=self.model_id,
            messages=_to_openai_messages(request.messages, request.system),
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            stream=False,
        )
        choice = response.choices[0]
        return GenerateResponse(
            content=choice.message.content or "",
            model=response.model,
            input_tokens=response.usage.prompt_tokens if response.usage else None,
            output_tokens=response.usage.completion_tokens if response.usage else None,
            stop_reason=choice.finish_reason,
        )

    async def stream(self, request: GenerateRequest) -> AsyncIterator[str]:
        async with await self.client.chat.completions.create(
            model=self.model_id,
            messages=_to_openai_messages(request.messages, request.system),
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            stream=True,
        ) as stream:
            async for chunk in stream:
                if content := chunk.choices[0].delta.content:
                    yield content

    async def health_check(self) -> bool:
        try:
            await self.client.models.list()
            return True
        except Exception:
            return False
