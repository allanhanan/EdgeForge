from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.entities import ModelRecord, BenchmarkRun, HardwareDevice

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{model_id}")
async def generate_model_report(model_id: str, db: AsyncSession = Depends(get_db)):
    stmt_m = select(ModelRecord).where(ModelRecord.id == model_id)
    res_m = await db.execute(stmt_m)
    model = res_m.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    stmt_runs = select(BenchmarkRun).where(BenchmarkRun.model_id == model_id).order_by(BenchmarkRun.median_latency_ms.asc())
    res_runs = await db.execute(stmt_runs)
    runs = res_runs.scalars().all()

    stmt_hw = select(HardwareDevice)
    res_hw = await db.execute(stmt_hw)
    hw_map = {h.id: h.name for h in res_hw.scalars().all()}

    markdown_report = f"""# EdgeForge Comprehensive Benchmark Report
**Model:** {model.name}  
**SHA-256:** `{model.sha256}`  
**Opset Version:** {model.opset_version}  
**Total Nodes:** {model.node_count}  
**Input Shapes:** {model.input_shapes}  
**Evaluated Configurations:** {len(runs)}

---

## Performance Summary Table

| Hardware | Runtime | Precision | Median Latency (ms) | P95 Latency (ms) | Throughput (FPS) | Memory (MB) | Power (W) | mAP@50 |
|---|---|---|---|---|---|---|---|---|
"""
    for r in runs:
        hw_name = hw_map.get(r.hardware_id, r.hardware_id)
        pwr_str = f"{r.avg_power_watts:.1f}W" if r.avg_power_watts else "N/A"
        map_str = f"{r.map50:.3f}" if r.map50 is not None else "N/A"
        markdown_report += f"| {hw_name} | {r.runtime} | {r.precision.upper()} | {r.median_latency_ms:.2f} | {r.p95_latency_ms:.2f} | {r.fps:.1f} | {r.memory_rss_mb:.1f} | {pwr_str} | {map_str} |\n"

    markdown_report += """
---
*Generated autonomously by EdgeForge Intelligence Engine for the Meta Global AI Developer Hackathon 2026.*
"""

    return {
        "model_id": model.id,
        "model_name": model.name,
        "runs_count": len(runs),
        "markdown_report": markdown_report,
        "runs": [
            {
                "id": r.id,
                "hardware_name": hw_map.get(r.hardware_id, r.hardware_id),
                "precision": r.precision,
                "median_latency_ms": r.median_latency_ms,
                "fps": r.fps,
                "memory_mb": r.memory_rss_mb,
                "map50": r.map50
            }
            for r in runs
        ]
    }
