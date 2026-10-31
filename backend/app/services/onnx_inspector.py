import hashlib
from pathlib import Path
from typing import Any, Dict, List
import onnx

DTYPE_MAP = {
    1: "float32",
    2: "uint8",
    3: "int8",
    4: "uint16",
    5: "int16",
    6: "int32",
    7: "int64",
    8: "string",
    9: "bool",
    10: "float16",
    11: "float64",
    12: "uint32",
    13: "uint64",
    14: "complex64",
    15: "complex128",
    16: "bfloat16",
}

def compute_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def inspect_onnx_file(filepath: Path) -> Dict[str, Any]:
    if not filepath.exists():
        raise FileNotFoundError(f"Model file not found: {filepath}")

    sha256_hash = compute_sha256(filepath)
    file_size_bytes = filepath.stat().st_size

    # Load ONNX model
    model = onnx.load(str(filepath))
    
    # Check model integrity
    try:
        onnx.checker.check_model(model)
        is_valid = True
        validation_error = None
    except Exception as e:
        is_valid = False
        validation_error = str(e)

    # Opset version
    opset_version = None
    for opset in model.opset_import:
        if opset.domain == "" or opset.domain == "ai.onnx":
            opset_version = opset.version
            break

    # Extract inputs
    inputs_info: List[Dict[str, Any]] = []
    for inp in model.graph.input:
        # Ignore initializers (weights) if present in input list
        init_names = {init.name for init in model.graph.initializer}
        if inp.name in init_names:
            continue

        shape = []
        elem_type = 1
        if inp.type.HasField("tensor_type"):
            elem_type = inp.type.tensor_type.elem_type
            if inp.type.tensor_type.HasField("shape"):
                for dim in inp.type.tensor_type.shape.dim:
                    if dim.HasField("dim_value"):
                        shape.append(dim.dim_value)
                    elif dim.HasField("dim_param"):
                        shape.append(dim.dim_param)
                    else:
                        shape.append("?")
        
        dtype_str = DTYPE_MAP.get(elem_type, f"type_{elem_type}")
        inputs_info.append({
            "name": inp.name,
            "shape": shape,
            "dtype": dtype_str
        })

    # Extract outputs
    outputs_info: List[Dict[str, Any]] = []
    for out in model.graph.output:
        shape = []
        elem_type = 1
        if out.type.HasField("tensor_type"):
            elem_type = out.type.tensor_type.elem_type
            if out.type.tensor_type.HasField("shape"):
                for dim in out.type.tensor_type.shape.dim:
                    if dim.HasField("dim_value"):
                        shape.append(dim.dim_value)
                    elif dim.HasField("dim_param"):
                        shape.append(dim.dim_param)
                    else:
                        shape.append("?")
        
        dtype_str = DTYPE_MAP.get(elem_type, f"type_{elem_type}")
        outputs_info.append({
            "name": out.name,
            "shape": shape,
            "dtype": dtype_str
        })

    # Operator histogram
    operators: Dict[str, int] = {}
    for node in model.graph.node:
        op = node.op_type
        operators[op] = operators.get(op, 0) + 1

    node_count = len(model.graph.node)

    # Determine likely model family/task
    task_type = "object_detection"
    if any("yolo" in inp["name"].lower() for inp in inputs_info) or any("yolo" in out["name"].lower() for out in outputs_info):
        task_type = "object_detection"
    elif "Softmax" in operators or "ArgMax" in operators:
        if node_count < 100:
            task_type = "image_classification"

    return {
        "sha256": sha256_hash,
        "file_size_bytes": file_size_bytes,
        "opset_version": opset_version,
        "input_shapes": inputs_info,
        "output_shapes": outputs_info,
        "operators": operators,
        "node_count": node_count,
        "is_valid": is_valid,
        "validation_error": validation_error,
        "task_type": task_type,
        "ir_version": model.ir_version,
        "producer_name": model.producer_name,
        "producer_version": model.producer_version
    }
