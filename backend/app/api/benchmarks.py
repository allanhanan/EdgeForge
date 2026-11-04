from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

import onnxruntime as ort

from backend.app.core.config import settings
from backend.app.core.database import get_db, AsyncSessionLocal
from backend.app.models.entities import Experiment, BenchmarkRun, ModelRecord, DatasetRecord, HardwareDevice
from backend.app.schemas import BenchmarkRunResponse
from backend.app.services.benchmark_engine import BenchmarkEngine
from backend.app.services.optimizer import optimize_onnx_model

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])

async def execute_benchmark_task(experiment_id: str):
    async with AsyncSessionLocal() as db:
        stmt = (
            select(Experiment)
            .options(selectinload(Experiment.model), selectinload(Experiment.dataset), selectinload(Experiment.hardware))
            .where(Experiment.id == experiment_id)
        )
        res = await db.execute(stmt)
        exp = res.scalar_one_or_none()
        if not exp:
            return

        exp.status = "RUNNING"
        exp.started_at = datetime.utcnow()
        exp.logs = f"[{datetime.utcnow().strftime('%H:%M:%S')}] Benchmark job initialized.\n"
        await db.commit()

        # Strict Hardware Provenance & Verification Guard
        if not exp.hardware or not exp.hardware.is_local:
            exp.status = "FAILED"
            dev_name = exp.hardware.name if exp.hardware else exp.hardware_id
            dev_status = exp.hardware.status if exp.hardware else "UNKNOWN"
            exp.error_message = (
                f"Cannot execute physical benchmark: Target hardware '{dev_name}' "
                f"is not locally connected (Status: {dev_status}). "
                f"Physical edge benchmarks require an authenticated on-device EdgeForge worker."
            )
            exp.logs += f"[{datetime.utcnow().strftime('%H:%M:%S')}] ERROR: {exp.error_message}\n"
            await db.commit()
            return

        available_providers = ort.get_available_providers()
        if exp.execution_provider not in available_providers:
            exp.status = "FAILED"
            exp.error_message = (
                f"Requested execution provider '{exp.execution_provider}' is not available on this host. "
                f"Available providers: {available_providers}."
            )
            exp.logs += f"[{datetime.utcnow().strftime('%H:%M:%S')}] ERROR: {exp.error_message}\n"
            await db.commit()
            return

        try:
            model = exp.model
            model_path = Path(model.filepath)

            # Check precision requirement
            if exp.precision.lower() == "int8":
                quant_path = settings.STORAGE_DIR / "models" / f"{model.id}_int8.onnx"
                if not quant_path.exists():
                    exp.logs += f"[{datetime.utcnow().strftime('%H:%M:%S')}] Applying dynamic INT8 quantization...\n"
                    await db.commit()
                    optimize_onnx_model(model_path, quant_path, "int8_dynamic")
                model_path = quant_path

            dataset_path = Path(exp.dataset.filepath) if exp.dataset else None
            classes = exp.dataset.classes if exp.dataset else None

            def progress_cb(pct: float, msg: str):
                exp.progress = round(pct, 1)
                exp.logs += f"[{datetime.utcnow().strftime('%H:%M:%S')}] {msg}\n"

            # Execute real benchmark
            metrics = BenchmarkEngine.run_benchmark(
                model_path=model_path,
                hardware_id=exp.hardware_id,
                execution_provider=exp.execution_provider,
                precision=exp.precision,
                batch_size=exp.batch_size,
                iterations=exp.iterations,
                warmup_iterations=exp.warmup_iterations,
                dataset_path=dataset_path,
                classes=classes,
                progress_callback=progress_cb
            )

            # Persist BenchmarkRun
            run = BenchmarkRun(
                experiment_id=exp.id,
                model_id=exp.model_id,
                hardware_id=exp.hardware_id,
                runtime=exp.runtime,
                precision=exp.precision,
                batch_size=exp.batch_size,
                latency_samples_ms=metrics["latency_samples_ms"],
                median_latency_ms=metrics["median_latency_ms"],
                mean_latency_ms=metrics["mean_latency_ms"],
                p90_latency_ms=metrics["p90_latency_ms"],
                p95_latency_ms=metrics["p95_latency_ms"],
                p99_latency_ms=metrics["p99_latency_ms"],
                std_latency_ms=metrics["std_latency_ms"],
                fps=metrics["fps"],
                memory_rss_mb=metrics["memory_rss_mb"],
                gpu_memory_used_mb=metrics.get("gpu_memory_used_mb"),
                avg_power_watts=metrics.get("avg_power_watts"),
                peak_power_watts=metrics.get("peak_power_watts"),
                avg_temperature_c=metrics.get("avg_temperature_c"),
                map50=metrics.get("map50"),
                map50_95=metrics.get("map50_95"),
                model_size_mb=metrics["model_size_mb"],
                verified=True,
                reproducibility_metadata=metrics["reproducibility_metadata"]
            )
            db.add(run)

            exp.status = "COMPLETED"
            exp.progress = 100.0
            exp.completed_at = datetime.utcnow()
            exp.logs += f"[{datetime.utcnow().strftime('%H:%M:%S')}] Benchmark completed successfully with median latency {run.median_latency_ms:.2f} ms ({run.fps:.1f} FPS).\n"
            await db.commit()

        except Exception as e:
            exp.status = "FAILED"
            exp.error_message = str(e)
            exp.logs += f"[{datetime.utcnow().strftime('%H:%M:%S')}] ERROR: {str(e)}\n"
            await db.commit()

@router.post("/run/{experiment_id}", response_model=Dict[str, Any])
async def trigger_benchmark(
    experiment_id: str,
    background_tasks: BackgroundTasks,
    sync: bool = False,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Experiment).where(Experiment.id == experiment_id)
    res = await db.execute(stmt)
    exp = res.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if sync:
        await execute_benchmark_task(experiment_id)
        stmt_run = select(BenchmarkRun).where(BenchmarkRun.experiment_id == experiment_id)
        res_run = await db.execute(stmt_run)
        run = res_run.scalar_one_or_none()
        return {"status": "COMPLETED", "run_id": run.id if run else None}
    else:
        background_tasks.add_task(execute_benchmark_task, experiment_id)
        return {"status": "QUEUED", "experiment_id": experiment_id}

@router.get("/runs", response_model=List[BenchmarkRunResponse])
async def list_runs(db: AsyncSession = Depends(get_db)):
    stmt = select(BenchmarkRun).order_by(BenchmarkRun.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/compare")
async def compare_runs(run_ids: List[str], db: AsyncSession = Depends(get_db)):
    stmt = select(BenchmarkRun).where(BenchmarkRun.id.in_(run_ids))
    res = await db.execute(stmt)
    runs = res.scalars().all()

    # Fetch hardware info
    hw_ids = list({r.hardware_id for r in runs})
    stmt_hw = select(HardwareDevice).where(HardwareDevice.id.in_(hw_ids))
    res_hw = await db.execute(stmt_hw)
    hw_map = {h.id: h for h in res_hw.scalars().all()}

    comparison = []
    for r in runs:
        hw = hw_map.get(r.hardware_id)
        comparison.append({
            "run_id": r.id,
            "experiment_id": r.experiment_id,
            "hardware_id": r.hardware_id,
            "hardware_name": hw.name if hw else r.hardware_id,
            "device_type": hw.device_type if hw else "unknown",
            "runtime": r.runtime,
            "precision": r.precision,
            "batch_size": r.batch_size,
            "median_latency_ms": r.median_latency_ms,
            "mean_latency_ms": r.mean_latency_ms,
            "p95_latency_ms": r.p95_latency_ms,
            "p99_latency_ms": r.p99_latency_ms,
            "fps": r.fps,
            "memory_rss_mb": r.memory_rss_mb,
            "power_watts": r.avg_power_watts or (hw.tdp_watts if hw else None),
            "temp_c": r.avg_temperature_c,
            "map50": r.map50,
            "map50_95": r.map50_95,
            "model_size_mb": r.model_size_mb,
            "cost_usd": hw.cost_usd if hw else None
        })

    return {
        "count": len(comparison),
        "runs": comparison
    }

