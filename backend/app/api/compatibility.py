from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.entities import ModelRecord, HardwareDevice
from backend.app.services.compatibility_service import CompatibilityEngine

router = APIRouter(prefix="/compatibility", tags=["Compatibility"])

class CompatibilityCheckRequest(BaseModel):
    model_id: str
    hardware_id: str
    runtime: str = "onnxruntime"
    precision: str = "fp32"

@router.post("/check", response_model=Dict[str, Any])
async def check_compatibility(payload: CompatibilityCheckRequest, db: AsyncSession = Depends(get_db)):
    stmt_m = select(ModelRecord).where(ModelRecord.id == payload.model_id)
    res_m = await db.execute(stmt_m)
    model = res_m.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    stmt_d = select(HardwareDevice).where(HardwareDevice.id == payload.hardware_id)
    res_d = await db.execute(stmt_d)
    device = res_d.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Hardware device not found")

    model_info = {
        "id": model.id,
        "name": model.name,
        "opset_version": model.opset_version,
        "operators": model.operators,
        "input_shapes": model.input_shapes,
        "output_shapes": model.output_shapes,
    }

    device_info = {
        "id": device.id,
        "name": device.name,
        "device_type": device.device_type,
        "status": device.status,
        "is_local": device.is_local,
        "supported_runtimes": device.supported_runtimes,
        "supported_precisions": device.supported_precisions,
    }

    return CompatibilityEngine.check_compatibility(
        model_info=model_info,
        device_info=device_info,
        runtime=payload.runtime,
        precision=payload.precision
    )

@router.get("/matrix/{model_id}")
async def get_compatibility_matrix(model_id: str, db: AsyncSession = Depends(get_db)):
    stmt_m = select(ModelRecord).where(ModelRecord.id == model_id)
    res_m = await db.execute(stmt_m)
    model = res_m.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    stmt_d = select(HardwareDevice)
    res_d = await db.execute(stmt_d)
    devices = res_d.scalars().all()

    model_info = {
        "id": model.id,
        "name": model.name,
        "opset_version": model.opset_version,
        "operators": model.operators,
        "input_shapes": model.input_shapes,
    }

    results = []
    for d in devices:
        d_info = {
            "id": d.id,
            "name": d.name,
            "device_type": d.device_type,
            "status": d.status,
            "is_local": d.is_local,
            "supported_runtimes": d.supported_runtimes,
            "supported_precisions": d.supported_precisions,
        }
        res = CompatibilityEngine.check_compatibility(
            model_info=model_info,
            device_info=d_info,
            runtime=d.supported_runtimes[0] if d.supported_runtimes else "onnxruntime",
            precision="fp32" if "fp32" in d.supported_precisions else d.supported_precisions[0]
        )
        results.append(res)

    return {
        "model_id": model_id,
        "model_name": model.name,
        "device_evaluations": results
    }
