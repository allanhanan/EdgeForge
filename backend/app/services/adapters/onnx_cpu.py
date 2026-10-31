import os
import platform
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import psutil
import onnx
import onnxruntime as ort

from backend.app.services.adapters.base import BaseRuntimeAdapter
from backend.app.services.onnx_inspector import inspect_onnx_file
from backend.app.services.optimizer import optimize_onnx_model

class ONNXRuntimeCPUAdapter(BaseRuntimeAdapter):
    """
    Production ONNX Runtime CPU execution provider adapter with SIMD/AVX vectorization.
    """

    def __init__(self):
        super().__init__("onnxruntime_cpu", "ONNX Runtime CPU")

    def probe(self) -> Dict[str, Any]:
        available = "CPUExecutionProvider" in ort.get_available_providers()
        return {
            "runtime_id": self.runtime_id,
            "name": self.name,
            "status": "AVAILABLE" if available else "UNAVAILABLE",
            "is_local": True,
            "version": ort.__version__,
            "execution_provider": "CPUExecutionProvider",
            "supported_precisions": ["fp32", "int8"],
            "supported_hardware": ["cpu-local", "raspberry-pi-5"],
            "telemetry_supported": True,
            "install_guide": "Pre-installed via onnxruntime package."
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
        opset = info.get("opset_version", 0)
        errors = []
        warnings = []
        if opset < 11:
            errors.append(f"Opset {opset} is deprecated. Re-export targeting opset 17+.")
        if precision not in ["fp32", "int8"]:
            errors.append(f"Precision '{precision}' not natively accelerated on CPU (supported: fp32, int8).")
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
        if precision.lower() == "int8":
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
            "optimization_level": "ORT_ENABLE_ALL"
        }

    def load(self, model_path: Path, **kwargs) -> ort.InferenceSession:
        sess_opts = ort.SessionOptions()
        sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_opts.intra_op_num_threads = psutil.cpu_count(logical=False) or 4
        return ort.InferenceSession(str(model_path), sess_options=sess_opts, providers=["CPUExecutionProvider"])

    def warmup(self, session: ort.InferenceSession, dummy_input: Any, iterations: int = 5):
        input_name = session.get_inputs()[0].name
        for _ in range(iterations):
            session.run(None, {input_name: dummy_input})

    def infer(self, session: ort.InferenceSession, input_data: Any) -> Any:
        input_name = session.get_inputs()[0].name
        return session.run(None, {input_name: input_data})

    def collect_telemetry(self) -> Optional[Dict[str, float]]:
        process = psutil.Process(os.getpid())
        mem_rss_mb = process.memory_info().rss / (1024 * 1024)
        return {
            "memory_rss_mb": round(mem_rss_mb, 2),
            "cpu_percent": psutil.cpu_percent(interval=None)
        }

    def cleanup(self, session: Any):
        del session

    def export_artifacts(self, model_path: Path, export_dir: Path) -> List[str]:
        return ["model.onnx", "config.json", "infer.py", "requirements.txt"]
