import asyncio
import json
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from api.schemas import (
    MemoryWrite,
    ChatRequest, ChatResponse, SessionInfo, MemoryEntry, HealthResponse
)
from core import db
from core.base_model import GenerateRequest, Message
from core.theia_soul import build_system as _theia_system
from models import factory

router = APIRouter()


async def _build_system(req_system: str | None) -> str:
    if req_system is not None:
        return req_system
    entries = await db.list_memory()
    user_memory = "\n".join(f"{e['key']}: {e['value']}" for e in entries)
    return _theia_system(user_memory=user_memory)


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
        system=await _build_system(req.system),
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
        system=await _build_system(req.system),
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
async def set_global_memory(key: str, body: MemoryWrite):
    await db.set_memory_full(key, body.value, entry_type=body.entry_type, energy_level=body.energy_level, session_id=body.session_id)

@router.delete("/memory/{key}", status_code=204)
async def delete_global_memory(key: str):
    db_conn = await db.get_db()
    try:
        await db_conn.execute("DELETE FROM memory WHERE session_id IS NULL AND key = ?", (key,))
        await db_conn.commit()
    finally:
        await db_conn.close()

# --- Scout ---
@router.get("/scout/report")
async def scout_report(status: str | None = None):
    db_conn = await db.get_db()
    try:
        if status:
            async with db_conn.execute("""
                SELECT key, value, entry_type, energy_level, status, first_seen_at, updated_at
                FROM memory
                WHERE session_id IS NULL AND status = ?
                ORDER BY updated_at DESC
            """, (status,)) as cursor:
                rows = await cursor.fetchall()
        else:
            async with db_conn.execute("""
                SELECT key, value, entry_type, energy_level, status, first_seen_at, updated_at
                FROM memory
                WHERE session_id IS NULL
                ORDER BY updated_at DESC
            """) as cursor:
                rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db_conn.close()

@router.get("/scout/summary")
async def scout_summary():
    db_conn = await db.get_db()
    try:
        async with db_conn.execute("""
            SELECT status, COUNT(*) as count
            FROM memory
            WHERE session_id IS NULL
            GROUP BY status
        """) as cursor:
            status_rows = await cursor.fetchall()
        async with db_conn.execute("""
            SELECT COUNT(*) as total, MAX(updated_at) as last_update
            FROM memory
            WHERE session_id IS NULL
        """) as cursor:
            totals = await cursor.fetchone()
        return {
            "total": totals["total"],
            "last_update": totals["last_update"],
            "by_status": {row["status"]: row["count"] for row in status_rows}
        }
    finally:
        await db_conn.close()

@router.patch("/scout/status/{key}", status_code=204)
async def update_scout_status(key: str, body: dict):
    allowed = {"active", "passive", "archived"}
    new_status = body.get("status")
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Geçersiz status. İzin verilenler: {allowed}")
    db_conn = await db.get_db()
    try:
        await db_conn.execute(
            "UPDATE memory SET status = ? WHERE key = ? AND session_id IS NULL",
            (new_status, key)
        )
        await db_conn.commit()
    finally:
        await db_conn.close()


# --- Daily Brief ---
from datetime import datetime
from pydantic import BaseModel

class DailyBrief(BaseModel):
    text: str
    date: str | None = None
    projects: list[str] | None = None

@router.post("/soul/daily", status_code=201)
async def create_daily_brief(body: DailyBrief):
    date_key = body.date or datetime.utcnow().strftime("%Y-%m-%d")
    key = f"daily_{date_key}"
    value = body.text
    if body.projects:
        value = f"[Projeler: {', '.join(body.projects)}]\n\n{body.text}"
    await db.set_memory_full(
        key=key,
        value=value,
        entry_type="daily_summary",
        energy_level=None,
        session_id=None,
    )
    return {"key": key, "date": date_key, "stored": True}


# --- TTS / Speak ---
import edge_tts
from pydantic import BaseModel as _BaseModel

VOICES = {
    "tr":   "tr-TR-EmelNeural",
    "tr-m": "tr-TR-AhmetNeural",
    "en":   "en-US-JennyNeural",
}

class SpeakRequest(_BaseModel):
    text: str
    voice: str = "tr"
    rate: str  = "+0%"
    volume: str = "+0%"

@router.post("/speak")
async def speak(req: SpeakRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text boş olamaz")
    text  = req.text.strip()[:1000]
    voice = VOICES.get(req.voice, req.voice)
    try:
        communicate = edge_tts.Communicate(text=text, voice=voice, rate=req.rate, volume=req.volume)
        async def audio_generator():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        return StreamingResponse(
            audio_generator(),
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-cache", "X-Voice": voice},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS hatası: {str(e)}")

@router.get("/speak/voices")
async def speak_voices():
    return {"voices": VOICES, "default": "tr"}
