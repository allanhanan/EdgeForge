import os
import time
import platform
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple
import numpy as np
from PIL import Image
import psutil
import onnxruntime as ort

from backend.app.services.accuracy_evaluator import (
    evaluate_detection_map,
    parse_yolo_annotations,
    parse_coco_annotations,
    preprocess_image_for_yolo,
    postprocess_yolo_output
)

import warnings
try:
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=FutureWarning)
        import pynvml
    HAS_PYNVML = True
except ImportError:
    HAS_PYNVML = False

try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

class BenchmarkEngine:
    @staticmethod
    def get_providers_for_request(requested_provider: str) -> List[str]:
        available = ort.get_available_providers()
        if requested_provider in available:
            return [requested_provider]
        if requested_provider.lower() in ("cuda", "cudaexecutionprovider"):
            if "CUDAExecutionProvider" in available:
                return ["CUDAExecutionProvider", "CPUExecutionProvider"]
        return ["CPUExecutionProvider"]

    @staticmethod
    def read_gpu_telemetry() -> Optional[Dict[str, float]]:
        if not HAS_PYNVML:
            return None
        try:
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            power_mw = pynvml.nvmlDeviceGetPowerUsage(handle)
            temp_c = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            pynvml.nvmlShutdown()
            return {
                "power_watts": power_mw / 1000.0,
                "temp_c": float(temp_c),
                "gpu_mem_used_mb": float(mem_info.used / (1024 * 1024))
            }
        except Exception:
            return None

    @classmethod
    def run_benchmark(
        cls,
        model_path: Path,
        hardware_id: str,
        execution_provider: str = "CPUExecutionProvider",
        precision: str = "fp32",
        batch_size: int = 1,
        iterations: int = 50,
        warmup_iterations: int = 10,
        dataset_path: Optional[Path] = None,
        classes: Optional[List[str]] = None,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> Dict[str, Any]:
        """
        Executes real ONNX inference benchmarking with statistical timers and accuracy evaluation.
        """
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")

        providers = cls.get_providers_for_request(execution_provider)
        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        session = ort.InferenceSession(str(model_path), sess_options=session_options, providers=providers)
        active_provider = session.get_providers()[0]

        # Inspect input shapes
        inputs = session.get_inputs()
        first_input = inputs[0]
        input_name = first_input.name
        raw_shape = list(first_input.shape)
        
        # Resolve batch and dynamic dims
        concrete_shape = []
        for idx, dim in enumerate(raw_shape):
            if idx == 0:
                concrete_shape.append(batch_size)
            elif isinstance(dim, int) and dim > 0:
                concrete_shape.append(dim)
            else:
                # Default for YOLO images if dynamic
                concrete_shape.append(640 if idx in (2, 3) else (3 if idx == 1 else 1))

        dtype_np = np.float32
        if "float16" in first_input.type:
            dtype_np = np.float16
        elif "int8" in first_input.type:
            dtype_np = np.int8

        dummy_input = np.random.randn(*concrete_shape).astype(dtype_np)
        feed_dict = {input_name: dummy_input}

        # Warmup runs
        if progress_callback:
            progress_callback(5.0, f"Running {warmup_iterations} warmup iterations...")

        for _ in range(warmup_iterations):
            session.run(None, feed_dict)
            if active_provider == "CUDAExecutionProvider" and HAS_TORCH and torch.cuda.is_available():
                torch.cuda.synchronize()

        # Repeated benchmark iterations with high-resolution timer
        latency_samples_ms: List[float] = []
        e2e_samples_ms: List[float] = []
        power_readings: List[float] = []
        temp_readings: List[float] = []

        process = psutil.Process(os.getpid())
        mem_rss_start = process.memory_info().rss / (1024 * 1024)

        for i in range(iterations):
            t_e2e_0 = time.perf_counter_ns()

            if active_provider == "CUDAExecutionProvider" and HAS_TORCH and torch.cuda.is_available():
                torch.cuda.synchronize()

            t0 = time.perf_counter_ns()
            session.run(None, feed_dict)
            if active_provider == "CUDAExecutionProvider" and HAS_TORCH and torch.cuda.is_available():
                torch.cuda.synchronize()
            t1 = time.perf_counter_ns()

            t_e2e_1 = time.perf_counter_ns()

            dt_ms = (t1 - t0) / 1_000_000.0
            dt_e2e_ms = (t_e2e_1 - t_e2e_0) / 1_000_000.0
            latency_samples_ms.append(dt_ms)
            e2e_samples_ms.append(dt_e2e_ms)

            # Sample GPU telemetry outside the critical timing section
            if i % 10 == 0:
                telem = cls.read_gpu_telemetry()
                if telem:
                    power_readings.append(telem["power_watts"])
                    temp_readings.append(telem["temp_c"])

            if progress_callback and (i + 1) % max(1, iterations // 5) == 0:
                pct = 10.0 + 70.0 * ((i + 1) / iterations)
                progress_callback(pct, f"Completed iteration {i+1}/{iterations} ({dt_ms:.2f} ms)")

        mem_rss_end = process.memory_info().rss / (1024 * 1024)
        memory_rss_mb = round(mem_rss_end, 2)
        memory_rss_delta_mb = round(max(0.0, mem_rss_end - mem_rss_start), 2)

        # Compute statistics
        samples_np = np.array(latency_samples_ms)
        median_ms = float(np.median(samples_np))
        mean_ms = float(np.mean(samples_np))
        p90_ms = float(np.percentile(samples_np, 90))
        p95_ms = float(np.percentile(samples_np, 95))
        p99_ms = float(np.percentile(samples_np, 99))
        std_ms = float(np.std(samples_np))
        fps = round((1000.0 / median_ms) * batch_size, 2) if median_ms > 0 else 0.0

        e2e_np = np.array(e2e_samples_ms)
        median_e2e_ms = float(np.median(e2e_np))
        mean_e2e_ms = float(np.mean(e2e_np))

        # GPU metrics
        avg_power = round(float(np.mean(power_readings)), 1) if power_readings else None
        peak_power = round(float(np.max(power_readings)), 1) if power_readings else None
        avg_temp = round(float(np.mean(temp_readings)), 1) if temp_readings else None
        
        telem_final = cls.read_gpu_telemetry()
        gpu_mem_used_mb = telem_final["gpu_mem_used_mb"] if telem_final else None

        # Model file size
        model_size_mb = round(model_path.stat().st_size / (1024 * 1024), 2)

        # Accuracy evaluation on validation dataset if provided
        map50 = None
        map50_95 = None
        if dataset_path and dataset_path.exists():
            if progress_callback:
                progress_callback(85.0, "Evaluating model accuracy on validation dataset...")
            map_results = cls.evaluate_model_accuracy(
                session=session,
                dataset_path=dataset_path,
                num_classes=len(classes) if classes else 80
            )
            map50 = map_results.get("map50")
            map50_95 = map_results.get("map50_95")

        if progress_callback:
            progress_callback(100.0, "Benchmark finished successfully.")

        reproducibility = {
            "os": f"{platform.system()} {platform.release()}",
            "arch": platform.machine(),
            "onnxruntime_version": ort.__version__,
            "active_provider": active_provider,
            "precision": precision,
            "batch_size": batch_size,
            "iterations": iterations,
            "warmup_iterations": warmup_iterations,
            "measurement_methodology": "Monotonic high-resolution timing (time.perf_counter_ns) with stream synchronization barriers",
            "inference_latency_median_ms": round(median_ms, 3),
            "e2e_latency_median_ms": round(median_e2e_ms, 3),
            "timestamp": time.time(),
        }

        return {
            "latency_samples_ms": [round(x, 3) for x in latency_samples_ms],
            "median_latency_ms": round(median_ms, 3),
            "mean_latency_ms": round(mean_ms, 3),
            "p90_latency_ms": round(p90_ms, 3),
            "p95_latency_ms": round(p95_ms, 3),
            "p99_latency_ms": round(p99_ms, 3),
            "std_latency_ms": round(std_ms, 3),
            "e2e_latency_ms": round(median_e2e_ms, 3),
            "fps": fps,
            "memory_rss_mb": memory_rss_mb,
            "memory_rss_delta_mb": memory_rss_delta_mb,
            "gpu_memory_used_mb": gpu_mem_used_mb,
            "avg_power_watts": avg_power,
            "peak_power_watts": peak_power,
            "avg_temperature_c": avg_temp,
            "map50": map50,
            "map50_95": map50_95,
            "model_size_mb": model_size_mb,
            "active_provider": active_provider,
            "reproducibility_metadata": reproducibility
        }

    @classmethod
    def evaluate_model_accuracy(
        cls,
        session: ort.InferenceSession,
        dataset_path: Path,
        num_classes: int = 80
    ) -> Dict[str, float]:
        """
        Runs inference over real dataset images and computes true mAP against annotations.
        """
        images_dir = dataset_path / "images"
        labels_dir = dataset_path / "labels"
        if not images_dir.exists():
            images_dir = dataset_path

        valid_extensions = (".jpg", ".jpeg", ".png", ".bmp")
        image_files = [f for f in images_dir.iterdir() if f.suffix.lower() in valid_extensions]
        if not image_files:
            return {"map50": 0.0, "map50_95": 0.0}

        # Check for COCO format annotations
        coco_map = {}
        coco_candidates = [
            dataset_path / "annotations.json",
            dataset_path / "instances_val.json",
            dataset_path / "annotations" / "instances_val.json",
            dataset_path / "annotations" / "annotations.json",
            (labels_dir / "annotations.json") if labels_dir else None
        ]
        for c_file in coco_candidates:
            if c_file and c_file.exists():
                coco_map, _ = parse_coco_annotations(c_file)
                if coco_map:
                    break

        # Limit to 50 sample images for fast interactive validation
        image_files = sorted(image_files)[:50]

        predictions_all = []
        ground_truth_all = []

        input_name = session.get_inputs()[0].name
        first_input_type = session.get_inputs()[0].type

        for img_path in image_files:
            img = Image.open(img_path)
            w, h = img.size

            gt_boxes = []
            if coco_map and (img_path.name in coco_map or img_path.stem in coco_map):
                gt_boxes = coco_map.get(img_path.name, coco_map.get(img_path.stem, []))
            elif labels_dir and labels_dir.exists():
                label_file = labels_dir / f"{img_path.stem}.txt"
                if label_file.exists():
                    gt_boxes = parse_yolo_annotations(label_file, w, h)

            ground_truth_all.append(gt_boxes)

            # Preprocess
            inp_tensor, scale, pad = preprocess_image_for_yolo(img_path, (640, 640))
            if "float16" in first_input_type:
                inp_tensor = inp_tensor.astype(np.float16)

            # Run inference
            try:
                outputs = session.run(None, {input_name: inp_tensor})
                preds = postprocess_yolo_output(
                    outputs[0],
                    conf_thresh=0.25,
                    iou_thresh=0.45,
                    scale=scale,
                    pad=pad,
                    orig_shape=(w, h)
                )
                predictions_all.append(preds)
            except Exception:
                predictions_all.append([])

        return evaluate_detection_map(
            predictions_all,
            ground_truth_all,
            num_classes=num_classes
        )
