from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from backend.app.services.adapters.registry import AdapterRegistry

router = APIRouter(prefix="/runtimes", tags=["Runtimes"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_runtimes():
    """
    Lists all supported edge AI runtime adapters with availability status and driver guidance.
    """
    return AdapterRegistry.list_adapters()

@router.get("/{runtime_id}", response_model=Dict[str, Any])
async def get_runtime(runtime_id: str):
    adapter = AdapterRegistry.get_adapter(runtime_id)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Runtime adapter '{runtime_id}' not found")
    return adapter.probe()
