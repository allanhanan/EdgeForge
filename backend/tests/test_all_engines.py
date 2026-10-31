import pytest
import asyncio
from pathlib import Path
import numpy as np

from backend.app.services.onnx_inspector import inspect_onnx_file
from backend.app.services.hardware_detector import detect_all_hardware, detect_cpu_info
from backend.app.services.benchmark_engine import BenchmarkEngine
from backend.app.services.optimizer import optimize_onnx_model
from backend.app.services.accuracy_evaluator import box_iou, compute_ap, evaluate_detection_map
from backend.app.services.recommendation_engine import RecommendationEngine
from backend.app.schemas import ConstraintInput
from backend.app.core.config import settings
from backend.app.core.database import init_db, AsyncSessionLocal
from backend.app.services.agent_service import AgentToolRegistry
from backend.app.services.exporter import export_deployment_bundle

SAMPLE_MODEL = Path(__file__).resolve().parent.parent.parent / "sample_assets" / "models" / "edge_tiny_yolo.onnx"

def test_onnx_inspector():
    assert SAMPLE_MODEL.exists(), "Sample model must exist"
    info = inspect_onnx_file(SAMPLE_MODEL)
    assert info["is_valid"] is True
    assert len(info["sha256"]) == 64
    assert info["opset_version"] >= 15
    assert len(info["input_shapes"]) > 0
    assert "Conv" in info["operators"]
    assert info["node_count"] > 0

def test_hardware_detection():
    devices = detect_all_hardware()
    assert len(devices) >= 5
    cpu = next(d for d in devices if d["id"] == "cpu-local")
    assert cpu["status"] == "ONLINE"
    assert cpu["is_local"] is True
    assert cpu["memory_mb"] > 1000

    orin = next(d for d in devices if d["id"] == "nvidia-jetson-orin-nano")
    assert orin["status"] == "SIMULATED"
    assert orin["compute_tops"] == 40.0

def test_real_benchmark_execution():
    assert SAMPLE_MODEL.exists()
    results = BenchmarkEngine.run_benchmark(
        model_path=SAMPLE_MODEL,
        hardware_id="cpu-local",
        execution_provider="CPUExecutionProvider",
        precision="fp32",
        iterations=15,
        warmup_iterations=3
    )
    assert len(results["latency_samples_ms"]) == 15
    assert results["median_latency_ms"] > 0
    assert results["p95_latency_ms"] >= results["median_latency_ms"]
    assert results["fps"] > 0
    assert results["memory_rss_mb"] > 0
    assert "os" in results["reproducibility_metadata"]

def test_quantization_and_compression():
    out_path = settings.STORAGE_DIR / "models" / "test_int8_quant.onnx"
    res = optimize_onnx_model(SAMPLE_MODEL, out_path, "int8_dynamic")
    assert out_path.exists()
    assert res["optimized_node_count"] > 0
    assert "Dynamic INT8 quantization applied successfully." in res["diagnostics"]

def test_accuracy_mAP_evaluation():
    box1 = np.array([10, 10, 50, 50])
    box2 = np.array([10, 10, 50, 50])
    assert box_iou(box1, box2) == 1.0

    box3 = np.array([60, 60, 100, 100])
    assert box_iou(box1, box3) == 0.0

    preds = [[{"box": [10, 10, 50, 50], "score": 0.95, "class_id": 0}]]
    gts = [[{"box": [10, 10, 50, 50], "class_id": 0}]]
    map_res = evaluate_detection_map(preds, gts, num_classes=1)
    assert map_res["map50"] >= 0.98
    assert map_res["map50_95"] > 0.9

def test_recommendation_and_pareto():
    runs_with_devices = [
        (
            {"id": "run-1", "precision": "fp32", "runtime": "onnxruntime", "median_latency_ms": 25.0, "fps": 40.0, "memory_rss_mb": 120.0, "avg_power_watts": 45.0, "map50": 0.85},
            {"id": "cpu-local", "name": "Intel Core i7", "device_type": "cpu", "tdp_watts": 55.0, "cost_usd": 380.0}
        ),
        (
            {"id": "run-2", "precision": "int8", "runtime": "onnxruntime", "median_latency_ms": 8.0, "fps": 125.0, "memory_rss_mb": 65.0, "avg_power_watts": 35.0, "map50": 0.83},
            {"id": "cpu-local", "name": "Intel Core i7", "device_type": "cpu", "tdp_watts": 55.0, "cost_usd": 380.0}
        ),
        (
            {"id": "run-3", "precision": "fp32", "runtime": "onnxruntime", "median_latency_ms": 120.0, "fps": 8.0, "memory_rss_mb": 400.0, "avg_power_watts": 80.0, "map50": 0.86},
            {"id": "slow-dev", "name": "Slow CPU", "device_type": "cpu", "tdp_watts": 95.0, "cost_usd": 150.0}
        )
    ]

    constraints = ConstraintInput(max_latency_ms=30.0, min_fps=30.0)
    result = RecommendationEngine.rank_and_recommend(runs_with_devices, constraints, "Find fastest feasible")
    
    assert result["winner"] is not None
    assert result["winner"].run_id == "run-2"  # Fastest with 8.0ms latency
    assert len(result["violated_candidates"]) == 1
    assert result["violated_candidates"][0].run_id == "run-3"  # Violates 30ms limit

def test_deployment_bundling():
    device = {"id": "cpu-local", "name": "Intel Core i7", "device_type": "cpu"}
    run = {"runtime": "onnxruntime", "precision": "fp32", "median_latency_ms": 12.5, "fps": 80.0, "memory_rss_mb": 95.0}
    model = {"name": "TestEdgeModel", "sha256": "abc12345", "filepath": str(SAMPLE_MODEL), "input_shapes": [], "output_shapes": []}

    bundle = export_deployment_bundle("test-bundle-001", model, run, device)
    assert Path(bundle["zip_path"]).exists()
    assert "infer.py" in bundle["files"]
    assert "config.json" in bundle["files"]
    assert "README.md" in bundle["files"]
