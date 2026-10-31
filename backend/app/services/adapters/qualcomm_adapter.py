from pathlib import Path
from typing import Any, Dict, List, Optional
from backend.app.services.adapters.base import BaseRuntimeAdapter
from backend.app.services.onnx_inspector import inspect_onnx_file

class QualcommAdapter(BaseRuntimeAdapter):
    """
    Clearly marked extension interface for Qualcomm Snapdragon X Elite / Hexagon NPU.
    Requires Qualcomm Neural Processing SDK (QNN / SNPE).
    """

    def __init__(self):
        super().__init__("qnn", "Qualcomm Neural Processing SDK")

    def probe(self) -> Dict[str, Any]:
        return {
            "runtime_id": self.runtime_id,
            "name": self.name,
            "status": "SIMULATED",
            "is_local": False,
            "version": "QNN SDK 2.20+",
            "execution_provider": "QNNExecutionProvider",
            "supported_precisions": ["fp16", "int8"],
            "supported_hardware": ["qualcomm-snapdragon-x-elite"],
            "telemetry_supported": False,
            "install_guide": "Download Qualcomm AI Engine Direct SDK (QNN) from Qualcomm Developer Network: https://developer.qualcomm.com/"
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
        if precision.lower() not in ["fp16", "int8"]:
            errors.append(f"Qualcomm Hexagon NPU executes FP16 or INT8 graphs. Precision '{precision}' is unsupported.")
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
            "status": "Qualcomm QNN quantizer (qnn-onnx-converter --quantization) compiles INT8 DLC/binary context."
        }

    def compile(self, model_path: Path, **kwargs) -> Dict[str, Any]:
        raise RuntimeError("Qualcomm compilation requires qnn-model-lib-generator to create serialized NPU binary context.")

    def load(self, model_path: Path, **kwargs) -> Any:
        raise RuntimeError("Cannot load QNN context: Qualcomm Hexagon NPU not present on host architecture.")

    def warmup(self, session: Any, dummy_input: Any, iterations: int = 5):
        pass

    def infer(self, session: Any, input_data: Any) -> Any:
        raise RuntimeError("Physical Qualcomm Snapdragon NPU required for hardware inference.")

    def collect_telemetry(self) -> Optional[Dict[str, float]]:
        return None

    def cleanup(self, session: Any):
        pass

    def export_artifacts(self, model_path: Path, export_dir: Path) -> List[str]:
        return ["model.serialized.bin", "model.onnx", "qnn_config.json", "infer_qnn.py"]
