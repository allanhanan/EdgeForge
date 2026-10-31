from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

# --- Model Schemas ---
class TensorInfo(BaseModel):
    name: str
    shape: List[Any]
    dtype: str

class ModelBase(BaseModel):
    name: str
    task_type: str = "object_detection"

class ModelCreate(ModelBase):
    pass

class ModelResponse(ModelBase):
    id: str
    filename: str
    filepath: str
    file_size_bytes: int
    format: str
    sha256: str
    opset_version: Optional[int] = None
    input_shapes: List[TensorInfo] = []
    output_shapes: List[TensorInfo] = []
    operators: Dict[str, int] = {}
    node_count: int = 0
    metadata_json: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Dataset Schemas ---
class DatasetBase(BaseModel):
    name: str
    task_type: str = "object_detection"
    format: str = "yolo"

class DatasetCreate(DatasetBase):
    pass

class DatasetResponse(DatasetBase):
    id: str
    filepath: str
    images_dir: str
    annotations_path: Optional[str] = None
    num_samples: int
    classes: List[str] = []
    metadata_json: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Hardware Schemas ---
class HardwareResponse(BaseModel):
    id: str
    name: str
    device_type: str  # cpu, gpu, soc, npu, accelerator
    vendor: str
    architecture: str
    status: str  # ONLINE, OFFLINE, SIMULATED, UNSUPPORTED
    is_local: bool
    compute_tops: Optional[float] = None
    memory_mb: int
    tdp_watts: Optional[float] = None
    cost_usd: Optional[float] = None
    supported_runtimes: List[str] = []
    supported_precisions: List[str] = []
    telemetry_supported: bool = False
    details_json: Dict[str, Any] = {}
    detected_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Experiment & Benchmark Schemas ---
class ExperimentCreate(BaseModel):
    name: Optional[str] = None
    model_id: str
    dataset_id: Optional[str] = None
    hardware_id: str
    runtime: str = "onnxruntime"
    execution_provider: str = "CPUExecutionProvider"
    precision: str = "fp32"
    batch_size: int = 1
    iterations: int = 50
    warmup_iterations: int = 10

class BenchmarkRunResponse(BaseModel):
    id: str
    experiment_id: str
    model_id: str
    hardware_id: str
    runtime: str
    precision: str
    batch_size: int
    latency_samples_ms: Optional[List[float]] = None
    median_latency_ms: float
    mean_latency_ms: float
    p90_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    std_latency_ms: float
    fps: float
    memory_rss_mb: float
    gpu_memory_used_mb: Optional[float] = None
    avg_power_watts: Optional[float] = None
    peak_power_watts: Optional[float] = None
    avg_temperature_c: Optional[float] = None
    map50: Optional[float] = None
    map50_95: Optional[float] = None
    accuracy_loss_pct: Optional[float] = None
    model_size_mb: float
    verified: bool
    reproducibility_metadata: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExperimentResponse(BaseModel):
    id: str
    name: str
    model_id: str
    dataset_id: Optional[str] = None
    hardware_id: str
    runtime: str
    execution_provider: str
    precision: str
    batch_size: int
    iterations: int
    warmup_iterations: int
    status: str
    progress: float
    error_message: Optional[str] = None
    logs: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    run: Optional[BenchmarkRunResponse] = None

    model_config = ConfigDict(from_attributes=True)

# --- Recommendation Schemas ---
class ConstraintInput(BaseModel):
    max_latency_ms: Optional[float] = None
    min_fps: Optional[float] = None
    max_memory_mb: Optional[float] = None
    max_power_w: Optional[float] = None
    max_accuracy_loss_pct: Optional[float] = None
    max_cost_usd: Optional[float] = None
    required_device_type: Optional[str] = None
    optimization_preference: str = "balanced"  # latency, accuracy, power, balanced

class RecommendationRequest(BaseModel):
    model_id: str
    objective: str
    constraints: ConstraintInput

class CandidateScore(BaseModel):
    hardware_id: str
    hardware_name: str
    run_id: str
    precision: str
    runtime: str
    latency_ms: float
    fps: float
    memory_mb: float
    power_w: Optional[float] = None
    map50: Optional[float] = None
    accuracy_loss_pct: Optional[float] = None
    cost_usd: Optional[float] = None
    score: float
    is_pareto_optimal: bool = False
    violations: List[str] = []
    unknowns: List[str] = []

class RecommendationResponse(BaseModel):
    id: str
    objective: str
    constraints: ConstraintInput
    winner: Optional[CandidateScore] = None
    pareto_candidates: List[CandidateScore] = []
    violated_candidates: List[CandidateScore] = []
    justification: str
    created_at: datetime

# --- Agent Schemas ---
class AgentMessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    model_id: Optional[str] = None
    dataset_id: Optional[str] = None
    constraints: Optional[ConstraintInput] = None

class AgentTraceItem(BaseModel):
    step_number: int
    role: str
    thought: Optional[str] = None
    tool_name: Optional[str] = None
    tool_args: Optional[Dict[str, Any]] = None
    tool_result: Optional[Any] = None
    content: Optional[str] = None
    status: str = "SUCCESS"
    created_at: datetime

class AgentSessionResponse(BaseModel):
    session_id: str
    title: str
    mode: str
    reply: str
    traces: List[AgentTraceItem] = []
    recommendation: Optional[RecommendationResponse] = None
