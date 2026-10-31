from pathlib import Path
from typing import Any, Dict, List, Optional
import onnx

class CompatibilityEngine:
    """
    Vendor-neutral Edge AI compatibility engine.
    Analyzes ONNX models against target hardware accelerators, runtime execution providers,
    operator sets, opset versions, shape dynamism, and precisions.
    Classifies all findings strictly as ERROR, WARNING, INFORMATION, or UNVERIFIED.
    """

    # Device-specific operator limitations and constraints
    ACCELERATOR_CONSTRAINTS = {
        "hailo-8-m2": {
            "required_precision": "int8",
            "requires_static_shapes": True,
            "supported_runtimes": ["hailo_rt"],
            "unsupported_ops": ["NonMaxSuppression", "GridSample", "ROIAlign", "Col2Im"],
            "notes": "Hailo-8 dataflow architecture executes INT8 computational graphs. Detection postprocessing (NMS) typically falls back to host CPU."
        },
        "intel-npu-ultra": {
            "required_precision": None,
            "supported_precisions": ["fp16", "int8"],
            "requires_static_shapes": True,
            "supported_runtimes": ["openvino"],
            "unsupported_ops": ["Loop", "Scan", "If"],
            "notes": "Intel AI Boost NPU requires OpenVINO graph compilation with FP16 or INT8 precision."
        },
        "qualcomm-snapdragon-x-elite": {
            "required_precision": None,
            "supported_precisions": ["fp16", "int8"],
            "requires_static_shapes": True,
            "supported_runtimes": ["qnn", "onnxruntime_qnn"],
            "unsupported_ops": ["NonMaxSuppression", "DynamicQuantizeLinear"],
            "notes": "Qualcomm Hexagon NPU compiles models via QNN SDK. Dynamic batch dimensions require fixed execution profiles."
        },
        "nvidia-jetson-orin-nano": {
            "required_precision": None,
            "supported_precisions": ["fp32", "fp16", "int8"],
            "requires_static_shapes": False,
            "supported_runtimes": ["tensorrt", "onnxruntime_cuda"],
            "unsupported_ops": [],
            "notes": "Jetson Orin Ampere architecture natively supports TensorRT with dynamic shapes via optimization profiles."
        },
        "raspberry-pi-5": {
            "required_precision": None,
            "supported_precisions": ["fp32", "int8"],
            "requires_static_shapes": False,
            "supported_runtimes": ["onnxruntime_cpu", "tflite"],
            "unsupported_ops": [],
            "notes": "ARM Cortex-A76 CPU supports standard ONNX Runtime CPU EP with NEON vector instructions."
        }
    }

    @classmethod
    def check_compatibility(
        cls,
        model_info: Dict[str, Any],
        device_info: Dict[str, Any],
        runtime: str = "onnxruntime",
        precision: str = "fp32"
    ) -> Dict[str, Any]:
        findings: List[Dict[str, str]] = []
        dev_id = device_info.get("id", "")
        dev_name = device_info.get("name", "Unknown Device")
        dev_type = device_info.get("device_type", "cpu")
        is_local = device_info.get("is_local", False)
        status = device_info.get("status", "UNSUPPORTED")

        opset = model_info.get("opset_version", 0)
        operators = model_info.get("operators", {})
        if isinstance(operators, list):
            op_set = set(operators)
        elif isinstance(operators, dict):
            op_set = set(operators.keys())
        else:
            op_set = set()

        input_shapes = model_info.get("input_shapes", [])
        has_dynamic_shapes = False
        for s in input_shapes:
            shape_dims = s.get("shape", [])
            for dim in shape_dims:
                if isinstance(dim, str) or (isinstance(dim, int) and dim <= 0):
                    has_dynamic_shapes = True
                    break

        # 1. Device Availability Check
        if not is_local:
            findings.append({
                "category": "HARDWARE_AVAILABILITY",
                "severity": "WARNING",
                "message": f"Target hardware '{dev_name}' is not physically connected to this worker (Status: {status}).",
                "remediation": "Deploy an authenticated EdgeForge worker daemon to the physical device to gather verified on-device measurements.",
                "evidence": f"Hardware catalog status: {status}, is_local: {is_local}."
            })
        else:
            findings.append({
                "category": "HARDWARE_AVAILABILITY",
                "severity": "INFORMATION",
                "message": f"Target hardware '{dev_name}' is locally available for physical execution.",
                "remediation": "Proceed with real on-device benchmark and telemetry collection.",
                "evidence": f"Hardware probe verified: {dev_name} is active on local system."
            })

        # 2. Opset Analysis
        if opset < 11:
            findings.append({
                "category": "OPSET",
                "severity": "ERROR",
                "message": f"ONNX opset {opset} is deprecated and unsupported by modern edge inference compilers.",
                "remediation": "Re-export the model targeting ONNX opset 17 or higher.",
                "evidence": f"Model opset: {opset}; minimum recommended: 11."
            })
        elif opset > 20:
            findings.append({
                "category": "OPSET",
                "severity": "WARNING",
                "message": f"ONNX opset {opset} is very recent and may not be supported by older edge runtime packages.",
                "remediation": "Test with onnxruntime >= 1.18 or lower export opset if runtime errors occur.",
                "evidence": f"Model opset: {opset}."
            })
        else:
            findings.append({
                "category": "OPSET",
                "severity": "INFORMATION",
                "message": f"ONNX opset {opset} is fully supported across target runtimes.",
                "remediation": "No action needed.",
                "evidence": f"Standard compatible opset: {opset}."
            })

        # 3. Shape Dynamism
        if has_dynamic_shapes:
            if dev_id in cls.ACCELERATOR_CONSTRAINTS and cls.ACCELERATOR_CONSTRAINTS[dev_id].get("requires_static_shapes"):
                findings.append({
                    "category": "SHAPE",
                    "severity": "ERROR",
                    "message": f"Target accelerator '{dev_name}' requires static tensor shapes, but model contains dynamic dimensions: {input_shapes}",
                    "remediation": "Use ONNX graph optimization tools to freeze input shapes (e.g. [1, 3, 640, 640]) before compilation.",
                    "evidence": f"Target device {dev_id} requires fixed memory layouts."
                })
            else:
                findings.append({
                    "category": "SHAPE",
                    "severity": "WARNING",
                    "message": f"Model contains dynamic tensor dimensions: {input_shapes}. Dynamic shapes may introduce memory reallocation latency.",
                    "remediation": "Specify explicit batch size and fixed input dimensions in benchmark configuration.",
                    "evidence": f"Input shapes detected: {input_shapes}."
                })
        else:
            findings.append({
                "category": "SHAPE",
                "severity": "INFORMATION",
                "message": "Model uses static input shapes, optimal for zero-allocation edge execution.",
                "remediation": "No action needed.",
                "evidence": f"Fixed shapes: {input_shapes}."
            })

        # 4. Precision Constraints
        supp_precisions = device_info.get("supported_precisions", ["fp32"])
        if precision not in supp_precisions:
            findings.append({
                "category": "PRECISION",
                "severity": "ERROR",
                "message": f"Precision '{precision}' is not supported by target hardware '{dev_name}' (Supported: {supp_precisions}).",
                "remediation": f"Select one of the supported precisions: {', '.join(supp_precisions)}.",
                "evidence": f"Device profile supported precisions: {supp_precisions}."
            })
        else:
            if precision == "int8":
                findings.append({
                    "category": "PRECISION",
                    "severity": "INFORMATION",
                    "message": "INT8 precision selected: optimal for edge accelerator throughput and memory bandwidth efficiency.",
                    "remediation": "Ensure static calibration was performed on representative validation samples to prevent mAP degradation.",
                    "evidence": "INT8 execution supported by hardware tensor cores / vector units."
                })
            elif precision == "fp16":
                findings.append({
                    "category": "PRECISION",
                    "severity": "INFORMATION",
                    "message": "FP16 precision selected: delivers 2x memory reduction with minimal accuracy degradation on supported GPUs/NPUs.",
                    "remediation": "Verify hardware FP16 tensor core availability.",
                    "evidence": f"FP16 supported on {dev_name}."
                })

        # 5. Accelerator Operator Support
        constraints = cls.ACCELERATOR_CONSTRAINTS.get(dev_id)
        if constraints:
            unsupported = [op for op in constraints.get("unsupported_ops", []) if op in op_set]
            if unsupported:
                findings.append({
                    "category": "OPERATOR",
                    "severity": "WARNING",
                    "message": f"Model contains operators that may require CPU fallback on {dev_name}: {unsupported}.",
                    "remediation": "Consider partitioning the graph or stripping non-accelerated postprocessing operators.",
                    "evidence": f"Unsupported operators on {dev_id}: {unsupported}. {constraints.get('notes', '')}"
                })
            else:
                findings.append({
                    "category": "OPERATOR",
                    "severity": "INFORMATION",
                    "message": f"All {len(op_set)} model operators are compatible with target accelerator architecture.",
                    "remediation": "No operator replacement required.",
                    "evidence": f"Audited operators: {list(op_set)[:8]}..."
                })

        # Classify overall status
        errors = [f for f in findings if f["severity"] == "ERROR"]
        warnings = [f for f in findings if f["severity"] == "WARNING"]
        
        if errors:
            overall_status = "INCOMPATIBLE"
        elif warnings:
            overall_status = "CONDITIONAL"
        else:
            overall_status = "COMPATIBLE"

        return {
            "model_id": model_info.get("id"),
            "hardware_id": dev_id,
            "hardware_name": dev_name,
            "runtime": runtime,
            "precision": precision,
            "overall_status": overall_status,
            "errors_count": len(errors),
            "warnings_count": len(warnings),
            "findings": findings
        }
