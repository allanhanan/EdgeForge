import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import psutil
import onnxruntime as ort

from backend.app.services.adapters.base import BaseRuntimeAdapter
from backend.app.services.onnx_inspector import inspect_onnx_file
from backend.app.services.optimizer import optimize_onnx_model

try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

try:
    import pynvml
    HAS_PYNVML = True
except ImportError:
    HAS_PYNVML = False

class ONNXRuntimeCUDAAdapter(BaseRuntimeAdapter):
    """
    Production ONNX Runtime CUDA execution provider adapter utilizing NVIDIA Tensor Cores.
    """

    def __init__(self):
        super().__init__("onnxruntime_cuda", "ONNX Runtime CUDA")

    def probe(self) -> Dict[str, Any]:
        available = "CUDAExecutionProvider" in ort.get_available_providers()
        cuda_driver = "Unknown"
        gpu_name = "NVIDIA GPU"
        if HAS_PYNVML:
            try:
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                gpu_name = pynvml.nvmlDeviceGetName(handle)
                if isinstance(gpu_name, bytes):
                    gpu_name = gpu_name.decode("utf-8")
                driver = pynvml.nvmlSystemGetDriverVersion()
                cuda_driver = driver.decode("utf-8") if isinstance(driver, bytes) else str(driver)
                pynvml.nvmlShutdown()
            except Exception:
                pass

        return {
            "runtime_id": self.runtime_id,
            "name": self.name,
            "status": "AVAILABLE" if available else "UNAVAILABLE",
            "is_local": available,
            "version": ort.__version__,
            "execution_provider": "CUDAExecutionProvider",
            "gpu_device": gpu_name,
            "driver_version": cuda_driver,
            "supported_precisions": ["fp32", "fp16", "int8"],
            "supported_hardware": ["nvidia-rtx4060-local", "nvidia-jetson-orin-nano"],
            "telemetry_supported": HAS_PYNVML,
            "install_guide": "Install onnxruntime-gpu with CUDA 12.x drivers: pip install onnxruntime-gpu"
        }

    def validate_model(self, model_path: Path) -> Dict[str, Any]:
        info = inspect_onnx_file(model_path)
        return {
            "is_valid": info.get("is_valid", False),
            "opset_version": info.get("opset_version"),
            "input_shapes": info.get("input_shapes"),
            "node_count": info.get("node_count")
        }

    def check_compatibility(self, model_path: Path, precision: str = "fp32") -> Dict[str, Any]:
        info = inspect_onnx_file(model_path)
        errors = []
        warnings = []
        if precision not in ["fp32", "fp16", "int8"]:
            errors.append(f"Precision '{precision}' not supported by CUDA execution provider.")
        return {
            "compatible": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    def prepare_model(
        self,
        model_path: Path,
        precision: str = "fp32",
        output_path: Optional[Path] = None,
        dataset_path: Optional[Path] = None
    ) -> Path:
        if precision.lower() == "fp16":
            target_out = output_path or model_path.parent / f"{model_path.stem}_fp16.onnx"
            if not target_out.exists():
                optimize_onnx_model(model_path, target_out, "fp16")
            return target_out
        elif precision.lower() == "int8":
            target_out = output_path or model_path.parent / f"{model_path.stem}_int8.onnx"
            if not target_out.exists():
                optimize_onnx_model(model_path, target_out, "int8_dynamic", dataset_path=dataset_path)
            return target_out
        return model_path

    def quantize(
        self,
        model_path: Path,
        output_path: Path,
        method: str = "int8_dynamic",
        calibration_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        return optimize_onnx_model(model_path, output_path, method, dataset_path=calibration_path)

    def compile(self, model_path: Path, **kwargs) -> Dict[str, Any]:
        return {
            "status": "COMPILED",
            "runtime": self.runtime_id,
            "model_path": str(model_path),
            "execution_provider": "CUDAExecutionProvider"
        }

    def load(self, model_path: Path, **kwargs) -> ort.InferenceSession:
        sess_opts = ort.SessionOptions()
        sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        return ort.InferenceSession(str(model_path), sess_options=sess_opts, providers=["CUDAExecutionProvider", "CPUExecutionProvider"])

    def warmup(self, session: ort.InferenceSession, dummy_input: Any, iterations: int = 5):
        input_name = session.get_inputs()[0].name
        for _ in range(iterations):
            session.run(None, {input_name: dummy_input})
            if HAS_TORCH and torch.cuda.is_available():
                torch.cuda.synchronize()

    def infer(self, session: ort.InferenceSession, input_data: Any) -> Any:
        input_name = session.get_inputs()[0].name
        if HAS_TORCH and torch.cuda.is_available():
            torch.cuda.synchronize()
        out = session.run(None, {input_name: input_data})
        if HAS_TORCH and torch.cuda.is_available():
            torch.cuda.synchronize()
        return out

    def collect_telemetry(self) -> Optional[Dict[str, float]]:
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
                "power_watts": round(power_mw / 1000.0, 1),
                "temp_c": float(temp_c),
                "gpu_mem_used_mb": round(mem_info.used / (1024 * 1024), 1)
            }
        except Exception:
            return None

    def cleanup(self, session: Any):
        del session

    def export_artifacts(self, model_path: Path, export_dir: Path) -> List[str]:
        return ["model.onnx", "config.json", "infer.py", "requirements.txt"]
