import asyncio
import json
import sys
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from api.schemas import (
    ChatRequest, ChatResponse, SessionInfo, MemoryEntry, HealthResponse
)
from core import db
from core.base_model import GenerateRequest, Message
from models import factory

_vault = Path(__file__).resolve().parents[2] / "theia-vault"
if str(_vault) not in sys.path:
    sys.path.insert(0, str(_vault))

from core.theia_soul import build_system as _theia_system

router = APIRouter()


# --- Health ---

@router.get("/health", response_model=HealthResponse)
async def health():
    checks = {}
    for name in ("claude", "deepseek", "kimi", "ollama"):
        try:
            model = factory.get_model(name)
            checks[name] = await model.health_check()
        except Exception:
            checks[name] = False
    return HealthResponse(status="ok", models=checks)


# --- Chat ---

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    model = factory.get_model(req.model)

    history = await db.get_messages(req.session_id)
    if not history:
        await db.create_session(req.session_id, model.model_id)

    messages = [Message(role=m["role"], content=m["content"]) for m in history]
    messages.append(Message(role="user", content=req.message))

    gen_req = GenerateRequest(
        messages=messages,
        system=req.system if req.system is not None else _theia_system(),
        max_tokens=req.max_tokens,
        temperature=req.temperature,
    )

    response = await model.generate(gen_req)

    await db.add_message(req.session_id, "user", req.message)
    await db.add_message(
        req.session_id, "assistant", response.content,
        meta={"input_tokens": response.input_tokens, "output_tokens": response.output_tokens},
    )

    return ChatResponse(
        session_id=req.session_id,
        message=response.content,
        model=response.model,
        input_tokens=response.input_tokens,
        output_tokens=response.output_tokens,
    )


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    model = factory.get_model(req.model)

    history = await db.get_messages(req.session_id)
    if not history:
        await db.create_session(req.session_id, model.model_id)

    messages = [Message(role=m["role"], content=m["content"]) for m in history]
    messages.append(Message(role="user", content=req.message))

    gen_req = GenerateRequest(
        messages=messages,
        system=req.system if req.system is not None else _theia_system(),
        max_tokens=req.max_tokens,
        temperature=req.temperature,
        stream=True,
    )

    collected: list[str] = []

    async def event_stream():
        async for chunk in model.stream(gen_req):
            collected.append(chunk)
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

        full_text = "".join(collected)
        await db.add_message(req.session_id, "user", req.message)
        await db.add_message(req.session_id, "assistant", full_text)
        yield f"data: {json.dumps({'done': True, 'session_id': req.session_id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# --- Sessions ---

@router.get("/sessions", response_model=list[SessionInfo])
async def list_sessions():
    return await db.list_sessions()


@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str):
    return await db.get_messages(session_id)


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str):
    await db.delete_session(session_id)


# --- Memory ---

@router.get("/memory", response_model=list[MemoryEntry])
async def list_global_memory():
    return await db.list_memory()


@router.get("/memory/{session_id}", response_model=list[MemoryEntry])
async def list_session_memory(session_id: str):
    return await db.list_memory(session_id=session_id)


@router.put("/memory/{key}", status_code=204)
async def set_global_memory(key: str, value: str):
    await db.set_memory(key, value)
