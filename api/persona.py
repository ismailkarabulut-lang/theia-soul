"""
Persona API router — GET /snapshot endpoint'i.
persona_engine.analyze() sonucunu JSON olarak döner.
window parametresi: all | 7d | 30d
"""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from persona_engine import analyze

router = APIRouter()


@router.get("/snapshot")
async def persona_snapshot(window: str = Query("all", pattern="^(all|7d|30d)$")):
    try:
        return analyze(window)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
