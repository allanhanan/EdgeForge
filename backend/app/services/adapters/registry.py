from typing import Any, Dict, List, Optional
from backend.app.services.adapters.base import BaseRuntimeAdapter
from backend.app.services.adapters.onnx_cpu import ONNXRuntimeCPUAdapter
from backend.app.services.adapters.onnx_cuda import ONNXRuntimeCUDAAdapter
from backend.app.services.adapters.openvino_adapter import OpenVINOAdapter
from backend.app.services.adapters.tensorrt_adapter import TensorRTAdapter
from backend.app.services.adapters.hailo_adapter import HailoAdapter
from backend.app.services.adapters.qualcomm_adapter import QualcommAdapter

class AdapterRegistry:
    """
    Central discovery and management registry for heterogeneous edge runtime adapters.
    """

    _adapters: Dict[str, BaseRuntimeAdapter] = {}

    @classmethod
    def initialize(cls):
        if not cls._adapters:
            adapters = [
                ONNXRuntimeCPUAdapter(),
                ONNXRuntimeCUDAAdapter(),
                OpenVINOAdapter(),
                TensorRTAdapter(),
                HailoAdapter(),
                QualcommAdapter()
            ]
            for a in adapters:
                cls._adapters[a.runtime_id] = a

    @classmethod
    def get_adapter(cls, runtime_id: str) -> Optional[BaseRuntimeAdapter]:
        cls.initialize()
        return cls._adapters.get(runtime_id)

    @classmethod
    def list_adapters(cls) -> List[Dict[str, Any]]:
        cls.initialize()
        return [adapter.probe() for adapter in cls._adapters.values()]

    @classmethod
    def discover_available(cls) -> List[Dict[str, Any]]:
        cls.initialize()
        return [adapter.probe() for adapter in cls._adapters.values() if adapter.probe()["status"] == "AVAILABLE"]
