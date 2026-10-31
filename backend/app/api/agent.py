from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.entities import AgentSession, AgentTrace
from backend.app.schemas import AgentMessageRequest, AgentSessionResponse
from backend.app.services.agent_service import AgentOrchestrator
from backend.app.services.meta_provider import meta_provider

router = APIRouter(prefix="/agent", tags=["Agent"])

@router.get("/meta-status")
async def get_meta_status():
    """
    Exposes honest status of Meta AI provider connection and credentials.
    """
    return meta_provider.get_status()

@router.post("/chat", response_model=AgentSessionResponse)
async def chat_with_agent(payload: AgentMessageRequest, db: AsyncSession = Depends(get_db)):
    result = await AgentOrchestrator.process_user_query(
        db=db,
        session_id=payload.session_id,
        user_message=payload.message,
        model_id=payload.model_id,
        constraints=payload.constraints
    )
    return AgentSessionResponse(
        session_id=result["session_id"],
        title=result["title"],
        mode=result["mode"],
        reply=result["reply"],
        traces=result["traces"],
        recommendation=None
    )

@router.get("/sessions")
async def list_agent_sessions(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(AgentSession)
        .options(selectinload(AgentSession.traces))
        .order_by(AgentSession.created_at.desc())
    )
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "mode": s.mode,
            "traces_count": len(s.traces),
            "created_at": s.created_at
        }
        for s in sessions
    ]

@router.get("/sessions/{session_id}")
async def get_session_details(session_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(AgentSession)
        .options(selectinload(AgentSession.traces))
        .where(AgentSession.id == session_id)
    )
    res = await db.execute(stmt)
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Agent session not found")
    return {
        "id": s.id,
        "title": s.title,
        "mode": s.mode,
        "traces": [
            {
                "step_number": t.step_number,
                "role": t.role,
                "thought": t.thought,
                "tool_name": t.tool_name,
                "tool_args": t.tool_args_json,
                "tool_result": t.tool_result_json,
                "content": t.content,
                "status": t.status,
                "created_at": t.created_at
            }
            for t in s.traces
        ]
    }
