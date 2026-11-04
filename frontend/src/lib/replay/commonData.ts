import {
  ModelRecord,
  HardwareDevice,
  DatasetRecord,
  BenchmarkRun,
  Experiment,
  MetaStatus,
} from "@/lib/api";
import { DeploymentPackageItem, VerificationResult } from "@/components/DeploymentsTab";
import { ReportItem } from "@/components/ReportsTab";
import { OnnxGraphNode } from "./types";

export const REPLAY_MODELS: ModelRecord[] = [
  {
    id: "model-yolov8n-fp32",
    name: "Edge Tiny YOLO (v8-nano style)",
    filename: "edge_tiny_yolo.onnx",
    filepath: "/workspace/models/edge_tiny_yolo.onnx",
    file_size_bytes: 406528, // 397 KB
    format: "onnx",
    sha256: "a93b4f62e847119c351b897931fce3e945c7bc582c418659d64bb729d5b78b10",
    opset_version: 17,
    input_shapes: [{ name: "images", shape: [1, 3, 640, 640], dtype: "float32" }],
    output_shapes: [{ name: "output0", shape: [1, 84, 8400], dtype: "float32" }],
    operators: {
      Conv: 32,
      Relu: 18,
      Add: 8,
      Mul: 6,
      Sigmoid: 4,
      Concat: 6,
      Split: 2,
      Transpose: 4,
      Reshape: 8,
    },
    node_count: 88,
    task_type: "object_detection",
    metadata_json: {
      framework: "PyTorch 2.4 -> ONNX export",
      anchors: "anchor-free decouple head",
      strides: [8, 16, 32],
      classes: 80,
    },
    created_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "model-yolov8n-int8",
    name: "Edge Tiny YOLO (INT8 Quantized)",
    filename: "edge_tiny_yolo_int8.onnx",
    filepath: "/workspace/models/edge_tiny_yolo_int8.onnx",
    file_size_bytes: 106496, // 104 KB (-73.8%)
    format: "onnx",
    sha256: "3d5f9921ec567119c351b897931fce3e945c7bc582c418659d64bb729d5b4129",
    opset_version: 17,
    input_shapes: [{ name: "images", shape: [1, 3, 640, 640], dtype: "float32" }],
    output_shapes: [{ name: "output0", shape: [1, 84, 8400], dtype: "float32" }],
    operators: {
      QLinearConv: 32,
      Relu: 18,
      Add: 8,
      Mul: 6,
      DequantizeLinear: 12,
      QuantizeLinear: 12,
      Sigmoid: 4,
      Concat: 6,
      Split: 2,
      Transpose: 4,
      Reshape: 8,
    },
    node_count: 112,
    task_type: "object_detection",
    metadata_json: {
      quantization: "INT8 Dynamic (QDQ format)",
      calibration_dataset: "edge_val_dataset (12 frames)",
      compression_ratio: "3.81x",
      accuracy_regression: "0.0%",
    },
    created_at: "2026-11-01T11:15:00Z",
  },
  {
    id: "model-resnet50-fp32",
    name: "ResNet-50 Industrial Classifier",
    filename: "resnet50_v2.onnx",
    filepath: "/workspace/models/resnet50_v2.onnx",
    file_size_bytes: 102400000, // 97.6 MB
    format: "onnx",
    sha256: "88fe91b2c45119c351b897931fce3e945c7bc582c418659d64bb729d5ba0104",
    opset_version: 15,
    input_shapes: [{ name: "input", shape: [1, 3, 224, 224], dtype: "float32" }],
    output_shapes: [{ name: "probabilities", shape: [1, 1000], dtype: "float32" }],
    operators: {
      Conv: 53,
      BatchNormalization: 53,
      Relu: 49,
      Add: 16,
      GlobalAveragePool: 1,
      Gemm: 1,
    },
    node_count: 173,
    task_type: "image_classification",
    metadata_json: {
      top1_accuracy: "76.1%",
      top5_accuracy: "92.8%",
    },
    created_at: "2026-10-28T09:00:00Z",
  },
  {
    id: "model-mobileone-s0",
    name: "MobileOne-S0 Low-Power Edge Backbone",
    filename: "mobileone_s0.onnx",
    filepath: "/workspace/models/mobileone_s0.onnx",
    file_size_bytes: 5033164, // 4.8 MB
    format: "onnx",
    sha256: "91ac4100192837119c351b897931fce3e945c7bc582c418659d64bb729d5bcc87",
    opset_version: 16,
    input_shapes: [{ name: "input", shape: [1, 3, 224, 224], dtype: "float32" }],
    output_shapes: [{ name: "features", shape: [1, 512, 7, 7], dtype: "float32" }],
    operators: { Conv: 42, Relu: 42, Add: 20 },
    node_count: 104,
    task_type: "feature_extraction",
    metadata_json: { target: "micro-edge microcontrollers / DSP" },
    created_at: "2026-10-29T14:20:00Z",
  },
];

export const REPLAY_HARDWARE: HardwareDevice[] = [
  {
    id: "cpu-local",
    name: "Intel(R) Core(TM) i7-14700HX",
    device_type: "cpu",
    vendor: "Intel",
    architecture: "x86_64 (20 Cores, 28 Threads, Raptor Lake)",
    status: "ONLINE",
    is_local: true,
    compute_tops: 1.8,
    memory_mb: 32768,
    tdp_watts: 55.0,
    cost_usd: 380.0,
    supported_runtimes: ["onnxruntime_cpu", "openvino"],
    supported_precisions: ["fp32", "int8"],
    telemetry_supported: true,
    details_json: {
      cores_physical: 20,
      cores_logical: 28,
      has_avx2: true,
      has_avx512: false,
      has_vnni: true,
      os: "Linux",
      kernel: "6.8.0-49-generic",
    },
    detected_at: "2026-11-04T08:00:00Z",
  },
  {
    id: "nvidia-rtx4060-local",
    name: "NVIDIA GeForce RTX 4060 Laptop GPU",
    device_type: "gpu",
    vendor: "NVIDIA",
    architecture: "Ada Lovelace (3072 CUDA Cores, 96 Tensor Cores, 8GB VRAM)",
    status: "ONLINE",
    is_local: true,
    compute_tops: 242.0,
    memory_mb: 8192,
    tdp_watts: 115.0,
    cost_usd: 1199.0,
    supported_runtimes: ["onnxruntime_cuda", "tensorrt"],
    supported_precisions: ["fp32", "fp16", "int8"],
    telemetry_supported: true,
    details_json: {
      driver_version: "595.91.03",
      cuda_version: "12.6",
      nvml_active: true,
      vram_type: "GDDR6",
    },
    detected_at: "2026-11-04T08:00:00Z",
  },
  {
    id: "nvidia-jetson-orin-nano",
    name: "NVIDIA Jetson Orin Nano (8GB)",
    device_type: "soc",
    vendor: "NVIDIA",
    architecture: "Ampere (1024 CUDA + 32 Tensor Cores, 6-core ARM A78AE)",
    status: "SIMULATED",
    is_local: false,
    compute_tops: 40.0,
    memory_mb: 8192,
    tdp_watts: 15.0,
    cost_usd: 499.0,
    supported_runtimes: ["tensorrt", "onnxruntime_cuda"],
    supported_precisions: ["fp32", "fp16", "int8"],
    telemetry_supported: false,
    details_json: {
      form_factor: "Embedded Module / DevKit",
      recommended_for: "Robotics, Smart Cameras, Edge Gateways",
      power_modes: ["7W", "15W"],
    },
    detected_at: "2026-11-04T08:00:00Z",
  },
  {
    id: "nvidia-jetson-agx-orin",
    name: "NVIDIA Jetson AGX Orin (64GB)",
    device_type: "soc",
    vendor: "NVIDIA",
    architecture: "Ampere (2048 CUDA + 64 Tensor Cores, 12-core ARM A78AE)",
    status: "SIMULATED",
    is_local: false,
    compute_tops: 275.0,
    memory_mb: 65536,
    tdp_watts: 60.0,
    cost_usd: 1999.0,
    supported_runtimes: ["tensorrt", "onnxruntime_cuda"],
    supported_precisions: ["fp32", "fp16", "int8"],
    telemetry_supported: false,
    details_json: {
      form_factor: "Industrial Edge AI Supercomputer",
      recommended_for: "Autonomous Vehicles, Multi-stream Video Analytics",
      power_modes: ["15W", "30W", "50W", "60W"],
    },
    detected_at: "2026-11-04T08:00:00Z",
  },
  {
    id: "hailo-8-m2",
    name: "Hailo-8 M.2 AI Acceleration Module",
    device_type: "accelerator",
    vendor: "Hailo",
    architecture: "Hailo Structure-defined Dataflow Architecture",
    status: "SIMULATED",
    is_local: false,
    compute_tops: 26.0,
    memory_mb: 2048,
    tdp_watts: 2.5,
    cost_usd: 199.0,
    supported_runtimes: ["hailo_rt"],
    supported_precisions: ["int8"],
    telemetry_supported: false,
    details_json: {
      form_factor: "M.2 Key M/B+M",
      recommended_for: "Ultra-low Power High-FPS Computer Vision",
      power_efficiency: "Up to 3 TOPS/W",
    },
    detected_at: "2026-11-04T08:00:00Z",
  },
  {
    id: "raspberry-pi-5",
    name: "Raspberry Pi 5 (8GB)",
    device_type: "soc",
    vendor: "Raspberry Pi Foundation",
    architecture: "ARM Cortex-A76 (Quad-core @ 2.4GHz)",
    status: "SIMULATED",
    is_local: false,
    compute_tops: 0.8,
    memory_mb: 8192,
    tdp_watts: 12.0,
    cost_usd: 80.0,
    supported_runtimes: ["onnxruntime_cpu", "tflite"],
    supported_precisions: ["fp32", "int8"],
    telemetry_supported: false,
    details_json: {
      form_factor: "Single Board Computer",
      recommended_for: "Low-cost Edge Sensing, Education, IoT Gateways",
      power_modes: ["5W idle", "12W load"],
    },
    detected_at: "2026-11-04T08:00:00Z",
  },
  {
    id: "intel-npu-ultra",
    name: "Intel Core Ultra NPU (Meteor Lake)",
    device_type: "npu",
    vendor: "Intel",
    architecture: "Intel AI Boost NPU",
    status: "SIMULATED",
    is_local: false,
    compute_tops: 11.5,
    memory_mb: 4096,
    tdp_watts: 5.0,
    cost_usd: 350.0,
    supported_runtimes: ["openvino"],
    supported_precisions: ["fp16", "int8"],
    telemetry_supported: false,
    details_json: {
      form_factor: "Integrated SoC NPU",
      recommended_for: "Client AI, Low Power Always-on CV",
    },
    detected_at: "2026-11-04T08:00:00Z",
  },
];

export const REPLAY_DATASETS: DatasetRecord[] = [
  {
    id: "dataset-edge-val-12",
    name: "Edge Vision Benchmark Val (12 frames)",
    task_type: "object_detection",
    format: "yolo",
    filepath: "/workspace/datasets/edge_val_dataset",
    images_dir: "/workspace/datasets/edge_val_dataset/images",
    annotations_path: "/workspace/datasets/edge_val_dataset/labels",
    num_samples: 12,
    classes: ["drone", "vehicle", "pedestrian", "sensor"],
    metadata_json: {
      resolution: "640x640",
      color_space: "RGB",
      bounding_boxes_count: 48,
    },
    created_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "dataset-coco-minival",
    name: "COCO 2017 Edge Subset (100 frames)",
    task_type: "object_detection",
    format: "yolo",
    filepath: "/workspace/datasets/coco_minival",
    images_dir: "/workspace/datasets/coco_minival/images",
    annotations_path: "/workspace/datasets/coco_minival/labels",
    num_samples: 100,
    classes: ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck"],
    metadata_json: {
      resolution: "640x640",
      license: "CC-BY 4.0",
    },
    created_at: "2026-10-25T12:00:00Z",
  },
];

export const REPLAY_RUNS: BenchmarkRun[] = [
  {
    id: "run-yolo-i7-fp32",
    experiment_id: "exp-yolo-i7-fp32",
    model_id: "model-yolov8n-fp32",
    hardware_id: "cpu-local",
    runtime: "onnxruntime_cpu",
    precision: "fp32",
    batch_size: 1,
    latency_samples_ms: [0.82, 0.84, 0.83, 0.85, 0.84, 0.86, 0.84, 0.83, 0.84, 0.85],
    median_latency_ms: 0.84,
    mean_latency_ms: 0.841,
    p90_latency_ms: 0.852,
    p95_latency_ms: 0.858,
    p99_latency_ms: 0.865,
    std_latency_ms: 0.012,
    fps: 1189.5,
    memory_rss_mb: 65.2,
    avg_power_watts: 42.0,
    peak_power_watts: 48.5,
    avg_temperature_c: 54.0,
    map50: 0.854,
    map50_95: 0.612,
    accuracy_loss_pct: 0.0,
    model_size_mb: 0.39,
    verified: true,
    reproducibility_metadata: {
      iterations: 100,
      warmup: 10,
      synchronous: true,
      thread_affinity: "P-cores",
    },
    created_at: "2026-11-04T08:15:00Z",
  },
  {
    id: "run-yolo-i7-int8",
    experiment_id: "exp-yolo-i7-int8",
    model_id: "model-yolov8n-int8",
    hardware_id: "cpu-local",
    runtime: "onnxruntime_cpu",
    precision: "int8",
    batch_size: 1,
    latency_samples_ms: [0.41, 0.42, 0.42, 0.43, 0.42, 0.44, 0.42, 0.41, 0.42, 0.43],
    median_latency_ms: 0.42,
    mean_latency_ms: 0.422,
    p90_latency_ms: 0.431,
    p95_latency_ms: 0.438,
    p99_latency_ms: 0.442,
    std_latency_ms: 0.009,
    fps: 2380.0,
    memory_rss_mb: 48.5,
    avg_power_watts: 38.0,
    peak_power_watts: 42.0,
    avg_temperature_c: 51.5,
    map50: 0.854,
    map50_95: 0.612,
    accuracy_loss_pct: 0.0,
    model_size_mb: 0.10,
    verified: true,
    reproducibility_metadata: {
      acceleration: "AVX2-VNNI INT8 gemm kernels",
      iterations: 100,
    },
    created_at: "2026-11-04T08:30:00Z",
  },
  {
    id: "run-yolo-rtx4060-fp32",
    experiment_id: "exp-yolo-rtx4060-fp32",
    model_id: "model-yolov8n-fp32",
    hardware_id: "nvidia-rtx4060-local",
    runtime: "onnxruntime_cuda",
    precision: "fp32",
    batch_size: 1,
    latency_samples_ms: [0.89, 0.90, 0.90, 0.91, 0.90, 0.92, 0.90, 0.89, 0.90, 0.91],
    median_latency_ms: 0.90,
    mean_latency_ms: 0.902,
    p90_latency_ms: 0.912,
    p95_latency_ms: 0.918,
    p99_latency_ms: 0.925,
    std_latency_ms: 0.010,
    fps: 1111.9,
    memory_rss_mb: 561.0,
    gpu_memory_used_mb: 512.0,
    avg_power_watts: 68.0,
    peak_power_watts: 82.0,
    avg_temperature_c: 62.0,
    map50: 0.854,
    map50_95: 0.612,
    accuracy_loss_pct: 0.0,
    model_size_mb: 0.39,
    verified: true,
    reproducibility_metadata: {
      provider: "CUDAExecutionProvider",
      cuda_version: "12.6",
    },
    created_at: "2026-11-04T08:45:00Z",
  },
  {
    id: "run-yolo-rtx4060-fp16",
    experiment_id: "exp-yolo-rtx4060-fp16",
    model_id: "model-yolov8n-fp32",
    hardware_id: "nvidia-rtx4060-local",
    runtime: "tensorrt",
    precision: "fp16",
    batch_size: 1,
    latency_samples_ms: [0.37, 0.38, 0.38, 0.39, 0.38, 0.38, 0.37, 0.38, 0.39, 0.38],
    median_latency_ms: 0.38,
    mean_latency_ms: 0.381,
    p90_latency_ms: 0.388,
    p95_latency_ms: 0.392,
    p99_latency_ms: 0.396,
    std_latency_ms: 0.007,
    fps: 2631.5,
    memory_rss_mb: 410.0,
    gpu_memory_used_mb: 380.0,
    avg_power_watts: 52.0,
    peak_power_watts: 64.0,
    avg_temperature_c: 58.0,
    map50: 0.853,
    map50_95: 0.611,
    accuracy_loss_pct: 0.12,
    model_size_mb: 0.20,
    verified: true,
    reproducibility_metadata: {
      engine: "TensorRT 10.2 FP16 builder",
      layer_fusion: true,
    },
    created_at: "2026-11-04T09:00:00Z",
  },
  {
    id: "run-yolo-rtx4060-int8",
    experiment_id: "exp-yolo-rtx4060-int8",
    model_id: "model-yolov8n-int8",
    hardware_id: "nvidia-rtx4060-local",
    runtime: "tensorrt",
    precision: "int8",
    batch_size: 1,
    latency_samples_ms: [0.21, 0.22, 0.22, 0.23, 0.22, 0.22, 0.21, 0.22, 0.23, 0.22],
    median_latency_ms: 0.22,
    mean_latency_ms: 0.221,
    p90_latency_ms: 0.228,
    p95_latency_ms: 0.232,
    p99_latency_ms: 0.236,
    std_latency_ms: 0.005,
    fps: 4545.4,
    memory_rss_mb: 380.0,
    gpu_memory_used_mb: 320.0,
    avg_power_watts: 46.0,
    peak_power_watts: 56.0,
    avg_temperature_c: 55.0,
    map50: 0.852,
    map50_95: 0.610,
    accuracy_loss_pct: 0.23,
    model_size_mb: 0.10,
    verified: true,
    reproducibility_metadata: {
      engine: "TensorRT 10.2 INT8 Tensor Core engine",
      calibration: "EntropyCalibrator2",
    },
    created_at: "2026-11-04T09:15:00Z",
  },
  {
    id: "run-yolo-jetson-nano-int8",
    experiment_id: "exp-yolo-jetson-int8",
    model_id: "model-yolov8n-int8",
    hardware_id: "nvidia-jetson-orin-nano",
    runtime: "tensorrt",
    precision: "int8",
    batch_size: 1,
    latency_samples_ms: [4.08, 4.12, 4.11, 4.15, 4.12, 4.16, 4.10, 4.12, 4.14, 4.13],
    median_latency_ms: 4.12,
    mean_latency_ms: 4.123,
    p90_latency_ms: 4.148,
    p95_latency_ms: 4.158,
    p99_latency_ms: 4.166,
    std_latency_ms: 0.024,
    fps: 242.7,
    memory_rss_mb: 128.0,
    avg_power_watts: 11.8,
    peak_power_watts: 14.5,
    avg_temperature_c: 48.0,
    map50: 0.852,
    map50_95: 0.610,
    accuracy_loss_pct: 0.23,
    model_size_mb: 0.10,
    verified: true,
    reproducibility_metadata: {
      power_profile: "15W 6-core",
      orin_dla: "Disabled (GPU Tensor Cores active)",
    },
    created_at: "2026-11-04T09:30:00Z",
  },
  {
    id: "run-yolo-rpi5-fp32",
    experiment_id: "exp-yolo-rpi5-fp32",
    model_id: "model-yolov8n-fp32",
    hardware_id: "raspberry-pi-5",
    runtime: "onnxruntime_cpu",
    precision: "fp32",
    batch_size: 1,
    latency_samples_ms: [38.1, 38.4, 38.5, 38.3, 38.4, 38.9, 38.4, 38.2, 38.6, 38.4],
    median_latency_ms: 38.4,
    mean_latency_ms: 38.42,
    p90_latency_ms: 38.65,
    p95_latency_ms: 38.82,
    p99_latency_ms: 38.96,
    std_latency_ms: 0.24,
    fps: 26.0,
    memory_rss_mb: 82.0,
    avg_power_watts: 9.2,
    peak_power_watts: 11.5,
    avg_temperature_c: 61.0,
    map50: 0.854,
    map50_95: 0.612,
    accuracy_loss_pct: 0.0,
    model_size_mb: 0.39,
    verified: true,
    reproducibility_metadata: {
      cpu_governor: "performance",
      threads: 4,
    },
    created_at: "2026-11-04T09:45:00Z",
  },
  {
    id: "run-yolo-rpi5-int8",
    experiment_id: "exp-yolo-rpi5-int8",
    model_id: "model-yolov8n-int8",
    hardware_id: "raspberry-pi-5",
    runtime: "onnxruntime_cpu",
    precision: "int8",
    batch_size: 1,
    latency_samples_ms: [19.6, 19.8, 19.8, 20.1, 19.7, 19.9, 19.8, 19.7, 20.0, 19.8],
    median_latency_ms: 19.8,
    mean_latency_ms: 19.82,
    p90_latency_ms: 20.01,
    p95_latency_ms: 20.12,
    p99_latency_ms: 20.25,
    std_latency_ms: 0.16,
    fps: 50.5,
    memory_rss_mb: 64.0,
    avg_power_watts: 8.4,
    peak_power_watts: 10.2,
    avg_temperature_c: 57.0,
    map50: 0.852,
    map50_95: 0.610,
    accuracy_loss_pct: 0.23,
    model_size_mb: 0.10,
    verified: true,
    reproducibility_metadata: {
      acceleration: "ARM Neon DotProd (SDOT)",
      threads: 4,
    },
    created_at: "2026-11-04T10:00:00Z",
  },
  {
    id: "run-yolo-hailo8-int8",
    experiment_id: "exp-yolo-hailo8-int8",
    model_id: "model-yolov8n-int8",
    hardware_id: "hailo-8-m2",
    runtime: "hailo_rt",
    precision: "int8",
    batch_size: 1,
    latency_samples_ms: [1.44, 1.45, 1.45, 1.46, 1.45, 1.47, 1.45, 1.44, 1.46, 1.45],
    median_latency_ms: 1.45,
    mean_latency_ms: 1.452,
    p90_latency_ms: 1.462,
    p95_latency_ms: 1.468,
    p99_latency_ms: 1.474,
    std_latency_ms: 0.009,
    fps: 689.6,
    memory_rss_mb: 92.0,
    avg_power_watts: 2.4,
    peak_power_watts: 2.8,
    avg_temperature_c: 44.0,
    map50: 0.851,
    map50_95: 0.609,
    accuracy_loss_pct: 0.35,
    model_size_mb: 0.10,
    verified: true,
    reproducibility_metadata: {
      dataflow_compiler: "Hailo Dataflow Compiler v3.28",
      efficiency: "287.3 FPS/Watt",
    },
    created_at: "2026-11-04T10:15:00Z",
  },
];

export const REPLAY_EXPERIMENTS: Experiment[] = [
  {
    id: "exp-yolo-i7-fp32",
    name: "YOLOv8n-FP32 on Intel i7-14700HX (AVX2)",
    model_id: "model-yolov8n-fp32",
    dataset_id: "dataset-edge-val-12",
    hardware_id: "cpu-local",
    runtime: "onnxruntime_cpu",
    execution_provider: "CPUExecutionProvider",
    precision: "fp32",
    batch_size: 1,
    iterations: 100,
    warmup_iterations: 10,
    status: "COMPLETED",
    progress: 100,
    logs: "[INFO] Initializing ONNXRuntime CPUExecutionProvider\n[INFO] Warmup 10 iterations completed\n[INFO] Benchmarking 100 iterations on P-cores\n[SUCCESS] Median latency: 0.84 ms, FPS: 1189.5",
    created_at: "2026-11-04T08:14:00Z",
    started_at: "2026-11-04T08:14:05Z",
    completed_at: "2026-11-04T08:15:00Z",
    run: REPLAY_RUNS[0],
  },
  {
    id: "exp-yolo-rtx4060-fp16",
    name: "YOLOv8n-FP16 on NVIDIA RTX 4060 (TensorRT)",
    model_id: "model-yolov8n-fp32",
    dataset_id: "dataset-edge-val-12",
    hardware_id: "nvidia-rtx4060-local",
    runtime: "tensorrt",
    execution_provider: "TensorrtExecutionProvider",
    precision: "fp16",
    batch_size: 1,
    iterations: 100,
    warmup_iterations: 10,
    status: "COMPLETED",
    progress: 100,
    logs: "[INFO] Building TensorRT 10.2 FP16 serialized plan file\n[INFO] CUDA stream synchronization initialized\n[INFO] 100 iterations executed\n[SUCCESS] Median latency: 0.38 ms, FPS: 2631.5",
    created_at: "2026-11-04T08:59:00Z",
    started_at: "2026-11-04T08:59:03Z",
    completed_at: "2026-11-04T09:00:00Z",
    run: REPLAY_RUNS[3],
  },
  {
    id: "exp-yolo-jetson-int8",
    name: "YOLOv8n-INT8 on Jetson Orin Nano (TensorRT 15W)",
    model_id: "model-yolov8n-int8",
    dataset_id: "dataset-edge-val-12",
    hardware_id: "nvidia-jetson-orin-nano",
    runtime: "tensorrt",
    execution_provider: "TensorrtExecutionProvider",
    precision: "int8",
    batch_size: 1,
    iterations: 100,
    warmup_iterations: 10,
    status: "COMPLETED",
    progress: 100,
    logs: "[INFO] Connecting simulated Jetson Orin Nano target socket\n[INFO] Applying 15W power profile mode\n[INFO] Loading INT8 QDQ TensorRT engine\n[SUCCESS] Median latency: 4.12 ms, FPS: 242.7, Power: 11.8W",
    created_at: "2026-11-04T09:29:00Z",
    started_at: "2026-11-04T09:29:02Z",
    completed_at: "2026-11-04T09:30:00Z",
    run: REPLAY_RUNS[5],
  },
];

export const REPLAY_META_STATUS: MetaStatus = {
  provider: "Meta Model API",
  model: "Meta Muse Spark / LLaMA 3.3 70B",
  base_url: "https://api.meta.internal/v1",
  configured: true,
  mode: "REPLAY_SIMULATED_REASONING",
  message: "Deterministic Replay Provider (Zero API credits consumed)",
};

export const REPLAY_PACKAGES: DeploymentPackageItem[] = [
  {
    id: "pkg-jetson-orin-yolo-int8",
    version: "1.0.0",
    bundle_id: "bundle_18e93d8f_jetson_int8",
    model_id: "model-yolov8n-int8",
    model_name: "Edge Tiny YOLO (INT8 Quantized)",
    hardware_id: "nvidia-jetson-orin-nano",
    hardware_name: "NVIDIA Jetson Orin Nano (8GB)",
    runtime: "tensorrt",
    precision: "int8",
    build_timestamp: "2026-11-04T10:30:00Z",
    size_bytes: 145280,
    verification_status: "Verified",
    zero_copy_verified: true,
    zero_copy_mode: "PinnedHostMemory_DMA",
    zip_path: "/workspace/bundles/edgeforge_bundle_18e93d8f_jetson_int8.zip",
    download_url: "/api/v1/deployments/download/bundle_18e93d8f_jetson_int8.zip",
    files: [
      "model.onnx",
      "config.json",
      "infer.py",
      "manifest.json",
      "requirements.txt",
      "README.md",
    ],
  },
  {
    id: "pkg-rtx4060-yolo-fp16",
    version: "1.0.0",
    bundle_id: "bundle_72bf1a99_rtx4060_fp16",
    model_id: "model-yolov8n-fp32",
    model_name: "Edge Tiny YOLO (v8-nano style)",
    hardware_id: "nvidia-rtx4060-local",
    hardware_name: "NVIDIA GeForce RTX 4060 Laptop GPU",
    runtime: "tensorrt",
    precision: "fp16",
    build_timestamp: "2026-11-04T10:15:00Z",
    size_bytes: 268400,
    verification_status: "Verified",
    zero_copy_verified: true,
    zero_copy_mode: "UnifiedVirtualAddressing",
    zip_path: "/workspace/bundles/edgeforge_bundle_72bf1a99_rtx4060_fp16.zip",
    download_url: "/api/v1/deployments/download/bundle_72bf1a99_rtx4060_fp16.zip",
    files: [
      "model.onnx",
      "config.json",
      "infer.py",
      "manifest.json",
      "requirements.txt",
      "README.md",
    ],
  },
];

export const REPLAY_VERIFICATION_RESULT: VerificationResult = {
  bundle_id: "bundle_18e93d8f_jetson_int8",
  verification_status: "PASSED",
  zero_copy_verified: true,
  returncode: 0,
  stdout: `[EdgeForge Deployment Verifier v1.0]
Loading bundle: bundle_18e93d8f_jetson_int8.zip
[✓] Manifest checksums verified: 6/6 files match SHA-256 digests
[✓] TensorRT INT8 execution provider loaded successfully
[✓] Input tensor allocated in page-locked pinned host memory (640x640x3 float32)
[✓] Zero-copy DMA transfer verified (latency overhead: 0.012 ms)
[✓] Executed 10 inference iterations:
    - Iteration 1: 4.15 ms
    - Iteration 2: 4.12 ms
    - Iteration 3: 4.10 ms
    - Iteration 4: 4.12 ms
    - Iteration 5: 4.11 ms
    - Iteration 6: 4.13 ms
    - Iteration 7: 4.12 ms
    - Iteration 8: 4.11 ms
    - Iteration 9: 4.12 ms
    - Iteration 10: 4.12 ms
[✓] Output tensor dimensions confirmed: (1, 84, 8400)
[✓] Bounding boxes decoded: 4 detections above 0.50 threshold
------------------------------------------------------------
Summary: 0 errors, 0 warnings. Bundle is production-certified.`,
  stderr: "",
};

export const REPLAY_MANIFEST_JSON = {
  bundle_id: "bundle_18e93d8f_jetson_int8",
  format_version: "2.1",
  export_timestamp: "2026-11-04T10:30:00Z",
  model: {
    name: "Edge Tiny YOLO (INT8 Quantized)",
    sha256: "3d5f9921ec567119c351b897931fce3e945c7bc582c418659d64bb729d5b4129",
    input_shape: [1, 3, 640, 640],
    output_shape: [1, 84, 8400],
    precision: "int8",
  },
  target_hardware: {
    id: "nvidia-jetson-orin-nano",
    name: "NVIDIA Jetson Orin Nano (8GB)",
    tdp_budget_watts: 15.0,
    expected_latency_ms: 4.12,
    expected_fps: 242.7,
  },
  runtime: {
    framework: "TensorRT 10.2",
    execution_provider: "TensorrtExecutionProvider",
    dynamic_batching: false,
    zero_copy: true,
  },
  verification: {
    signature: "EF-SIG-2026-98FA-4412-BEEF",
    signer: "EdgeForge Deployment Automation Engine",
    status: "PASSED",
  },
};

export const REPLAY_INFER_SCRIPT = `#!/usr/bin/env python3
"""
EdgeForge Standalone Portable Inference Engine
Target: NVIDIA Jetson Orin Nano (8GB) - TensorRT INT8
Model: Edge Tiny YOLO (v8-nano style)
"""

import sys
import time
import json
import numpy as np
import onnxruntime as ort

def load_session():
    opts = ort.SessionOptions()
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    opts.enable_profiling = False
    
    providers = [
        ('TensorrtExecutionProvider', {
            'device_id': 0,
            'trt_max_workspace_size': 2147483648,
            'trt_fp16_enable': True,
            'trt_int8_enable': True,
        }),
        'CUDAExecutionProvider',
        'CPUExecutionProvider'
    ]
    return ort.InferenceSession('model.onnx', opts, providers=providers)

def main():
    print("[EdgeForge] Loading model.onnx...")
    session = load_session()
    
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    
    # Generate dummy input [1, 3, 640, 640]
    dummy_input = np.random.randn(1, 3, 640, 640).astype(np.float32)
    
    # Warmup
    for _ in range(5):
        session.run([output_name], {input_name: dummy_input})
        
    # Benchmarking
    iterations = 20
    times = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        session.run([output_name], {input_name: dummy_input})
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000.0)
        
    median_lat = float(np.median(times))
    fps = 1000.0 / median_lat
    print(f"[✓] Benchmark complete. Median latency: {median_lat:.2f} ms ({fps:.1f} FPS)")

if __name__ == "__main__":
    main()
`;

export const REPLAY_REPORTS: ReportItem[] = [
  {
    id: "report-yolo-edge-audit-2026",
    title: "Edge Tiny YOLO: Edge Silicon Suitability & Quantization Audit",
    type: "Quantization Audit",
    model_id: "model-yolov8n-fp32",
    model_name: "Edge Tiny YOLO (v8-nano style)",
    generation_date: "2026-11-04T10:45:00Z",
    formats: ["Markdown", "HTML", "JSON"],
    cryptographic_summary: {
      model_checksum_sha256: "a93b4f62e847119c351b897931fce3e945c7bc582c418659d64bb729d5b78b10",
      manifest_digest_sha256: "e4a8b79c01823901bc719c351b897931fce3e945c7bc582c418659d64bb79912",
      tamper_evident_signature: "EF-AUDIT-2026-1104-9988-VALID",
      zero_defect_verification: "PASSED",
      signer_identity: "EdgeForge Automated Compliance Attestor",
      timestamp_iso: "2026-11-04T10:45:00Z",
    },
    kpis: {
      evaluated_runs: 9,
      fastest_latency_ms: 0.22,
      max_throughput_fps: 4545.4,
      accuracy_metric: "mAP@50: 0.854 (0.0% regression on INT8)",
    },
    markdown_content: `# EdgeForge Model Evaluation & Silicon Audit Report
**Model:** Edge Tiny YOLO (v8-nano style)  
**Task Type:** Object Detection (640x640x3)  
**Evaluation Date:** November 4, 2026  
**Provider:** EdgeForge Vendor-Neutral Benchmarking Engine

---

## 1. Executive Summary
Edge Tiny YOLO was profiled across 7 heterogeneous silicon targets spanning x86 AVX2/VNNI, NVIDIA Ada Lovelace, NVIDIA Jetson Orin, Hailo-8 M.2 dataflow accelerator, and ARM Cortex-A76.
Dynamic INT8 quantization compressed model footprint by **73.8%** (from 397 KB to 104 KB) with zero mAP@50 degradation on the 12-frame edge validation set.

## 2. Pareto Frontier Winner
- **Edge Robotics (< 15W TDP, Latency < 10ms):**  
  **NVIDIA Jetson Orin Nano (8GB) - TensorRT INT8**  
  - Median Latency: **4.12 ms** (242.7 FPS)  
  - Power Draw: **11.8 W** (meets <15W constraint)  
  - Memory Footprint: **128 MB RSS**  
  - Accuracy: **0.852 mAP@50** (0.23% drop)

- **Maximum Energy Efficiency:**  
  **Hailo-8 M.2 Module**  
  - Throughput: **689.6 FPS** at **2.4 W** (287.3 FPS/Watt)

## 3. Cryptographic Verification
- Model SHA-256: \`a93b4f62e847119c351b897931fce3e945c7bc582c418659d64bb729d5b78b10\`
- Bundle SHA-256: \`e4a8b79c01823901bc719c351b897931fce3e945c7bc582c418659d64bb79912\`
- Zero-Defect Status: **VERIFIED PASS**
`,
  },
];

export const REPLAY_ONNX_NODES: OnnxGraphNode[] = [
  {
    id: "node_0",
    name: "/model.0/conv",
    opType: "Conv",
    inputs: ["images", "/model.0/conv/weight"],
    outputs: ["/model.0/conv/output"],
    attributes: { kernel_shape: [3, 3], strides: [2, 2], pads: [1, 1, 1, 1] },
    category: "conv",
  },
  {
    id: "node_1",
    name: "/model.0/bn",
    opType: "BatchNormalization",
    inputs: ["/model.0/conv/output", "/model.0/bn/scale", "/model.0/bn/bias", "/model.0/bn/mean", "/model.0/bn/var"],
    outputs: ["/model.0/bn/output"],
    attributes: { epsilon: 0.00001, momentum: 0.9 },
    category: "norm",
  },
  {
    id: "node_2",
    name: "/model.0/act",
    opType: "Relu",
    inputs: ["/model.0/bn/output"],
    outputs: ["/model.0/act/output"],
    attributes: {},
    category: "activation",
  },
  {
    id: "node_3",
    name: "/model.1/conv",
    opType: "Conv",
    inputs: ["/model.0/act/output", "/model.1/conv/weight"],
    outputs: ["/model.1/conv/output"],
    attributes: { kernel_shape: [3, 3], strides: [2, 2], pads: [1, 1, 1, 1] },
    category: "conv",
  },
  {
    id: "node_4",
    name: "/model.1/bn",
    opType: "BatchNormalization",
    inputs: ["/model.1/conv/output", "/model.1/bn/scale", "/model.1/bn/bias", "/model.1/bn/mean", "/model.1/bn/var"],
    outputs: ["/model.1/bn/output"],
    attributes: { epsilon: 0.00001, momentum: 0.9 },
    category: "norm",
  },
  {
    id: "node_5",
    name: "/model.1/act",
    opType: "Relu",
    inputs: ["/model.1/bn/output"],
    outputs: ["/model.1/act/output"],
    attributes: {},
    category: "activation",
  },
  {
    id: "node_6",
    name: "/model.2/pool",
    opType: "MaxPool",
    inputs: ["/model.1/act/output"],
    outputs: ["/model.2/pool/output"],
    attributes: { kernel_shape: [2, 2], strides: [2, 2] },
    category: "pooling",
  },
  {
    id: "node_7",
    name: "/model.3/bottleneck/conv1",
    opType: "Conv",
    inputs: ["/model.2/pool/output", "/model.3/conv1/weight"],
    outputs: ["/model.3/conv1/output"],
    attributes: { kernel_shape: [1, 1], strides: [1, 1] },
    category: "conv",
  },
  {
    id: "node_8",
    name: "/model.3/bottleneck/add",
    opType: "Add",
    inputs: ["/model.2/pool/output", "/model.3/conv1/output"],
    outputs: ["/model.3/residual/output"],
    attributes: {},
    category: "fusion",
  },
  {
    id: "node_9",
    name: "/model.4/detect/head",
    opType: "Conv",
    inputs: ["/model.3/residual/output", "/model.4/head/weight"],
    outputs: ["/model.4/head/output"],
    attributes: { kernel_shape: [1, 1], strides: [1, 1] },
    category: "conv",
  },
  {
    id: "node_10",
    name: "/model.4/detect/sigmoid",
    opType: "Sigmoid",
    inputs: ["/model.4/head/output"],
    outputs: ["output0"],
    attributes: {},
    category: "output",
  },
];
