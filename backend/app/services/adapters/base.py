from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional

class BaseRuntimeAdapter(ABC):
    """
    Extensible vendor-neutral runtime adapter interface.
    Provides standard lifecycle hooks for model probing, compilation,
    quantization, execution, and telemetry collection across heterogeneous accelerators.
    """

    def __init__(self, runtime_id: str, name: str):
        self.runtime_id = runtime_id
        self.name = name

    @abstractmethod
    def probe(self) -> Dict[str, Any]:
        """
        Discovers runtime capabilities, driver versions, and hardware availability.
        Returns status (AVAILABLE, NOT_INSTALLED, UNSUPPORTED, SIMULATED) and install guidance.
        """
        pass

    @abstractmethod
    def validate_model(self, model_path: Path) -> Dict[str, Any]:
        """
        Validates whether the model graph can be parsed and executed by this runtime.
        """
        pass

    @abstractmethod
    def check_compatibility(self, model_path: Path, precision: str = "fp32") -> Dict[str, Any]:
        """
        Inspects model operators, opset, and precision constraints against accelerator architecture.
        """
        pass

    @abstractmethod
    def prepare_model(
        self,
        model_path: Path,
        precision: str = "fp32",
        output_path: Optional[Path] = None,
        dataset_path: Optional[Path] = None
    ) -> Path:
        """
        Prepares, optimizes, or quantizes the model for execution.
        """
        pass

    @abstractmethod
    def quantize(
        self,
        model_path: Path,
        output_path: Path,
        method: str = "int8_dynamic",
        calibration_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        Applies quantization tailored to this runtime's supported operator set.
        """
        pass

    @abstractmethod
    def compile(self, model_path: Path, **kwargs) -> Dict[str, Any]:
        """
        Compiles the model into an accelerator execution engine or plan (e.g. TensorRT engine, OpenVINO IR, QNN context).
        """
        pass

    @abstractmethod
    def load(self, model_path: Path, **kwargs) -> Any:
        """
        Loads the compiled model/session into device memory.
        """
        pass

    @abstractmethod
    def warmup(self, session: Any, dummy_input: Any, iterations: int = 5):
        """
        Executes warmup iterations to stabilize instruction caches and accelerator clocks.
        """
        pass

    @abstractmethod
    def infer(self, session: Any, input_data: Any) -> Any:
        """
        Executes a single inference pass with hardware stream synchronization.
        """
        pass

    @abstractmethod
    def collect_telemetry(self) -> Optional[Dict[str, float]]:
        """
        Samples hardware telemetry: power, temperature, VRAM utilization.
        """
        pass

    @abstractmethod
    def cleanup(self, session: Any):
        """
        Releases device contexts, GPU buffers, and session handles.
        """
        pass

    @abstractmethod
    def export_artifacts(self, model_path: Path, export_dir: Path) -> List[str]:
        """
        Exports runtime-specific deployment artifacts and configuration manifests.
        """
        pass
