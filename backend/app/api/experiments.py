from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.entities import Experiment, ModelRecord, HardwareDevice
from backend.app.schemas import ExperimentCreate, ExperimentResponse

router = APIRouter(prefix="/experiments", tags=["Experiments"])

@router.get("", response_model=List[ExperimentResponse])
async def list_experiments(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Experiment)
        .options(selectinload(Experiment.run))
        .order_by(Experiment.created_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=ExperimentResponse)
async def create_experiment(payload: ExperimentCreate, db: AsyncSession = Depends(get_db)):
    # Verify model exists
    stmt_m = select(ModelRecord).where(ModelRecord.id == payload.model_id)
    res_m = await db.execute(stmt_m)
    model = res_m.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Verify hardware exists
    stmt_h = select(HardwareDevice).where(HardwareDevice.id == payload.hardware_id)
    res_h = await db.execute(stmt_h)
    hardware = res_h.scalar_one_or_none()
    if not hardware:
        raise HTTPException(status_code=404, detail="Hardware device not found")

    exp_name = payload.name or f"{model.name} [{payload.precision.upper()}] on {hardware.name}"

    exp = Experiment(
        name=exp_name,
        model_id=payload.model_id,
        dataset_id=payload.dataset_id,
        hardware_id=payload.hardware_id,
        runtime=payload.runtime,
        execution_provider=payload.execution_provider,
        precision=payload.precision,
        batch_size=payload.batch_size,
        iterations=payload.iterations,
        warmup_iterations=payload.warmup_iterations,
        status="QUEUED",
        progress=0.0
    )
    db.add(exp)
    await db.commit()
    
    # Reload with eager relationships
    stmt_reload = select(Experiment).options(selectinload(Experiment.run)).where(Experiment.id == exp.id)
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalar_one()

@router.get("/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(experiment_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Experiment)
        .options(selectinload(Experiment.run))
        .where(Experiment.id == experiment_id)
    )
    res = await db.execute(stmt)
    exp = res.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp
