import json
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.entities import ModelRecord, BenchmarkRun, HardwareDevice

router = APIRouter(prefix="/reports", tags=["Reports"])

def build_html_report(model: ModelRecord, runs: list, hw_map: dict) -> str:
    table_rows = ""
    for r in runs:
        hw_name = hw_map.get(r.hardware_id, r.hardware_id)
        pwr_str = f"{r.avg_power_watts:.1f} W" if r.avg_power_watts else "N/A"
        map_str = f"{r.map50:.3f}" if r.map50 is not None else "N/A"
        table_rows += f"""
        <tr>
            <td style="font-weight: 600;">{hw_name}</td>
            <td><code>{r.runtime}</code></td>
            <td><span class="badge badge-precision">{r.precision.upper()}</span></td>
            <td style="color: #0d9488; font-weight: 700;">{r.median_latency_ms:.2f} ms</td>
            <td>{r.p95_latency_ms:.2f} ms</td>
            <td style="color: #0284c7; font-weight: 700;">{r.fps:.1f} FPS</td>
            <td>{r.memory_rss_mb:.1f} MB</td>
            <td>{pwr_str}</td>
            <td style="color: #10b981; font-weight: 700;">{map_str}</td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EdgeForge Benchmark Report - {model.name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #09090b;
            color: #f4f4f5;
            margin: 0;
            padding: 40px 20px;
        }}
        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background-color: #18181b;
            border: 1px solid #27272a;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }}
        h1 {{
            color: #14b8a6;
            margin-top: 0;
            font-size: 24px;
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 24px 0;
            background-color: #09090b;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #27272a;
        }}
        .meta-item span {{
            display: block;
            font-size: 11px;
            color: #a1a1aa;
            text-transform: uppercase;
            font-family: monospace;
        }}
        .meta-item strong {{
            font-size: 14px;
            color: #fafafa;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
            font-size: 13px;
        }}
        th {{
            background-color: #27272a;
            color: #e4e4e7;
            text-align: left;
            padding: 12px;
            font-weight: 600;
        }}
        td {{
            padding: 12px;
            border-bottom: 1px solid #27272a;
        }}
        tr:hover {{
            background-color: #27272a33;
        }}
        .badge {{
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            font-family: monospace;
        }}
        .badge-precision {{
            background-color: #0d948822;
            color: #2dd4bf;
            border: 1px solid #0d948844;
        }}
        code {{
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background-color: #27272a;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
        }}
        .footer {{
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #27272a;
            font-size: 12px;
            color: #71717a;
            display: flex;
            justify-content: space-between;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>⚡ EdgeForge Performance &amp; Compliance Audit Report</h1>
        <p style="color: #a1a1aa; font-size: 14px;">Evaluated model deployment metrics across heterogeneous edge accelerators.</p>

        <div class="meta-grid">
            <div class="meta-item">
                <span>Model Name</span>
                <strong>{model.name}</strong>
            </div>
            <div class="meta-item">
                <span>Opset Version</span>
                <strong>{model.opset_version}</strong>
            </div>
            <div class="meta-item">
                <span>Computational Nodes</span>
                <strong>{model.node_count}</strong>
            </div>
            <div class="meta-item">
                <span>Tested Configurations</span>
                <strong>{len(runs)}</strong>
            </div>
        </div>

        <p style="font-size: 12px; color: #71717a; word-break: break-all;">
            <strong>SHA-256 Checksum:</strong> <code>{model.sha256}</code>
        </p>

        <h2>Hardware Performance Matrix</h2>
        <table>
            <thead>
                <tr>
                    <th>Hardware Target</th>
                    <th>Runtime</th>
                    <th>Precision</th>
                    <th>Median Latency</th>
                    <th>P95 Latency</th>
                    <th>Throughput</th>
                    <th>Memory</th>
                    <th>Power</th>
                    <th>mAP@50</th>
                </tr>
            </thead>
            <tbody>
                {table_rows}
            </tbody>
        </table>

        <div class="footer">
            <span>Edge AI Deployment Intelligence Engine</span>
            <span>Meta Global AI Developer Hackathon 2026</span>
        </div>
    </div>
</body>
</html>
"""

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

    html_report = build_html_report(model, runs, hw_map)

    return {
        "model_id": model.id,
        "model_name": model.name,
        "runs_count": len(runs),
        "markdown_report": markdown_report,
        "html_report": html_report,
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

@router.get("/{model_id}/download")
async def download_model_report(
    model_id: str,
    format: str = Query("html"),
    db: AsyncSession = Depends(get_db)
):
    if format not in ("html", "markdown", "json"):
        raise HTTPException(status_code=400, detail="Invalid format. Supported: html, markdown, json")

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

    slug = model.name.lower().replace(" ", "-")

    if format == "html":
        content = build_html_report(model, runs, hw_map)
        return Response(
            content=content,
            media_type="text/html",
            headers={"Content-Disposition": f'attachment; filename="edgeforge-report-{slug}.html"'}
        )
    elif format == "markdown":
        md_text = f"# EdgeForge Benchmark Report: {model.name}\n\n"
        for r in runs:
            hw_name = hw_map.get(r.hardware_id, r.hardware_id)
            md_text += f"- **{hw_name}** ({r.precision.upper()}): {r.median_latency_ms:.2f} ms ({r.fps:.1f} FPS)\n"
        return Response(
            content=md_text,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="edgeforge-report-{slug}.md"'}
        )
    else:  # json
        data = {
            "model_id": model.id,
            "model_name": model.name,
            "sha256": model.sha256,
            "opset_version": model.opset_version,
            "runs": [
                {
                    "hardware_id": r.hardware_id,
                    "hardware_name": hw_map.get(r.hardware_id, r.hardware_id),
                    "runtime": r.runtime,
                    "precision": r.precision,
                    "median_latency_ms": r.median_latency_ms,
                    "fps": r.fps,
                    "memory_rss_mb": r.memory_rss_mb,
                    "avg_power_watts": r.avg_power_watts,
                    "map50": r.map50,
                    "verified": r.verified
                }
                for r in runs
            ]
        }
        return Response(
            content=json.dumps(data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="edgeforge-report-{slug}.json"'}
        )
