from contextlib import asynccontextmanager
from pathlib import Path
import shutil
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.database import init_db, AsyncSessionLocal
from backend.app.models.entities import HardwareDevice, ModelRecord, DatasetRecord
from backend.app.services.hardware_detector import detect_all_hardware
from backend.app.services.onnx_inspector import inspect_onnx_file

from backend.app.api.models import router as models_router
from backend.app.api.datasets import router as datasets_router
from backend.app.api.hardware import router as hardware_router
from backend.app.api.experiments import router as experiments_router
from backend.app.api.benchmarks import router as benchmarks_router
from backend.app.api.optimizations import router as optimizations_router
from backend.app.api.recommendations import router as recommendations_router
from backend.app.api.agent import router as agent_router
from backend.app.api.deployments import router as deployments_router, packages_router
from backend.app.api.reports import router as reports_router
from backend.app.api.compatibility import router as compatibility_router
from backend.app.api.runtimes import router as runtimes_router
from backend.app.api.system import router as system_router
from backend.app.api.replay import router as replay_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite tables
    await init_db()

    # 2. Detect & populate hardware registry
    async with AsyncSessionLocal() as db:
        detected = detect_all_hardware()
        for d in detected:
            stmt = select(HardwareDevice).where(HardwareDevice.id == d["id"])
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                db.add(HardwareDevice(**d))
        await db.commit()

        # 3. Seed sample model if exists
        sample_model = settings.WORKSPACE_DIR / "sample_assets" / "models" / "edge_tiny_yolo.onnx"
        if sample_model.exists():
            dest_model = settings.MODELS_DIR / "edge_tiny_yolo.onnx"
            if not dest_model.exists():
                shutil.copyfile(sample_model, dest_model)
            
            insp = inspect_onnx_file(dest_model)
            stmt = select(ModelRecord).where(ModelRecord.sha256 == insp["sha256"])
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(ModelRecord(
                    name="Edge Tiny YOLO (v8-nano style)",
                    filename="edge_tiny_yolo.onnx",
                    filepath=str(dest_model),
                    file_size_bytes=insp["file_size_bytes"],
                    format="onnx",
                    sha256=insp["sha256"],
                    opset_version=insp["opset_version"],
                    input_shapes=insp["input_shapes"],
                    output_shapes=insp["output_shapes"],
                    operators=insp["operators"],
                    node_count=insp["node_count"],
                    task_type="object_detection"
                ))
                await db.commit()

        # 4. Seed sample dataset if exists
        sample_data = settings.WORKSPACE_DIR / "sample_assets" / "datasets" / "edge_val_dataset"
        if sample_data.exists():
            dest_data = settings.DATASETS_DIR / "edge_val_dataset"
            if not dest_data.exists():
                shutil.copytree(sample_data, dest_data)
            
            stmt = select(DatasetRecord).where(DatasetRecord.name == "Edge Vision Benchmark Val (12 frames)")
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                imgs = list((dest_data / "images").glob("*.jpg"))
                db.add(DatasetRecord(
                    name="Edge Vision Benchmark Val (12 frames)",
                    task_type="object_detection",
                    format="yolo",
                    filepath=str(dest_data),
                    images_dir=str(dest_data / "images"),
                    annotations_path=str(dest_data / "labels"),
                    num_samples=len(imgs),
                    classes=["drone", "vehicle", "pedestrian", "sensor"]
                ))
                await db.commit()

    yield

app = FastAPI(
    title="EdgeForge API",
    description="Vendor-Neutral Edge AI Benchmarking, Optimization & Deployment Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under API_V1_STR
api_v1 = settings.API_V1_STR
app.include_router(models_router, prefix=api_v1)
app.include_router(datasets_router, prefix=api_v1)
app.include_router(hardware_router, prefix=api_v1)
app.include_router(experiments_router, prefix=api_v1)
app.include_router(benchmarks_router, prefix=api_v1)
app.include_router(optimizations_router, prefix=api_v1)
app.include_router(recommendations_router, prefix=api_v1)
app.include_router(agent_router, prefix=api_v1)
app.include_router(deployments_router, prefix=api_v1)
app.include_router(packages_router, prefix=api_v1)
app.include_router(reports_router, prefix=api_v1)
app.include_router(compatibility_router, prefix=api_v1)
app.include_router(runtimes_router, prefix=api_v1)
app.include_router(system_router, prefix=api_v1)
app.include_router(replay_router, prefix=api_v1)

@app.get("/health")
@app.get(f"{api_v1}/health")
async def healthcheck():
    return {
        "status": "online",
        "service": "EdgeForge Backend",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
