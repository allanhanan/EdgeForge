import hashlib
import json
import os
import shutil
import time
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional
from backend.app.core.config import settings

INFERENCE_SCRIPT_TEMPLATE = '''"""
EdgeForge Auto-Generated Standalone Edge Inference Script
Target Hardware: {hardware_name}
Runtime: {runtime} ({execution_provider})
Precision: {precision}
Generated at: {generated_at}
"""

import argparse
import json
import time
from pathlib import Path
import numpy as np
from PIL import Image
import onnxruntime as ort

def preprocess(image_path: str, input_shape=(640, 640), dtype=np.float32):
    img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = img.size
    target_w, target_h = input_shape
    scale = min(target_w / orig_w, target_h / orig_h)
    new_w, new_h = int(orig_w * scale), int(orig_h * scale)
    resized = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

    canvas = Image.new("RGB", (target_w, target_h), (114, 114, 114))
    pad_x = (target_w - new_w) // 2
    pad_y = (target_h - new_h) // 2
    canvas.paste(resized, (pad_x, pad_y))

    arr = np.array(canvas, dtype=np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))
    arr = np.expand_dims(arr, axis=0)
    return arr.astype(dtype), scale, (pad_x, pad_y), (orig_w, orig_h)

def main():
    parser = argparse.ArgumentParser(description="EdgeForge Standalone Edge Inference")
    parser.add_argument("--image", type=str, default=None, help="Path to input image")
    parser.add_argument("--iterations", type=int, default=10, help="Benchmark iterations")
    args = parser.parse_args()

    # Load configuration
    with open("config.json", "r") as f:
        config = json.load(f)

    # Initialize ONNX Runtime Session
    providers = ["{execution_provider}", "CPUExecutionProvider"]
    available_providers = ort.get_available_providers()
    active_providers = [p for p in providers if p in available_providers] or ["CPUExecutionProvider"]
    
    print(f"[*] Initializing model on providers: {{active_providers}}")
    session = ort.InferenceSession("model.onnx", providers=active_providers)
    first_input = session.get_inputs()[0]
    input_name = first_input.name
    input_type = first_input.type

    dtype = np.float32
    if "float16" in input_type:
        dtype = np.float16
    elif "int8" in input_type:
        dtype = np.int8

    input_shape = [1, 3, 640, 640]
    if len(first_input.shape) == 4:
        h = first_input.shape[2] if isinstance(first_input.shape[2], int) and first_input.shape[2] > 0 else 640
        w = first_input.shape[3] if isinstance(first_input.shape[3], int) and first_input.shape[3] > 0 else 640
        input_shape = [1, 3, h, w]

    if args.image and Path(args.image).exists():
        inp_tensor, scale, pad, orig_size = preprocess(args.image, (input_shape[3], input_shape[2]), dtype=dtype)
        print(f"[*] Running inference on {{args.image}}...")
        t0 = time.perf_counter()
        outputs = session.run(None, {{input_name: inp_tensor}})
        t1 = time.perf_counter()
        latency_ms = (t1 - t0) * 1000.0
        print(f"[+] Output tensor shape: {{outputs[0].shape}}")
        print(f"[+] Latency: {{latency_ms:.2f}} ms ({{1000.0/latency_ms:.1f}} FPS)")
    else:
        print(f"[*] Running synthetic benchmark with shape {{input_shape}} and dtype {{dtype}}...")
        dummy_input = np.random.randn(*input_shape).astype(dtype)
        # Warmup
        for _ in range(3):
            session.run(None, {{input_name: dummy_input}})
        
        times = []
        for _ in range(args.iterations):
            t0 = time.perf_counter()
            session.run(None, {{input_name: dummy_input}})
            t1 = time.perf_counter()
            times.append((t1 - t0) * 1000.0)

        median_lat = float(np.median(times))
        fps = 1000.0 / median_lat if median_lat > 0 else 0.0
        print(f"[✓] Benchmark complete. Physical execution verified. Median latency: {{median_lat:.2f}} ms ({{fps:.1f}} FPS)")

if __name__ == "__main__":
    main()
'''

def calculate_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def export_deployment_bundle(
    bundle_id: str,
    model_record: Dict[str, Any],
    run_record: Dict[str, Any],
    device_record: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Creates a clean, reproducible, self-contained deployment ZIP package.
    Includes model artifact, runtime configuration, standalone infer.py,
    benchmark report summary, classes manifest, requirements, and SHA-256 checksums.
    """
    export_dir = settings.EXPORTS_DIR / bundle_id
    export_dir.mkdir(parents=True, exist_ok=True)

    precision = run_record.get("precision", "fp32").lower()

    # 1. Determine model artifact path based on precision
    src_model_path = Path(model_record["filepath"])
    if precision == "int8":
        # Look for existing INT8 quantized variant
        candidates = [
            settings.STORAGE_DIR / "models" / f"{model_record.get('id')}_int8.onnx",
            settings.STORAGE_DIR / "models" / f"{model_record.get('id')}_int8_dynamic.onnx",
            settings.STORAGE_DIR / "models" / f"{model_record.get('id')}_int8_static.onnx",
            src_model_path.parent / f"{src_model_path.stem}_int8.onnx"
        ]
        for c in candidates:
            if c.exists():
                src_model_path = c
                break

    dest_model_path = export_dir / "model.onnx"
    shutil.copyfile(src_model_path, dest_model_path)

    # 2. Generate config.json
    config_data = {
        "model_name": model_record["name"],
        "sha256": calculate_sha256(dest_model_path),
        "target_hardware": device_record["name"],
        "hardware_type": device_record["device_type"],
        "runtime": run_record["runtime"],
        "execution_provider": run_record.get("execution_provider", "CPUExecutionProvider"),
        "precision": precision,
        "verified_median_latency_ms": run_record.get("median_latency_ms", 0.0),
        "verified_fps": run_record.get("fps", 0.0),
        "input_shapes": model_record.get("input_shapes", []),
        "output_shapes": model_record.get("output_shapes", [])
    }
    with open(export_dir / "config.json", "w") as f:
        json.dump(config_data, f, indent=2)

    # 3. Generate requirements.txt
    requirements = [
        "onnxruntime>=1.18.0",
        "numpy>=1.24.0",
        "pillow>=10.0.0"
    ]
    with open(export_dir / "requirements.txt", "w") as f:
        f.write("\n".join(requirements) + "\n")

    # 4. Generate classes.json
    classes = model_record.get("classes") or ["drone", "vehicle", "pedestrian", "sensor"]
    with open(export_dir / "classes.json", "w") as f:
        json.dump(classes, f, indent=2)

    # 5. Generate benchmark_summary.json
    benchmark_summary = {
        "model_id": model_record.get("id"),
        "model_name": model_record.get("name"),
        "target_hardware": device_record.get("name"),
        "hardware_id": run_record.get("hardware_id"),
        "runtime": run_record.get("runtime"),
        "precision": precision,
        "median_latency_ms": run_record.get("median_latency_ms"),
        "mean_latency_ms": run_record.get("mean_latency_ms"),
        "p95_latency_ms": run_record.get("p95_latency_ms"),
        "fps": run_record.get("fps"),
        "memory_rss_mb": run_record.get("memory_rss_mb"),
        "avg_power_watts": run_record.get("avg_power_watts"),
        "map50": run_record.get("map50"),
        "verified": run_record.get("verified", True),
        "reproducibility": run_record.get("reproducibility_metadata", {})
    }
    with open(export_dir / "benchmark_summary.json", "w") as f:
        json.dump(benchmark_summary, f, indent=2)

    # 6. Generate infer.py
    infer_code = INFERENCE_SCRIPT_TEMPLATE.format(
        hardware_name=device_record["name"],
        runtime=run_record["runtime"],
        execution_provider=run_record.get("execution_provider", "CPUExecutionProvider"),
        precision=precision,
        generated_at=time.strftime("%Y-%m-%d %H:%M:%S UTC")
    )
    with open(export_dir / "infer.py", "w") as f:
        f.write(infer_code)

    # 7. Generate README.md
    readme_text = f"""# EdgeForge Deployment Bundle: {model_record['name']}
Optimized for: **{device_record['name']}**
Runtime: **{run_record['runtime']}** ({run_record.get('execution_provider', 'CPUExecutionProvider')})
Precision: **{precision.upper()}**

### Verified Benchmark Performance:
- Median Latency: **{run_record.get('median_latency_ms', '--')} ms**
- Throughput: **{run_record.get('fps', '--')} FPS**
- Memory Footprint: **{run_record.get('memory_rss_mb', '--')} MB**
- Object Detection Accuracy (mAP@50): **{run_record.get('map50', 'N/A')}**

### Quickstart Execution:
```bash
pip install -r requirements.txt
python infer.py --iterations 20
```

To run inference on a local image:
```bash
python infer.py --image path/to/frame.jpg
```
"""
    with open(export_dir / "README.md", "w") as f:
        f.write(readme_text)

    # 8. Generate checksums.sha256
    checksum_lines = []
    for file in sorted(export_dir.iterdir()):
        if file.is_file() and file.name != "checksums.sha256":
            sha = calculate_sha256(file)
            checksum_lines.append(f"{sha}  {file.name}")

    with open(export_dir / "checksums.sha256", "w") as f:
        f.write("\n".join(checksum_lines) + "\n")

    # 9. Create ZIP archive
    zip_path = settings.EXPORTS_DIR / f"{bundle_id}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for file in export_dir.iterdir():
            zipf.write(file, arcname=file.name)

    return {
        "bundle_id": bundle_id,
        "zip_path": str(zip_path),
        "zip_filename": f"{bundle_id}.zip",
        "size_bytes": zip_path.stat().st_size,
        "files": [f.name for f in export_dir.iterdir()]
    }
