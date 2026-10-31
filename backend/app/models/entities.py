import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class ModelRecord(Base):
    __tablename__ = "models"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(1024), nullable=False)
    file_size_bytes = Column(Integer, nullable=False, default=0)
    format = Column(String(50), nullable=False, default="onnx")
    sha256 = Column(String(64), nullable=False, default="")
    opset_version = Column(Integer, nullable=True)
    input_shapes = Column(JSON, nullable=True, default=list)
    output_shapes = Column(JSON, nullable=True, default=list)
    operators = Column(JSON, nullable=True, default=dict)
    node_count = Column(Integer, nullable=True, default=0)
    task_type = Column(String(50), nullable=False, default="object_detection")
    metadata_json = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    experiments = relationship("Experiment", back_populates="model", cascade="all, delete-orphan")


class DatasetRecord(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    task_type = Column(String(50), nullable=False, default="object_detection")
    format = Column(String(50), nullable=False, default="yolo")
    filepath = Column(String(1024), nullable=False)
    images_dir = Column(String(1024), nullable=False)
    annotations_path = Column(String(1024), nullable=True)
    num_samples = Column(Integer, nullable=False, default=0)
    classes = Column(JSON, nullable=True, default=list)
    metadata_json = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    experiments = relationship("Experiment", back_populates="dataset")


class HardwareDevice(Base):
    __tablename__ = "hardware_devices"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    device_type = Column(String(50), nullable=False)  # cpu, gpu, soc, npu, accelerator
    vendor = Column(String(100), nullable=False)
    architecture = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="ONLINE")  # ONLINE, OFFLINE, SIMULATED, UNSUPPORTED
    is_local = Column(Boolean, nullable=False, default=False)
    compute_tops = Column(Float, nullable=True)
    memory_mb = Column(Integer, nullable=False, default=0)
    tdp_watts = Column(Float, nullable=True)
    cost_usd = Column(Float, nullable=True)
    supported_runtimes = Column(JSON, nullable=True, default=list)
    supported_precisions = Column(JSON, nullable=True, default=list)
    telemetry_supported = Column(Boolean, nullable=False, default=False)
    details_json = Column(JSON, nullable=True, default=dict)
    detected_at = Column(DateTime, default=datetime.utcnow)

    experiments = relationship("Experiment", back_populates="hardware")


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    model_id = Column(String(36), ForeignKey("models.id"), nullable=False)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=True)
    hardware_id = Column(String(64), ForeignKey("hardware_devices.id"), nullable=False)
    runtime = Column(String(50), nullable=False, default="onnxruntime")
    execution_provider = Column(String(50), nullable=False, default="CPUExecutionProvider")
    precision = Column(String(20), nullable=False, default="fp32")
    batch_size = Column(Integer, nullable=False, default=1)
    iterations = Column(Integer, nullable=False, default=50)
    warmup_iterations = Column(Integer, nullable=False, default=10)
    status = Column(String(30), nullable=False, default="QUEUED")  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress = Column(Float, nullable=False, default=0.0)
    error_message = Column(Text, nullable=True)
    logs = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    model = relationship("ModelRecord", back_populates="experiments", lazy="selectin")
    dataset = relationship("DatasetRecord", back_populates="experiments", lazy="selectin")
    hardware = relationship("HardwareDevice", back_populates="experiments", lazy="selectin")
    run = relationship("BenchmarkRun", back_populates="experiment", uselist=False, cascade="all, delete-orphan", lazy="selectin")


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    experiment_id = Column(String(36), ForeignKey("experiments.id"), nullable=False, unique=True)
    model_id = Column(String(36), nullable=False)
    hardware_id = Column(String(64), nullable=False)
    runtime = Column(String(50), nullable=False)
    precision = Column(String(20), nullable=False)
    batch_size = Column(Integer, nullable=False)
    
    latency_samples_ms = Column(JSON, nullable=True, default=list)
    median_latency_ms = Column(Float, nullable=False)
    mean_latency_ms = Column(Float, nullable=False)
    p90_latency_ms = Column(Float, nullable=False)
    p95_latency_ms = Column(Float, nullable=False)
    p99_latency_ms = Column(Float, nullable=False)
    std_latency_ms = Column(Float, nullable=False)
    fps = Column(Float, nullable=False)
    
    memory_rss_mb = Column(Float, nullable=False, default=0.0)
    gpu_memory_used_mb = Column(Float, nullable=True)
    avg_power_watts = Column(Float, nullable=True)
    peak_power_watts = Column(Float, nullable=True)
    avg_temperature_c = Column(Float, nullable=True)
    
    map50 = Column(Float, nullable=True)
    map50_95 = Column(Float, nullable=True)
    accuracy_loss_pct = Column(Float, nullable=True)
    model_size_mb = Column(Float, nullable=False, default=0.0)
    verified = Column(Boolean, nullable=False, default=True)
    reproducibility_metadata = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    experiment = relationship("Experiment", back_populates="run")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    objective = Column(Text, nullable=False)
    constraints_json = Column(JSON, nullable=False, default=dict)
    winner_run_id = Column(String(36), nullable=True)
    winner_hardware_id = Column(String(64), nullable=True)
    pareto_candidates_json = Column(JSON, nullable=True, default=list)
    violated_candidates_json = Column(JSON, nullable=True, default=list)
    agent_justification = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, default="Deployment Investigation")
    mode = Column(String(50), nullable=False, default="OFFLINE_DETERMINISTIC")
    created_at = Column(DateTime, default=datetime.utcnow)

    traces = relationship("AgentTrace", back_populates="session", cascade="all, delete-orphan", order_by="AgentTrace.step_number")


class AgentTrace(Base):
    __tablename__ = "agent_traces"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("agent_sessions.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    role = Column(String(30), nullable=False)  # user, assistant, tool
    thought = Column(Text, nullable=True)
    tool_name = Column(String(100), nullable=True)
    tool_args_json = Column(JSON, nullable=True)
    tool_result_json = Column(JSON, nullable=True)
    content = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="SUCCESS")
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AgentSession", back_populates="traces")
