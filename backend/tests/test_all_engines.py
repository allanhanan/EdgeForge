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

def test_compatibility_engine():
    from backend.app.services.compatibility_service import CompatibilityEngine
    
    model_info = {
        "id": "test-model",
        "opset_version": 17,
        "operators": ["Conv", "Relu", "Add", "NonMaxSuppression"],
        "input_shapes": [{"name": "images", "shape": [1, 3, 640, 640]}]
    }
    
    # Hailo-8 requires INT8 precision and warns on NMS fallback
    hailo_device = {
        "id": "hailo-8-m2",
        "name": "Hailo-8 M.2",
        "device_type": "accelerator",
        "status": "SIMULATED",
        "is_local": False,
        "supported_precisions": ["int8"]
    }
    
    # Test incompatible precision on Hailo (FP32)
    res_fp32 = CompatibilityEngine.check_compatibility(model_info, hailo_device, precision="fp32")
    assert res_fp32["overall_status"] == "INCOMPATIBLE"
    assert res_fp32["errors_count"] >= 1
    
    # Test INT8 on Hailo with NMS warning
    res_int8 = CompatibilityEngine.check_compatibility(model_info, hailo_device, precision="int8")
    assert res_int8["overall_status"] == "CONDITIONAL"
    assert any("NonMaxSuppression" in f["message"] for f in res_int8["findings"])

def test_power_constraint_truthfulness():
    # If power is not measured, it must NOT pass a hard max_power_w constraint using TDP
    device = {"id": "cpu-local", "name": "Intel Core i7", "tdp_watts": 15.0}
    run_unmeasured = {"id": "run-unmeasured", "median_latency_ms": 10.0, "fps": 100.0, "avg_power_watts": None}
    
    constraints = ConstraintInput(max_power_w=20.0)
    score = RecommendationEngine.evaluate_candidate(run_unmeasured, device, constraints)
    
    # Must fail because measured power is unknown
    assert len(score.violations) >= 1
    assert any("Power consumption not measured" in v for v in score.violations)
    assert "Power telemetry not measured on device" in score.unknowns

def test_coco_annotations_parsing(tmp_path):
    import json
    from backend.app.services.accuracy_evaluator import parse_coco_annotations
    
    coco_data = {
        "images": [{"id": 1, "file_name": "frame_001.jpg", "width": 640, "height": 640}],
        "annotations": [{"id": 1, "image_id": 1, "category_id": 10, "bbox": [100, 100, 50, 50]}],
        "categories": [{"id": 10, "name": "drone"}]
    }
    coco_file = tmp_path / "annotations.json"
    with open(coco_file, "w") as f:
        json.dump(coco_data, f)
        
    ann_map, classes = parse_coco_annotations(coco_file)
    assert "frame_001.jpg" in ann_map
    assert classes == ["drone"]
    assert ann_map["frame_001.jpg"][0]["box"] == [100.0, 100.0, 150.0, 150.0]

def test_compatibility_edge_cases():
    from backend.app.services.compatibility_service import CompatibilityEngine
    
    # Edge Case: Model with deprecated opset 9 (< 10)
    model_low_opset = {
        "id": "model-opset-9",
        "opset_version": 9,
        "operators": ["Conv", "Relu"],
        "input_shapes": [{"name": "input", "shape": [1, 3, 224, 224]}]
    }
    cpu_device = {
        "id": "cpu-local",
        "name": "Local Host CPU",
        "device_type": "cpu",
        "status": "ONLINE",
        "is_local": True,
        "supported_precisions": ["fp32", "int8"]
    }
    res_low_opset = CompatibilityEngine.check_compatibility(model_low_opset, cpu_device, precision="fp32")
    assert res_low_opset["overall_status"] == "INCOMPATIBLE"
    opset_findings = [f for f in res_low_opset["findings"] if f["category"] == "OPSET"]
    assert len(opset_findings) == 1
    assert opset_findings[0]["severity"] == "ERROR"
    assert "deprecated and unsupported" in opset_findings[0]["message"]

    # Edge Case: Custom unsupported operators (GridSample, ROIAlign) on Hailo-8
    model_custom_ops = {
        "id": "model-custom-ops",
        "opset_version": 17,
        "operators": ["Conv", "Relu", "GridSample", "ROIAlign"],
        "input_shapes": [{"name": "input", "shape": [1, 3, 640, 640]}]
    }
    hailo_device = {
        "id": "hailo-8-m2",
        "name": "Hailo-8 M.2",
        "device_type": "accelerator",
        "status": "SIMULATED",
        "is_local": False,
        "supported_precisions": ["int8"]
    }
    res_custom = CompatibilityEngine.check_compatibility(model_custom_ops, hailo_device, precision="int8")
    assert res_custom["overall_status"] == "CONDITIONAL"
    op_warnings = [f for f in res_custom["findings"] if f["category"] == "OPERATOR" and f["severity"] == "WARNING"]
    assert len(op_warnings) >= 1
    assert any("GridSample" in f["message"] for f in op_warnings)

def test_calibration_resilience_with_corrupt_file(tmp_path):
    from backend.app.services.optimizer import DatasetCalibrationDataReader
    
    # Create a corrupted zero-byte image file
    corrupt_img = tmp_path / "corrupt_frame.jpg"
    corrupt_img.write_bytes(b"")
    
    # Initialize calibration reader
    reader = DatasetCalibrationDataReader(
        input_name="images",
        input_shape=[1, 3, 640, 640],
        dataset_path=tmp_path,
        max_samples=3
    )
    
    # Must not crash; should fall back gracefully to synthetic tensor
    sample1 = reader.get_next()
    assert sample1 is not None
    assert "images" in sample1
    assert sample1["images"].shape == (1, 3, 640, 640)
    
    sample2 = reader.get_next()
    assert sample2 is not None
    assert sample2["images"].shape == (1, 3, 640, 640)

def test_runtime_adapters_system():
    from backend.app.services.adapters.registry import AdapterRegistry
    from backend.app.services.adapters.onnx_cpu import ONNXRuntimeCPUAdapter
    from backend.app.services.adapters.hailo_adapter import HailoAdapter
    
    adapters = AdapterRegistry.list_adapters()
    assert len(adapters) >= 6
    adapter_ids = [a["runtime_id"] for a in adapters]
    assert "onnxruntime_cpu" in adapter_ids
    assert "onnxruntime_cuda" in adapter_ids
    assert "openvino" in adapter_ids
    assert "tensorrt" in adapter_ids
    assert "hailo_rt" in adapter_ids
    assert "qnn" in adapter_ids
    
    cpu_adapter = AdapterRegistry.get_adapter("onnxruntime_cpu")
    assert isinstance(cpu_adapter, ONNXRuntimeCPUAdapter)
    probe_cpu = cpu_adapter.probe()
    assert probe_cpu["status"] == "AVAILABLE"
    assert probe_cpu["is_local"] is True
    
    hailo_adapter = AdapterRegistry.get_adapter("hailo_rt")
    assert isinstance(hailo_adapter, HailoAdapter)
    probe_hailo = hailo_adapter.probe()
    assert probe_hailo["status"] == "SIMULATED"
    assert probe_hailo["is_local"] is False

def test_deployment_bundle_complete_artifacts(tmp_path):
    from backend.app.services.exporter import export_deployment_bundle
    
    device = {"id": "cpu-local", "name": "Intel Core i7", "device_type": "cpu"}
    run = {
        "runtime": "onnxruntime",
        "precision": "fp32",
        "median_latency_ms": 11.2,
        "fps": 89.3,
        "memory_rss_mb": 92.0,
        "verified": True
    }
    model = {
        "id": "test-mod-001",
        "name": "TestEdgeModel",
        "sha256": "abcdef123456",
        "filepath": str(SAMPLE_MODEL),
        "input_shapes": [],
        "output_shapes": []
    }

    bundle = export_deployment_bundle("test-bundle-complete", model, run, device)
    assert Path(bundle["zip_path"]).exists()
    assert "checksums.sha256" in bundle["files"]
    assert "classes.json" in bundle["files"]
    assert "benchmark_summary.json" in bundle["files"]
    assert "infer.py" in bundle["files"]
    assert "config.json" in bundle["files"]

