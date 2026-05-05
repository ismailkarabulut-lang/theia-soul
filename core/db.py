import json
from datetime import datetime
from pathlib import Path

import aiosqlite

from core import config

_CREATE_SESSIONS = """
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    model       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    title       TEXT
)
"""

_CREATE_MESSAGES = """
CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    meta        TEXT
)
"""

_CREATE_MEMORY = """
CREATE TABLE IF NOT EXISTS memory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT,
    key         TEXT NOT NULL,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    UNIQUE(session_id, key)
)
"""


async def get_db() -> aiosqlite.Connection:
    path = Path(config.DB_PATH).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(str(path))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db() -> None:
    db = await get_db()
    try:
        await db.execute(_CREATE_SESSIONS)
        await db.execute(_CREATE_MESSAGES)
        await db.execute(_CREATE_MEMORY)
        await db.commit()
    finally:
        await db.close()


async def create_session(session_id: str, model: str, title: str | None = None) -> None:
    now = _now()
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO sessions (id, model, created_at, updated_at, title) VALUES (?, ?, ?, ?, ?)",
            (session_id, model, now, now, title),
        )
        await db.commit()
    finally:
        await db.close()


async def list_sessions() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM sessions ORDER BY updated_at DESC")
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()


async def delete_session(session_id: str) -> None:
    db = await get_db()
    try:
        await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await db.commit()
    finally:
        await db.close()


async def add_message(session_id: str, role: str, content: str, meta: dict | None = None) -> None:
    now = _now()
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO messages (session_id, role, content, created_at, meta) VALUES (?, ?, ?, ?, ?)",
            (session_id, role, content, now, json.dumps(meta) if meta else None),
        )
        await db.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id)
        )
        await db.commit()
    finally:
        await db.close()


async def get_messages(session_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT role, content, created_at, meta FROM messages WHERE session_id = ? ORDER BY id",
            (session_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def set_memory(key: str, value: str, session_id: str | None = None) -> None:
    now = _now()
    db = await get_db()
    try:
        await db.execute(
            """
            INSERT INTO memory (session_id, key, value, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(session_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """,
            (session_id, key, value, now),
        )
        await db.commit()
    finally:
        await db.close()


async def get_memory(key: str, session_id: str | None = None) -> str | None:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT value FROM memory WHERE session_id IS ? AND key = ?",
            (session_id, key),
        )
        row = await cursor.fetchone()
        return row["value"] if row else None
    finally:
        await db.close()


async def list_memory(session_id: str | None = None) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT key, value, updated_at FROM memory WHERE session_id IS ? ORDER BY key",
            (session_id,),
        )
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()


def _now() -> str:
    return datetime.utcnow().isoformat()
