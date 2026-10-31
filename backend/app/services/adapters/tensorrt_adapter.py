import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import onnxruntime as ort

from backend.app.services.adapters.base import BaseRuntimeAdapter
from backend.app.services.onnx_inspector import inspect_onnx_file

class TensorRTAdapter(BaseRuntimeAdapter):
    """
    NVIDIA TensorRT execution provider adapter for Jetson Orin and desktop Ada/Ampere GPUs.
    """

    def __init__(self):
        super().__init__("tensorrt", "NVIDIA TensorRT")

    def probe(self) -> Dict[str, Any]:
        available = "TensorrtExecutionProvider" in ort.get_available_providers()
        return {
            "runtime_id": self.runtime_id,
            "name": self.name,
            "status": "AVAILABLE" if available else "UNAVAILABLE",
            "is_local": available,
            "version": "8.6+ / 10.x",
            "execution_provider": "TensorrtExecutionProvider",
            "supported_precisions": ["fp32", "fp16", "int8"],
            "supported_hardware": ["nvidia-rtx4060-local", "nvidia-jetson-orin-nano", "nvidia-jetson-agx-orin"],
            "telemetry_supported": True,
            "install_guide": "Install TensorRT Python packages and CUDA 12.x libraries: pip install tensorrt-cu12"
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
            errors.append(f"Precision '{precision}' not supported by TensorRT (supported: fp32, fp16, int8).")
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
        return model_path

    def quantize(
        self,
        model_path: Path,
        output_path: Path,
        method: str = "int8_static",
        calibration_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        return {
            "runtime": self.runtime_id,
            "status": "TensorRT INT8 quantization utilizes IInt8EntropyCalibrator2 during engine build phase."
        }

    def compile(self, model_path: Path, **kwargs) -> Dict[str, Any]:
        return {
            "status": "AWAITING_ENGINE_BUILD",
            "runtime": self.runtime_id,
            "engine_cache_dir": str(model_path.parent / "trt_cache")
        }

    def load(self, model_path: Path, **kwargs) -> ort.InferenceSession:
        sess_opts = ort.SessionOptions()
        return ort.InferenceSession(str(model_path), sess_options=sess_opts, providers=["TensorrtExecutionProvider", "CUDAExecutionProvider", "CPUExecutionProvider"])

    def warmup(self, session: Any, dummy_input: Any, iterations: int = 5):
        input_name = session.get_inputs()[0].name
        for _ in range(iterations):
            session.run(None, {input_name: dummy_input})

    def infer(self, session: Any, input_data: Any) -> Any:
        input_name = session.get_inputs()[0].name
        return session.run(None, {input_name: input_data})

    def collect_telemetry(self) -> Optional[Dict[str, float]]:
        return None

    def cleanup(self, session: Any):
        del session

    def export_artifacts(self, model_path: Path, export_dir: Path) -> List[str]:
        return ["model.engine", "model.onnx", "config.json", "infer.py"]
