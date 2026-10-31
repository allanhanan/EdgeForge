import subprocess
import sys
import tempfile
import uuid
import zipfile
from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.entities import ModelRecord, BenchmarkRun, HardwareDevice
from backend.app.services.exporter import export_deployment_bundle

router = APIRouter(prefix="/deployments", tags=["Deployments"])
packages_router = APIRouter(prefix="/packages", tags=["Packages"])

class ExportRequest(BaseModel):
    model_id: str
    run_id: str

@router.post("/export", response_model=Dict[str, Any])
@packages_router.post("/export", response_model=Dict[str, Any])
async def export_package(payload: ExportRequest, db: AsyncSession = Depends(get_db)):
    stmt_m = select(ModelRecord).where(ModelRecord.id == payload.model_id)
    res_m = await db.execute(stmt_m)
    model = res_m.scalar_one_or_none()

    stmt_r = select(BenchmarkRun).where(BenchmarkRun.id == payload.run_id)
    res_r = await db.execute(stmt_r)
    run = res_r.scalar_one_or_none()

    if not model or not run:
        raise HTTPException(status_code=404, detail="Model or Benchmark Run not found")

    stmt_d = select(HardwareDevice).where(HardwareDevice.id == run.hardware_id)
    res_d = await db.execute(stmt_d)
    device = res_d.scalar_one_or_none()
    dev_dict = device.__dict__ if device else {"name": "Generic Hardware", "device_type": "cpu"}

    bundle_id = f"edgeforge-{model.name.lower().replace(' ', '-')}-{run.precision}-{str(uuid.uuid4())[:6]}"
    bundle_info = export_deployment_bundle(
        bundle_id=bundle_id,
        model_record=model.__dict__,
        run_record=run.__dict__,
        device_record=dev_dict
    )
    return bundle_info

@router.get("/download/{bundle_id}")
@packages_router.get("/download/{bundle_id}")
async def download_bundle(bundle_id: str):
    zip_path = settings.EXPORTS_DIR / f"{bundle_id}.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Deployment bundle not found")
    return FileResponse(
        str(zip_path),
        media_type="application/zip",
        filename=f"{bundle_id}.zip"
    )

@router.post("/verify/{bundle_id}")
@packages_router.post("/verify/{bundle_id}")
async def verify_bundle_locally(bundle_id: str):
    """
    Extracts the exported bundle into a sandbox and runs 'python infer.py'
    to physically verify zero-defect deployment integrity.
    """
    zip_path = settings.EXPORTS_DIR / f"{bundle_id}.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Deployment bundle not found")

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(temp_path)

        infer_script = temp_path / "infer.py"
        if not infer_script.exists():
            raise HTTPException(status_code=500, detail="infer.py missing in bundle")

        # Execute using active venv python
        python_bin = sys.executable
        res = subprocess.run(
            [python_bin, str(infer_script), "--iterations", "5"],
            cwd=str(temp_path),
            capture_output=True,
            text=True,
            timeout=30
        )

        return {
            "bundle_id": bundle_id,
            "verification_status": "PASSED" if res.returncode == 0 else "FAILED",
            "returncode": res.returncode,
            "stdout": res.stdout,
            "stderr": res.stderr
        }
