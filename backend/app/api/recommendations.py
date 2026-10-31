from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.entities import ModelRecord, BenchmarkRun, HardwareDevice, Recommendation
from backend.app.schemas import RecommendationRequest, RecommendationResponse
from backend.app.services.recommendation_engine import RecommendationEngine

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.post("", response_model=RecommendationResponse)
async def generate_recommendation(payload: RecommendationRequest, db: AsyncSession = Depends(get_db)):
    stmt_m = select(ModelRecord).where(ModelRecord.id == payload.model_id)
    res_m = await db.execute(stmt_m)
    model = res_m.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Fetch all benchmark runs for this model or its variants
    stmt_runs = select(BenchmarkRun).where(BenchmarkRun.model_id == payload.model_id)
    res_runs = await db.execute(stmt_runs)
    runs = res_runs.scalars().all()

    if not runs:
        raise HTTPException(
            status_code=400,
            detail="No benchmark runs found for this model. Run at least one benchmark before requesting recommendations."
        )

    # Fetch hardware devices
    stmt_devs = select(HardwareDevice)
    res_devs = await db.execute(stmt_devs)
    dev_map = {d.id: d.__dict__ for d in res_devs.scalars().all()}

    runs_with_devices = [
        (r.__dict__, dev_map.get(r.hardware_id, {}))
        for r in runs
    ]

    rec = RecommendationEngine.rank_and_recommend(
        runs_with_devices=runs_with_devices,
        constraints=payload.constraints,
        objective=payload.objective
    )

    winner_candidate = rec["winner"]
    winner_dict = winner_candidate.model_dump() if winner_candidate else None

    db_rec = Recommendation(
        objective=payload.objective,
        constraints_json=payload.constraints.model_dump(),
        winner_run_id=winner_dict["run_id"] if winner_dict else None,
        winner_hardware_id=winner_dict["hardware_id"] if winner_dict else None,
        pareto_candidates_json=[c.model_dump() for c in rec["pareto_candidates"]],
        violated_candidates_json=[c.model_dump() for c in rec["violated_candidates"]],
        agent_justification=rec["justification"]
    )
    db.add(db_rec)
    await db.commit()
    await db.refresh(db_rec)

    return RecommendationResponse(
        id=db_rec.id,
        objective=db_rec.objective,
        constraints=payload.constraints,
        winner=winner_candidate,
        pareto_candidates=rec["pareto_candidates"],
        violated_candidates=rec["violated_candidates"],
        justification=rec["justification"],
        created_at=db_rec.created_at
    )

@router.get("", response_model=List[Dict[str, Any]])
async def list_recommendations(db: AsyncSession = Depends(get_db)):
    stmt = select(Recommendation).order_by(Recommendation.created_at.desc())
    res = await db.execute(stmt)
    recs = res.scalars().all()
    return [
        {
            "id": r.id,
            "objective": r.objective,
            "constraints": r.constraints_json,
            "winner_run_id": r.winner_run_id,
            "winner_hardware_id": r.winner_hardware_id,
            "pareto_candidates_count": len(r.pareto_candidates_json or []),
            "violated_candidates_count": len(r.violated_candidates_json or []),
            "justification": r.agent_justification,
            "created_at": r.created_at
        }
        for r in recs
    ]
