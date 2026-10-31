from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.entities import ModelRecord
from backend.app.services.optimizer import optimize_onnx_model
from backend.app.services.onnx_inspector import inspect_onnx_file

router = APIRouter(prefix="/optimizations", tags=["Optimizations"])

class QuantizeRequest(BaseModel):
    model_id: str
    optimization_type: str = "int8_dynamic"  # "int8_dynamic", "int8_static", "fp16", "graph_opt"
    register_as_new_model: bool = True

@router.post("/quantize", response_model=Dict[str, Any])
async def quantize_model(payload: QuantizeRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(ModelRecord).where(ModelRecord.id == payload.model_id)
    res = await db.execute(stmt)
    model = res.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    input_path = Path(model.filepath)
    suffix = f"_{payload.optimization_type}.onnx"
    out_filename = f"{Path(model.filename).stem}{suffix}"
    output_path = settings.MODELS_DIR / out_filename

    try:
        report = optimize_onnx_model(input_path, output_path, payload.optimization_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quantization failed: {str(e)}")

    new_model_id = None
    if payload.register_as_new_model:
        inspection = inspect_onnx_file(output_path)
        new_record = ModelRecord(
            name=f"{model.name} [{payload.optimization_type.upper()}]",
            filename=out_filename,
            filepath=str(output_path),
            file_size_bytes=inspection["file_size_bytes"],
            format="onnx",
            sha256=inspection["sha256"],
            opset_version=inspection["opset_version"],
            input_shapes=inspection["input_shapes"],
            output_shapes=inspection["output_shapes"],
            operators=inspection["operators"],
            node_count=inspection["node_count"],
            task_type=model.task_type,
            metadata_json={
                "base_model_id": model.id,
                "optimization_type": payload.optimization_type,
                "compression_reduction_pct": report["compression_reduction_pct"]
            }
        )
        db.add(new_record)
        await db.commit()
        await db.refresh(new_record)
        new_model_id = new_record.id

    report["new_model_id"] = new_model_id
    return report
