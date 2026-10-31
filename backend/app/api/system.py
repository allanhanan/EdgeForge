import platform
import shutil
import psutil
from typing import Any, Dict
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.services.adapters.registry import AdapterRegistry
from backend.app.services.meta_provider import meta_provider

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/capabilities", response_model=Dict[str, Any])
async def get_system_capabilities():
    """
    Returns unified system capabilities: CPU topology and vector instruction flags,
    GPU telemetry capabilities, installed inference runtimes, storage metrics, and Meta AI provider status.
    """
    total, used, free = shutil.disk_usage(settings.STORAGE_DIR)
    mem = psutil.virtual_memory()

    return {
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "cpu_physical_cores": psutil.cpu_count(logical=False),
            "cpu_logical_cores": psutil.cpu_count(logical=True),
            "total_ram_mb": round(mem.total / (1024 * 1024), 1),
            "available_ram_mb": round(mem.available / (1024 * 1024), 1)
        },
        "storage": {
            "storage_dir": str(settings.STORAGE_DIR),
            "total_gb": round(total / (1024**3), 2),
            "used_gb": round(used / (1024**3), 2),
            "free_gb": round(free / (1024**3), 2)
        },
        "runtimes": AdapterRegistry.list_adapters(),
        "meta_ai": meta_provider.get_status()
    }
