import os
from pathlib import Path
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent.parent
WORKSPACE_DIR = BASE_DIR.parent
STORAGE_DIR = BASE_DIR / "storage"
MODELS_DIR = STORAGE_DIR / "models"
DATASETS_DIR = STORAGE_DIR / "datasets"
EXPORTS_DIR = STORAGE_DIR / "exports"
RUNS_DIR = STORAGE_DIR / "runs"

for d in [STORAGE_DIR, MODELS_DIR, DATASETS_DIR, EXPORTS_DIR, RUNS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "EdgeForge"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    MAX_UPLOAD_SIZE_BYTES: int = 500 * 1024 * 1024  # 500 MB upload limit
    
    # Storage paths
    BASE_DIR: Path = BASE_DIR
    WORKSPACE_DIR: Path = WORKSPACE_DIR
    STORAGE_DIR: Path = STORAGE_DIR
    MODELS_DIR: Path = MODELS_DIR
    DATASETS_DIR: Path = DATASETS_DIR
    EXPORTS_DIR: Path = EXPORTS_DIR
    RUNS_DIR: Path = RUNS_DIR
    
    # Database URL
    DATABASE_URL: str = f"sqlite+aiosqlite:///{STORAGE_DIR}/edgeforge.db"
    
    # Meta AI / LLM Configuration
    META_API_KEY: str = Field(default_factory=lambda: os.getenv("META_API_KEY", ""))
    META_API_BASE_URL: str = Field(default_factory=lambda: os.getenv("META_API_BASE_URL", "https://api.meta.ai/v1"))
    META_MODEL: str = Field(default_factory=lambda: os.getenv("META_MODEL", "muse-spark-v1"))
    AGENT_OFFLINE_MODE: bool = Field(default_factory=lambda: os.getenv("AGENT_OFFLINE_MODE", "true").lower() in ("true", "1", "yes"))

    model_config = {
        "arbitrary_types_allowed": True
    }

settings = Settings()
