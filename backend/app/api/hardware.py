from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.entities import HardwareDevice
from backend.app.schemas import HardwareResponse
from backend.app.services.hardware_detector import detect_all_hardware

router = APIRouter(prefix="/hardware", tags=["Hardware"])

@router.get("", response_model=List[HardwareResponse])
async def list_hardware(db: AsyncSession = Depends(get_db)):
    stmt = select(HardwareDevice)
    res = await db.execute(stmt)
    devices = res.scalars().all()
    if not devices:
        # Auto-detect on first query
        detected = detect_all_hardware()
        for d in detected:
            dev = HardwareDevice(**d)
            db.add(dev)
        await db.commit()
        stmt = select(HardwareDevice)
        res = await db.execute(stmt)
        devices = res.scalars().all()
    return devices

@router.post("/detect", response_model=List[HardwareResponse])
async def run_detection(db: AsyncSession = Depends(get_db)):
    detected = detect_all_hardware()
    for d in detected:
        stmt = select(HardwareDevice).where(HardwareDevice.id == d["id"])
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            for k, v in d.items():
                setattr(existing, k, v)
        else:
            db.add(HardwareDevice(**d))
    await db.commit()

    stmt = select(HardwareDevice)
    res = await db.execute(stmt)
    return res.scalars().all()
