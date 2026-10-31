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
from backend.app.services.accuracy_evaluator import parse_yolo_annotations, parse_coco_annotations

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
    bytes_written = 0
    with open(archive_path, "wb") as buffer:
        while chunk := file.file.read(65536):
            bytes_written += len(chunk)
            if bytes_written > settings.MAX_UPLOAD_SIZE_BYTES:
                buffer.close()
                shutil.rmtree(dest_dir, ignore_errors=True)
                raise HTTPException(status_code=413, detail=f"Dataset archive size exceeds {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB limit")
            buffer.write(chunk)

    # Extract if ZIP with strict path traversal / Zip Slip prevention
    if file.filename.endswith(".zip"):
        with zipfile.ZipFile(archive_path, "r") as zip_ref:
            resolved_dest = dest_dir.resolve()
            for member in zip_ref.namelist():
                member_target = (dest_dir / member).resolve()
                if not str(member_target).startswith(str(resolved_dest)):
                    archive_path.unlink(missing_ok=True)
                    shutil.rmtree(dest_dir, ignore_errors=True)
                    raise HTTPException(status_code=400, detail=f"Malicious archive member path detected (Zip Slip): {member}")
            zip_ref.extractall(dest_dir)
        archive_path.unlink(missing_ok=True)

    # Discover images and labels
    images_dir = dest_dir / "images"
    if not images_dir.exists():
        images_dir = dest_dir

    labels_dir = dest_dir / "labels"
    image_files = [f for f in images_dir.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
    
    classes = ["class_0", "class_1", "class_2", "class_3"]
    coco_json_path = None
    for cand in [dest_dir / "annotations.json", dest_dir / "instances_val.json", dest_dir / "annotations" / "instances_val.json", dest_dir / "annotations" / "annotations.json"]:
        if cand.exists():
            coco_json_path = cand
            break

    if coco_json_path:
        format = "coco"
        _, parsed_classes = parse_coco_annotations(coco_json_path)
        if parsed_classes:
            classes = parsed_classes
        annotations_path = str(coco_json_path)
    elif labels_dir.exists():
        format = "yolo"
        annotations_path = str(labels_dir)
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
    else:
        annotations_path = None

    record = DatasetRecord(
        name=dataset_name,
        task_type=task_type,
        format=format,
        filepath=str(dest_dir),
        images_dir=str(images_dir),
        annotations_path=annotations_path,
        num_samples=len(image_files),
        classes=classes,
        metadata_json={
            "num_images": len(image_files),
            "labels_found": bool(annotations_path)
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
    ann_path = Path(dataset.annotations_path) if dataset.annotations_path else None

    if not images_dir.exists():
        return {"samples": []}

    coco_map = {}
    if ann_path and ann_path.exists() and ann_path.suffix.lower() == ".json":
        coco_map, _ = parse_coco_annotations(ann_path)

    image_files = sorted([f for f in images_dir.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png")])[:6]
    samples = []

    for img_path in image_files:
        try:
            with Image.open(img_path) as im:
                w, h = im.size
        except Exception:
            w, h = 640, 640

        boxes = []
        if coco_map and (img_path.name in coco_map or img_path.stem in coco_map):
            boxes = coco_map.get(img_path.name, coco_map.get(img_path.stem, []))
        elif ann_path and ann_path.exists() and ann_path.is_dir():
            lbl_file = ann_path / f"{img_path.stem}.txt"
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
