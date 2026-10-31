import os
import shutil
import zipfile
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.entities import DatasetRecord
from backend.app.schemas import DatasetResponse
from backend.app.services.accuracy_evaluator import parse_yolo_annotations

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.get("", response_model=List[DatasetResponse])
async def list_datasets(db: AsyncSession = Depends(get_db)):
    stmt = select(DatasetRecord).order_by(DatasetRecord.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(None),
    task_type: str = Form("object_detection"),
    format: str = Form("yolo"),
    db: AsyncSession = Depends(get_db)
):
    dataset_name = name or Path(file.filename).stem
    dest_dir = settings.DATASETS_DIR / dataset_name
    dest_dir.mkdir(parents=True, exist_ok=True)

    archive_path = dest_dir / file.filename
    with open(archive_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract if ZIP
    if file.filename.endswith(".zip"):
        with zipfile.ZipFile(archive_path, "r") as zip_ref:
            zip_ref.extractall(dest_dir)
        archive_path.unlink()

    # Discover images and labels
    images_dir = dest_dir / "images"
    if not images_dir.exists():
        images_dir = dest_dir

    labels_dir = dest_dir / "labels"
    image_files = [f for f in images_dir.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
    
    classes = ["class_0", "class_1", "class_2", "class_3"]
    yaml_file = dest_dir / "data.yaml"
    if yaml_file.exists():
        try:
            import yaml
            with open(yaml_file, "r") as yf:
                ydata = yaml.safe_load(yf)
                if isinstance(ydata, dict) and "names" in ydata:
                    classes = ydata["names"] if isinstance(ydata["names"], list) else list(ydata["names"].values())
        except Exception:
            pass

    record = DatasetRecord(
        name=dataset_name,
        task_type=task_type,
        format=format,
        filepath=str(dest_dir),
        images_dir=str(images_dir),
        annotations_path=str(labels_dir) if labels_dir.exists() else None,
        num_samples=len(image_files),
        classes=classes,
        metadata_json={
            "num_images": len(image_files),
            "labels_found": labels_dir.exists()
        }
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record

@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(DatasetRecord).where(DatasetRecord.id == dataset_id)
    res = await db.execute(stmt)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/{dataset_id}/preview")
async def preview_dataset(dataset_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(DatasetRecord).where(DatasetRecord.id == dataset_id)
    res = await db.execute(stmt)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    images_dir = Path(dataset.images_dir)
    labels_dir = Path(dataset.annotations_path) if dataset.annotations_path else None

    if not images_dir.exists():
        return {"samples": []}

    image_files = sorted([f for f in images_dir.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png")])[:6]
    samples = []

    for img_path in image_files:
        try:
            with Image.open(img_path) as im:
                w, h = im.size
        except Exception:
            w, h = 640, 640

        boxes = []
        if labels_dir and labels_dir.exists():
            lbl_file = labels_dir / f"{img_path.stem}.txt"
            if lbl_file.exists():
                boxes = parse_yolo_annotations(lbl_file, w, h)

        samples.append({
            "filename": img_path.name,
            "width": w,
            "height": h,
            "boxes": boxes,
            "image_url": f"/api/v1/datasets/{dataset_id}/image/{img_path.name}"
        })

    return {
        "dataset_id": dataset.id,
        "classes": dataset.classes,
        "total_samples": dataset.num_samples,
        "samples": samples
    }

@router.get("/{dataset_id}/image/{filename}")
async def get_dataset_image(dataset_id: str, filename: str, db: AsyncSession = Depends(get_db)):
    stmt = select(DatasetRecord).where(DatasetRecord.id == dataset_id)
    res = await db.execute(stmt)
    dataset = res.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    img_path = Path(dataset.images_dir) / filename
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")
    return FileResponse(str(img_path))

@router.post("/seed-sample", response_model=DatasetResponse)
async def seed_sample_dataset(db: AsyncSession = Depends(get_db)):
    src_dir = settings.WORKSPACE_DIR / "sample_assets" / "datasets" / "edge_val_dataset"
    if not src_dir.exists():
        raise HTTPException(status_code=404, detail="Sample dataset not found on disk")

    dest_dir = settings.DATASETS_DIR / "edge_val_dataset"
    if not dest_dir.exists():
        shutil.copytree(src_dir, dest_dir)

    images_dir = dest_dir / "images"
    labels_dir = dest_dir / "labels"
    image_files = [f for f in images_dir.iterdir() if f.suffix.lower() in (".jpg", ".png")]

    classes = ["drone", "vehicle", "pedestrian", "sensor"]

    # Check if already in DB
    stmt = select(DatasetRecord).where(DatasetRecord.name == "Edge Vision Benchmark Val (12 frames)")
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return existing

    record = DatasetRecord(
        name="Edge Vision Benchmark Val (12 frames)",
        task_type="object_detection",
        format="yolo",
        filepath=str(dest_dir),
        images_dir=str(images_dir),
        annotations_path=str(labels_dir),
        num_samples=len(image_files),
        classes=classes,
        metadata_json={
            "description": "Standardized multi-class edge computer vision validation set with ground-truth bounding boxes"
        }
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record
