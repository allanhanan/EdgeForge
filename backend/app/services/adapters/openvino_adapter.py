import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.app.services.adapters.base import BaseRuntimeAdapter
from backend.app.services.onnx_inspector import inspect_onnx_file

try:
    import openvino as ov
    HAS_OPENVINO = True
except ImportError:
    HAS_OPENVINO = False

class OpenVINOAdapter(BaseRuntimeAdapter):
    """
    Intel OpenVINO runtime adapter for Intel Core Ultra NPU, integrated GPUs, and Xeon CPUs.
    """

    def __init__(self):
        super().__init__("openvino", "Intel OpenVINO")

    def probe(self) -> Dict[str, Any]:
        devices = []
        ver = "Not Installed"
        if HAS_OPENVINO:
            try:
                core = ov.Core()
                devices = core.available_devices
                ver = ov.__version__
            except Exception:
                pass

        return {
            "runtime_id": self.runtime_id,
            "name": self.name,
            "status": "AVAILABLE" if HAS_OPENVINO else "NOT_INSTALLED",
            "is_local": HAS_OPENVINO,
            "version": ver,
            "execution_provider": "OpenVINOExecutionProvider",
            "available_devices": devices,
            "supported_precisions": ["fp32", "fp16", "int8"],
            "supported_hardware": ["intel-npu-ultra", "cpu-local"],
            "telemetry_supported": False,
            "install_guide": "Install Intel OpenVINO runtime via: pip install openvino>=2024.1"
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
        if not HAS_OPENVINO:
            warnings.append("OpenVINO package is not installed on this host. Install via 'pip install openvino'.")
        if precision not in ["fp32", "fp16", "int8"]:
            errors.append(f"Precision '{precision}' not supported by OpenVINO (supported: fp32, fp16, int8).")
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
            "status": "Requires NNCF (Neural Network Compression Framework) for OpenVINO native INT8 calibration."
        }

    def compile(self, model_path: Path, **kwargs) -> Dict[str, Any]:
        if not HAS_OPENVINO:
            raise RuntimeError("Cannot compile with OpenVINO: package not installed. Run 'pip install openvino'.")
        target_device = kwargs.get("device", "CPU")
        core = ov.Core()
        model = core.read_model(str(model_path))
        compiled = core.compile_model(model, target_device)
        return {
            "status": "COMPILED",
            "runtime": self.runtime_id,
            "target_device": target_device
        }

    def load(self, model_path: Path, **kwargs) -> Any:
        if not HAS_OPENVINO:
            raise RuntimeError("OpenVINO runtime not installed.")
        core = ov.Core()
        model = core.read_model(str(model_path))
        return core.compile_model(model, "CPU")

    def warmup(self, session: Any, dummy_input: Any, iterations: int = 5):
        for _ in range(iterations):
            session(dummy_input)

    def infer(self, session: Any, input_data: Any) -> Any:
        return session(input_data)

    def collect_telemetry(self) -> Optional[Dict[str, float]]:
        return None

    def cleanup(self, session: Any):
        del session

    def export_artifacts(self, model_path: Path, export_dir: Path) -> List[str]:
        return ["model.xml", "model.bin", "config.json", "infer.py"]
