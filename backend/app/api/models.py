import shutil
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.entities import ModelRecord
from backend.app.schemas import ModelResponse
from backend.app.services.onnx_inspector import inspect_onnx_file

router = APIRouter(prefix="/models", tags=["Models"])

@router.get("", response_model=List[ModelResponse])
async def list_models(db: AsyncSession = Depends(get_db)):
    stmt = select(ModelRecord).order_by(ModelRecord.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/upload", response_model=ModelResponse)
async def upload_model(
    file: UploadFile = File(...),
    name: str = Form(None),
    task_type: str = Form("object_detection"),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith(".onnx"):
        raise HTTPException(status_code=400, detail="Only .onnx model files are currently supported")

    model_name = name or Path(file.filename).stem
    save_path = settings.MODELS_DIR / file.filename

    # Enforce upload size limit while streaming
    bytes_written = 0
    with open(save_path, "wb") as buffer:
        while chunk := file.file.read(65536):
            bytes_written += len(chunk)
            if bytes_written > settings.MAX_UPLOAD_SIZE_BYTES:
                buffer.close()
                save_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"Model file size exceeds {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB maximum limit")
            buffer.write(chunk)

    try:
        inspection = inspect_onnx_file(save_path)
    except Exception as e:
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to inspect ONNX model: {str(e)}")

    record = ModelRecord(
        name=model_name,
        filename=file.filename,
        filepath=str(save_path),
        file_size_bytes=inspection["file_size_bytes"],
        format="onnx",
        sha256=inspection["sha256"],
        opset_version=inspection["opset_version"],
        input_shapes=inspection["input_shapes"],
        output_shapes=inspection["output_shapes"],
        operators=inspection["operators"],
        node_count=inspection["node_count"],
        task_type=task_type or inspection["task_type"],
        metadata_json={
            "ir_version": inspection.get("ir_version"),
            "producer_name": inspection.get("producer_name")
        }
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record

@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(ModelRecord).where(ModelRecord.id == model_id)
    res = await db.execute(stmt)
    model = res.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model

@router.delete("/{model_id}")
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(ModelRecord).where(ModelRecord.id == model_id)
    res = await db.execute(stmt)
    model = res.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    file_path = Path(model.filepath)
    if file_path.exists():
        file_path.unlink()

    await db.delete(model)
    await db.commit()
    return {"message": "Model deleted successfully"}

@router.post("/seed-sample", response_model=ModelResponse)
async def seed_sample_model(db: AsyncSession = Depends(get_db)):
    sample_file = settings.WORKSPACE_DIR / "sample_assets" / "models" / "edge_tiny_yolo.onnx"
    if not sample_file.exists():
        raise HTTPException(status_code=404, detail="Sample model file not found on disk")

    dest_file = settings.MODELS_DIR / "edge_tiny_yolo.onnx"
    if not dest_file.exists():
        shutil.copyfile(sample_file, dest_file)

    inspection = inspect_onnx_file(dest_file)

    # Check if already in DB
    stmt = select(ModelRecord).where(ModelRecord.sha256 == inspection["sha256"])
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return existing

    record = ModelRecord(
        name="Edge Tiny YOLO (v8-nano style)",
        filename="edge_tiny_yolo.onnx",
        filepath=str(dest_file),
        file_size_bytes=inspection["file_size_bytes"],
        format="onnx",
        sha256=inspection["sha256"],
        opset_version=inspection["opset_version"],
        input_shapes=inspection["input_shapes"],
        output_shapes=inspection["output_shapes"],
        operators=inspection["operators"],
        node_count=inspection["node_count"],
        task_type="object_detection",
        metadata_json={
            "description": "Lightweight anchor-free mobile CNN detector optimized for edge benchmarking"
        }
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record
