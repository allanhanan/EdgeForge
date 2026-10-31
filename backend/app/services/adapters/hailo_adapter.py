from pathlib import Path
from typing import Any, Dict, List, Optional
from backend.app.services.adapters.base import BaseRuntimeAdapter
from backend.app.services.onnx_inspector import inspect_onnx_file

class HailoAdapter(BaseRuntimeAdapter):
    """
    Clearly marked extension interface for Hailo-8 / Hailo-8L M.2 AI acceleration modules.
    Requires physical Hailo PCIe hardware and HailoRT driver.
    """

    def __init__(self):
        super().__init__("hailo_rt", "HailoRT Dataflow Accelerator")

    def probe(self) -> Dict[str, Any]:
        return {
            "runtime_id": self.runtime_id,
            "name": self.name,
            "status": "SIMULATED",
            "is_local": False,
            "version": "HailoRT 4.17+",
            "execution_provider": "HailoExecutionProvider",
            "supported_precisions": ["int8"],
            "supported_hardware": ["hailo-8-m2"],
            "telemetry_supported": False,
            "install_guide": "Install Hailo PCIe kernel driver and Hailo Dataflow Compiler: https://hailo.ai/developer-zone/"
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
        if precision.lower() != "int8":
            errors.append(f"Hailo-8 dataflow core requires quantized INT8 precision. Precision '{precision}' is not executable on Hailo hardware.")
        
        ops = set((info.get("operators") or {}).keys())
        unsupported = [op for op in ["NonMaxSuppression", "GridSample", "ROIAlign"] if op in ops]
        if unsupported:
            warnings.append(f"Operators require CPU fallback on Hailo: {unsupported}")

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
            "status": "Hailo requires Hailo Dataflow Compiler (DFC) model script (HAR format) for INT8 calibration."
        }

    def compile(self, model_path: Path, **kwargs) -> Dict[str, Any]:
        raise RuntimeError("Hailo compilation requires Hailo Dataflow Compiler (DFC) to produce .hef container.")

    def load(self, model_path: Path, **kwargs) -> Any:
        raise RuntimeError("Cannot load Hailo HEF: physical Hailo-8 M.2 hardware not detected on local PCI bus.")

    def warmup(self, session: Any, dummy_input: Any, iterations: int = 5):
        pass

    def infer(self, session: Any, input_data: Any) -> Any:
        raise RuntimeError("Physical Hailo-8 accelerator required for hardware inference.")

    def collect_telemetry(self) -> Optional[Dict[str, float]]:
        return None

    def cleanup(self, session: Any):
        pass

    def export_artifacts(self, model_path: Path, export_dir: Path) -> List[str]:
        return ["model.hef", "model.onnx", "hailo_config.json", "infer_hailo.py"]
