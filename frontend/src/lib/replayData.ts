import {
  ModelRecord,
  HardwareDevice,
  DatasetRecord,
  Experiment,
  BenchmarkRun,
  MetaStatus,
  AgentResponse,
  CompatibilityReport,
} from "./api";
import { TabType } from "@/components/Navigation";

export type ReplayScenarioId =
  | "featured-e2e"
  | "featured-end-to-end"
  | "yolo-inspection"
  | "hardware-benchmarking"
  | "precision-optimization"
  | "hardware-comparison"
  | "ai-engineer"
  | "ai-engineer-agent"
  | "deployment-bundling"
  | "deployment-bundle";

export interface ReplayWorkbenchData {
  status: "idle" | "running" | "completed";
  progress: number;
  fps: number;
  latencyMs: number;
  powerWatts: number;
  gpuUtilPct: number;
  memoryMb: number;
  logs: string;
}

export interface ReplayDeploymentsData {
  bundleId: string;
  activeViewTab: "requirements" | "manifest" | "checksums" | "dockerfile" | "launch";
  verified: boolean;
  dockerfileContent: string;
  launchCommand: string;
  checksumSha256: string;
  manifestJson: Record<string, unknown>;
}

export interface ReplayCompareData {
  selectedRunIds: string[];
}

export interface ReplayStageSnapshot {
  models: ModelRecord[];
  hardware: HardwareDevice[];
  datasets: DatasetRecord[];
  experiments: Experiment[];
  runs: BenchmarkRun[];
  metaStatus: MetaStatus;
  agentResponse?: AgentResponse;
  compatibilityReport?: CompatibilityReport;
  activeTab: TabType;
  selectedModelId?: string;
  selectedDatasetId?: string;
  selectedRunId?: string;
  workbench?: ReplayWorkbenchData;
  deployments?: ReplayDeploymentsData;
  compare?: ReplayCompareData;
}

export interface ReplayStage {
  id: string;
  scenarioId?: ReplayScenarioId;
  stageIndex?: number;
  title: string;
  subtitle?: string;
  badge?: string;
  summary?: string;
  targetTab?: TabType;
  activeTab?: TabType;
  selectedModelId?: string;
  selectedRunId?: string;
  durationSeconds?: number;
  snapshot: ReplayStageSnapshot;
}

export interface ReplayScenario {
  id: ReplayScenarioId;
  title: string;
  tagline: string;
  description: string;
  iconName?: "Sparkles" | "Layers" | "Cpu" | "Sliders" | "GitCompare" | "Bot" | "Package" | string;
  category: string;
  featured?: boolean;
  recommendedBadge?: string;
  focusTag?: string;
  difficulty?: string;
  hardwareUsed?: string[];
  totalDurationSeconds?: number;
  stages: ReplayStage[];
  steps?: unknown[];
}

// ---------------------------------------------------------------------------
// Base Mock Data Items
// ---------------------------------------------------------------------------

export const REPLAY_MODELS: ModelRecord[] = [
  {
    id: "model-yolo-fp32",
    name: "Edge Tiny YOLO (v8-nano style)",
    filename: "edge_tiny_yolo.onnx",
    filepath: "/workspace/models/edge_tiny_yolo.onnx",
    file_size_bytes: 406528,
    format: "onnx",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    opset_version: 17,
    input_shapes: [{ name: "images", shape: [1, 3, 640, 640], dtype: "float32" }],
    output_shapes: [{ name: "output0", shape: [1, 84, 8400], dtype: "float32" }],
    operators: {
      Conv: 22,
      BatchNormalization: 22,
      SiLU: 22,
      MaxPool: 3,
      Concat: 4,
      Mul: 2,
      Add: 3,
    },
    node_count: 78,
    task_type: "object_detection",
    metadata_json: {
      framework: "PyTorch 2.5.1 / ONNX 1.17",
      target_resolution: "640x640",
      training_epochs: 100,
      validation_mAP50: 0.854,
    },
    created_at: "2026-11-04T12:00:00Z",
  },
  {
    id: "model-yolo-int8",
    name: "Edge Tiny YOLO (INT8 Dynamic Quantized)",
    filename: "edge_tiny_yolo_int8.onnx",
    filepath: "/workspace/models/edge_tiny_yolo_int8.onnx",
    file_size_bytes: 106496,
    format: "onnx",
    sha256: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    opset_version: 17,
    input_shapes: [{ name: "images", shape: [1, 3, 640, 640], dtype: "float32" }],
    output_shapes: [{ name: "output0", shape: [1, 84, 8400], dtype: "float32" }],
    operators: {
      QuantizeLinear: 18,
      DequantizeLinear: 18,
      QLinearConv: 22,
      SiLU: 22,
      MaxPool: 3,
      Concat: 4,
    },
    node_count: 87,
    task_type: "object_detection",
    metadata_json: {
      quantization: "INT8 Dynamic (QDQ)",
      calibration_dataset: "edge_val_dataset",
      compression_ratio: "3.81x",
      validation_mAP50: 0.852,
      accuracy_drop_pct: 0.23,
    },
    created_at: "2026-11-04T12:30:00Z",
  },
  {
    id: "model-mobilenet",
    name: "MobileNetV3 Small (Edge Classifier)",
    filename: "mobilenet_v3_small.onnx",
    filepath: "/workspace/models/mobilenet_v3_small.onnx",
    file_size_bytes: 10240000,
    format: "onnx",
    sha256: "b10a8db164e0754105b7a99be72e3fe5",
    opset_version: 16,
    input_shapes: [{ name: "input", shape: [1, 3, 224, 224], dtype: "float32" }],
    output_shapes: [{ name: "probabilities", shape: [1, 1000], dtype: "float32" }],
    operators: { Conv: 16, HardSwish: 11, HardSigmoid: 11, GlobalAveragePool: 1, Gemm: 2 },
    node_count: 52,
    task_type: "classification",
    metadata_json: { target: "low-power classification" },
    created_at: "2026-11-04T11:00:00Z",
  },
];

export const REPLAY_HARDWARE: HardwareDevice[] = [
  {
    id: "cpu-local",
    name: "Intel Core i7-14700HX (Host Silicon)",
    device_type: "cpu",
    vendor: "Intel",
    architecture: "x86_64 / Raptor Lake",
    status: "ONLINE",
    is_local: true,
    compute_tops: 1.2,
    memory_mb: 32768,
    tdp_watts: 55,
    cost_usd: 0,
    supported_runtimes: ["onnxruntime", "openvino"],
    supported_precisions: ["fp32", "fp16", "int8"],
    telemetry_supported: true,
    details_json: {
      cores: 20,
      threads: 28,
      vector_extensions: ["AVX2", "AVX-512", "VNNI", "AMX"],
      clock_max_ghz: 5.5,
    },
    detected_at: "2026-11-04T12:00:00Z",
  },
  {
    id: "gpu-local",
    name: "NVIDIA GeForce RTX 4060 Laptop GPU",
    device_type: "gpu",
    vendor: "NVIDIA",
    architecture: "Ada Lovelace",
    status: "ONLINE",
    is_local: true,
    compute_tops: 242.0,
    memory_mb: 8192,
    tdp_watts: 115,
    cost_usd: 0,
    supported_runtimes: ["onnxruntime", "tensorrt"],
    supported_precisions: ["fp32", "fp16", "int8"],
    telemetry_supported: true,
    details_json: {
      cuda_cores: 3072,
      tensor_cores: 96,
      driver_version: "595.91",
      nvml_active: true,
    },
    detected_at: "2026-11-04T12:00:00Z",
  },
  {
    id: "hailo8-pi5",
    name: "Raspberry Pi 5 + Hailo-8 M.2 NPU",
    device_type: "npu",
    vendor: "Hailo Technologies",
    architecture: "Hailo Structure-Defined Dataflow",
    status: "ONLINE",
    is_local: false,
    compute_tops: 26.0,
    memory_mb: 8192,
    tdp_watts: 8.2,
    cost_usd: 160,
    supported_runtimes: ["hailort", "onnxruntime"],
    supported_precisions: ["int8"],
    telemetry_supported: true,
    details_json: {
      host_soc: "Broadcom BCM2712 Quad Cortex-A76",
      npu_interface: "PCIe Gen 2 x1 M.2 Key M",
      mac_units: 4096,
      typical_power_watts: 2.5,
    },
    detected_at: "2026-11-04T12:00:00Z",
  },
  {
    id: "jetson-orin-nano",
    name: "NVIDIA Jetson Orin Nano 8GB",
    device_type: "soc",
    vendor: "NVIDIA",
    architecture: "Ampere Edge SoC",
    status: "ONLINE",
    is_local: false,
    compute_tops: 40.0,
    memory_mb: 8192,
    tdp_watts: 15.0,
    cost_usd: 499,
    supported_runtimes: ["tensorrt", "onnxruntime"],
    supported_precisions: ["fp32", "fp16", "int8"],
    telemetry_supported: true,
    details_json: {
      cuda_cores: 1024,
      tensor_cores: 32,
      cpu_cores: 6,
      memory_bus_width: "128-bit LPDDR5",
    },
    detected_at: "2026-11-04T12:00:00Z",
  },
];

export const REPLAY_DATASETS: DatasetRecord[] = [
  {
    id: "dataset-val-12",
    name: "Edge Vision Benchmark Val (12 frames)",
    task_type: "object_detection",
    format: "yolo",
    filepath: "/workspace/datasets/edge_val_dataset",
    images_dir: "/workspace/datasets/edge_val_dataset/images",
    annotations_path: "/workspace/datasets/edge_val_dataset/labels",
    num_samples: 12,
    classes: ["drone", "vehicle", "pedestrian", "sensor"],
    metadata_json: {
      ground_truth_boxes: 48,
      resolution: "640x640",
      license: "Creative Commons 4.0",
    },
    created_at: "2026-11-04T12:00:00Z",
  },
];

export const REPLAY_RUNS: BenchmarkRun[] = [
  {
    id: "run-cpu-fp32",
    experiment_id: "exp-001",
    model_id: "model-yolo-fp32",
    hardware_id: "cpu-local",
    runtime: "onnxruntime",
    precision: "fp32",
    batch_size: 1,
    latency_samples_ms: [0.82, 0.84, 0.85, 0.83, 0.84, 0.86, 0.84, 0.83, 0.85, 0.84],
    median_latency_ms: 0.84,
    mean_latency_ms: 0.84,
    p90_latency_ms: 0.85,
    p95_latency_ms: 0.86,
    p99_latency_ms: 0.89,
    std_latency_ms: 0.02,
    fps: 1189.5,
    memory_rss_mb: 65.2,
    gpu_memory_used_mb: 0,
    avg_power_watts: 42.0,
    peak_power_watts: 55.0,
    avg_temperature_c: 54.0,
    map50: 0.854,
    map50_95: 0.612,
    accuracy_loss_pct: 0.0,
    model_size_mb: 0.39,
    verified: true,
    reproducibility_metadata: { host: "i7-14700HX", iterations: 500, warmup: 50 },
    created_at: "2026-11-04T12:15:00Z",
  },
  {
    id: "run-gpu-fp32",
    experiment_id: "exp-002",
    model_id: "model-yolo-fp32",
    hardware_id: "gpu-local",
    runtime: "onnxruntime",
    precision: "fp32",
    batch_size: 1,
    latency_samples_ms: [0.88, 0.90, 0.91, 0.89, 0.90, 0.92, 0.90, 0.89, 0.91, 0.90],
    median_latency_ms: 0.90,
    mean_latency_ms: 0.90,
    p90_latency_ms: 0.91,
    p95_latency_ms: 0.92,
    p99_latency_ms: 0.95,
    std_latency_ms: 0.02,
    fps: 1111.9,
    memory_rss_mb: 95.0,
    gpu_memory_used_mb: 561.0,
    avg_power_watts: 48.0,
    peak_power_watts: 85.0,
    avg_temperature_c: 62.0,
    map50: 0.854,
    map50_95: 0.612,
    accuracy_loss_pct: 0.0,
    model_size_mb: 0.39,
    verified: true,
    reproducibility_metadata: { host: "RTX 4060", cuda: "12.4", tensorrt: "10.3" },
    created_at: "2026-11-04T12:18:00Z",
  },
  {
    id: "run-hailo-int8",
    experiment_id: "exp-003",
    model_id: "model-yolo-int8",
    hardware_id: "hailo8-pi5",
    runtime: "hailort",
    precision: "int8",
    batch_size: 1,
    latency_samples_ms: [2.08, 2.10, 2.12, 2.09, 2.10, 2.15, 2.11, 2.09, 2.13, 2.10],
    median_latency_ms: 2.10,
    mean_latency_ms: 2.10,
    p90_latency_ms: 2.13,
    p95_latency_ms: 2.15,
    p99_latency_ms: 2.22,
    std_latency_ms: 0.04,
    fps: 476.2,
    memory_rss_mb: 38.4,
    gpu_memory_used_mb: 0,
    avg_power_watts: 8.2,
    peak_power_watts: 10.5,
    avg_temperature_c: 46.5,
    map50: 0.852,
    map50_95: 0.610,
    accuracy_loss_pct: 0.23,
    model_size_mb: 0.10,
    verified: true,
    reproducibility_metadata: { compiler: "Hailo Dataflow Compiler v3.28" },
    created_at: "2026-11-04T12:35:00Z",
  },
  {
    id: "run-jetson-fp16",
    experiment_id: "exp-004",
    model_id: "model-yolo-fp32",
    hardware_id: "jetson-orin-nano",
    runtime: "tensorrt",
    precision: "fp16",
    batch_size: 1,
    latency_samples_ms: [1.43, 1.45, 1.47, 1.44, 1.45, 1.48, 1.46, 1.44, 1.47, 1.45],
    median_latency_ms: 1.45,
    mean_latency_ms: 1.45,
    p90_latency_ms: 1.47,
    p95_latency_ms: 1.49,
    p99_latency_ms: 1.54,
    std_latency_ms: 0.03,
    fps: 689.6,
    memory_rss_mb: 48.0,
    gpu_memory_used_mb: 312.0,
    avg_power_watts: 12.4,
    peak_power_watts: 15.0,
    avg_temperature_c: 51.0,
    map50: 0.853,
    map50_95: 0.611,
    accuracy_loss_pct: 0.12,
    model_size_mb: 0.20,
    verified: true,
    reproducibility_metadata: { jetpack: "6.0", tensorrt: "10.0" },
    created_at: "2026-11-04T12:40:00Z",
  },
];

export const REPLAY_EXPERIMENTS: Experiment[] = [
  {
    id: "exp-001",
    name: "Intel Core i7 FP32 Baseline",
    model_id: "model-yolo-fp32",
    dataset_id: "dataset-val-12",
    hardware_id: "cpu-local",
    runtime: "onnxruntime",
    execution_provider: "CPUExecutionProvider",
    precision: "fp32",
    batch_size: 1,
    iterations: 500,
    warmup_iterations: 50,
    status: "COMPLETED",
    progress: 100,
    created_at: "2026-11-04T12:10:00Z",
  },
  {
    id: "exp-002",
    name: "NVIDIA RTX 4060 FP32 GPU Run",
    model_id: "model-yolo-fp32",
    dataset_id: "dataset-val-12",
    hardware_id: "gpu-local",
    runtime: "onnxruntime",
    execution_provider: "CUDAExecutionProvider",
    precision: "fp32",
    batch_size: 1,
    iterations: 500,
    warmup_iterations: 50,
    status: "COMPLETED",
    progress: 100,
    created_at: "2026-11-04T12:16:00Z",
  },
  {
    id: "exp-003",
    name: "Raspberry Pi 5 + Hailo-8 INT8 Profiling",
    model_id: "model-yolo-int8",
    dataset_id: "dataset-val-12",
    hardware_id: "hailo8-pi5",
    runtime: "hailort",
    execution_provider: "HailoAsyncProvider",
    precision: "int8",
    batch_size: 1,
    iterations: 500,
    warmup_iterations: 50,
    status: "COMPLETED",
    progress: 100,
    created_at: "2026-11-04T12:30:00Z",
  },
  {
    id: "exp-004",
    name: "Jetson Orin Nano TensorRT FP16",
    model_id: "model-yolo-fp32",
    dataset_id: "dataset-val-12",
    hardware_id: "jetson-orin-nano",
    runtime: "tensorrt",
    execution_provider: "TensorrtExecutionProvider",
    precision: "fp16",
    batch_size: 1,
    iterations: 500,
    warmup_iterations: 50,
    status: "COMPLETED",
    progress: 100,
    created_at: "2026-11-04T12:38:00Z",
  },
];

export const REPLAY_META_STATUS: MetaStatus = {
  provider: "Meta Replay Engine (Isolated)",
  model: "llama-3-70b-instruct (Simulated Trace)",
  base_url: "https://api.meta.internal/v1",
  configured: true,
  mode: "REPLAY_DEMO",
  message: "Replay Sandbox: Offline-Safe • Zero-Credit • 100% Deterministic Execution",
};

export const REPLAY_AGENT_RESPONSE: AgentResponse = {
  session_id: "replay-agent-session-882",
  title: "Edge Silicon Deployment Recommendation: Edge Tiny YOLO on Embedded Robotics",
  mode: "REPLAY_AGENT",
  reply: `### Executive Deployment Summary: Edge Tiny YOLO on Edge Robotics Silicon

**Objective Constraints Evaluated:**
- **Latency SLA:** $\\le 30.0$ ms (P95 required)
- **Throughput Target:** $\\ge 30.0$ FPS
- **Power Envelope:** $\\le 15.0$ Watts TDP
- **Hardware Budget:** $\\le \\$500.00$

**Recommended Solution (Pareto Winner):**
**Raspberry Pi 5 + Hailo-8 M.2 NPU (INT8 Quantized)**
- **Measured Median Latency:** **2.10 ms** (93.0% safety margin under 30.0 ms SLA)
- **Empirical Throughput:** **476.2 FPS** (15.8x faster than minimum 30 FPS target)
- **Measured Power Draw:** **8.2 Watts** (well within 15W battery payload budget)
- **Unit Cost:** **$160.00** ($340 under budget)
- **Accuracy Retention:** mAP@50 is **0.852** (99.8% retention vs 0.854 FP32 baseline)

**Alternative Runner-Up (Jetson Orin Nano 8GB):**
Jetson Orin Nano delivers **1.45 ms latency (689.6 FPS)** at **12.4W**, but costs **$499.00** ($339 more expensive than Hailo-8 for marginal battery flight time gains).`,
  traces: [
    {
      step_number: 1,
      role: "assistant",
      thought: "Inspect ONNX model topology, static input shapes, and verify operator support across candidate edge runtimes.",
      tool_name: "inspect_model",
      tool_args: { model_id: "model-yolo-fp32" },
      tool_result: {
        format: "onnx",
        opset: 17,
        input_shape: [1, 3, 640, 640],
        operators: { Conv: 22, BatchNormalization: 22, SiLU: 22, MaxPool: 3, Concat: 4 },
        static_dimensions: true,
        dynamic_shape_risk: "NONE",
      },
      status: "COMPLETED",
      created_at: "2026-11-04T12:31:00Z",
    },
    {
      step_number: 2,
      role: "assistant",
      thought: "Query silicon inventory for low-power edge accelerators meeting the <= 15W TDP ceiling.",
      tool_name: "list_hardware",
      tool_args: { max_tdp_watts: 15.0, status: "ONLINE" },
      tool_result: {
        qualifying_devices: [
          { id: "hailo8-pi5", name: "Raspberry Pi 5 + Hailo-8", tops: 26.0, tdp_watts: 8.2, cost: 160 },
          { id: "jetson-orin-nano", name: "NVIDIA Jetson Orin Nano", tops: 40.0, tdp_watts: 15.0, cost: 499 },
        ],
      },
      status: "COMPLETED",
      created_at: "2026-11-04T12:31:02Z",
    },
    {
      step_number: 3,
      role: "assistant",
      thought: "Retrieve empirical benchmark latency, FPS, and energy telemetry for qualifying devices.",
      tool_name: "query_benchmarks",
      tool_args: { model_id: "model-yolo-int8", hardware_ids: ["hailo8-pi5", "jetson-orin-nano"] },
      tool_result: {
        runs: [
          { hardware: "hailo8-pi5", latency_p50_ms: 2.10, latency_p95_ms: 2.15, fps: 476.2, power_watts: 8.2 },
          { hardware: "jetson-orin-nano", latency_p50_ms: 1.45, latency_p95_ms: 1.49, fps: 689.6, power_watts: 12.4 },
        ],
      },
      status: "COMPLETED",
      created_at: "2026-11-04T12:31:05Z",
    },
    {
      step_number: 4,
      role: "assistant",
      thought: "Perform multi-objective Pareto optimization across latency, power consumption, and hardware unit cost.",
      tool_name: "compute_pareto_frontier",
      tool_args: {
        candidates: ["hailo8-pi5", "jetson-orin-nano"],
        objectives: ["min_latency", "min_power", "min_cost"],
      },
      tool_result: {
        pareto_optimal_set: ["hailo8-pi5", "jetson-orin-nano"],
        recommended_winner: "hailo8-pi5",
        efficiency_score: 98.4,
        rationale: "Hailo-8 delivers 58.1 FPS/Watt at $160 unit cost, satisfying SLA with 93% latency safety margin.",
      },
      status: "COMPLETED",
      created_at: "2026-11-04T12:31:08Z",
    },
  ],
};

export const REPLAY_COMPATIBILITY_REPORT: CompatibilityReport = {
  model_id: "model-yolo-fp32",
  hardware_id: "hailo8-pi5",
  hardware_name: "Raspberry Pi 5 + Hailo-8 M.2 NPU",
  runtime: "hailort",
  precision: "int8",
  overall_status: "COMPATIBLE",
  errors_count: 0,
  warnings_count: 0,
  findings: [
    {
      category: "OPERATOR_SUPPORT",
      severity: "INFORMATION",
      message: "All 14 operator types (Conv, SiLU, MaxPool, Concat) supported natively in Hailo Dataflow Compiler.",
      remediation: "No fallback to host CPU required.",
      evidence: "Verified against Hailo DFC v3.28 hardware mapping table.",
    },
    {
      category: "TENSOR_SHAPE",
      severity: "INFORMATION",
      message: "Static input shape [1, 3, 640, 640] allows zero-copy DMA streaming over PCIe Gen 2.",
      remediation: "Maintain static batch size 1 for minimum pipeline jitter.",
      evidence: "ONNX graph inspection confirmed static dimension metadata.",
    },
  ],
};

// ---------------------------------------------------------------------------
// 7 Detailed Replay Scenarios
// ---------------------------------------------------------------------------

export const REPLAY_SCENARIOS: ReplayScenario[] = [
  // 1. Featured End-to-End Walkthrough
  {
    id: "featured-e2e",
    title: "Featured End-to-End Walkthrough",
    tagline: "Full Edge AI deployment pipeline from ONNX model to edge silicon verification.",
    description: "Walks through model architecture inspection, multi-silicon profiling, INT8 quantization, Pareto frontier selection, and standalone deployment bundle export.",
    iconName: "Sparkles",
    category: "Full Lifecycle",
    stages: [
      {
        id: "e2e-stage-0",
        scenarioId: "featured-e2e",
        stageIndex: 0,
        title: "Model Architecture & Graph Inspection",
        badge: "1. Model Ingestion",
        summary: "Inspect Edge Tiny YOLO ONNX graph: static 1x3x640x640 tensor shapes, 78 nodes, and 14 operator types.",
        targetTab: "models",
        selectedModelId: "model-yolo-fp32",
        snapshot: {
          models: [REPLAY_MODELS[0]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [],
          runs: [],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "models",
          selectedModelId: "model-yolo-fp32",
        },
      },
      {
        id: "e2e-stage-1",
        scenarioId: "featured-e2e",
        stageIndex: 1,
        title: "Silicon Auto-Discovery & Telemetry",
        badge: "2. Hardware Discovery",
        summary: "Hardware discovery detects 4 silicon targets: Intel i7 host, NVIDIA RTX 4060 GPU, Raspberry Pi 5 + Hailo-8 NPU, and Jetson Orin Nano.",
        targetTab: "hardware",
        snapshot: {
          models: [REPLAY_MODELS[0]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [],
          runs: [],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "hardware",
        },
      },
      {
        id: "e2e-stage-2",
        scenarioId: "featured-e2e",
        stageIndex: 2,
        title: "Host Bare-Metal Benchmark Run",
        badge: "3. Silicon Profiling",
        summary: "Profile FP32 baseline on host Intel i7: 0.84 ms median latency, 1,189 FPS, and 65 MB memory footprint.",
        targetTab: "workbench",
        selectedModelId: "model-yolo-fp32",
        selectedRunId: "run-cpu-fp32",
        snapshot: {
          models: [REPLAY_MODELS[0]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [REPLAY_EXPERIMENTS[0]],
          runs: [REPLAY_RUNS[0]],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "workbench",
          selectedModelId: "model-yolo-fp32",
          selectedRunId: "run-cpu-fp32",
        },
      },
      {
        id: "e2e-stage-3",
        scenarioId: "featured-e2e",
        stageIndex: 3,
        title: "INT8 Dynamic Quantization & mAP Verification",
        badge: "4. Quantization",
        summary: "Quantize model to INT8: footprint shrinks by 73.7% (397 KB -> 104 KB) with zero mAP regression verified on validation images.",
        targetTab: "workbench",
        selectedModelId: "model-yolo-int8",
        selectedRunId: "run-hailo-int8",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [REPLAY_EXPERIMENTS[0], REPLAY_EXPERIMENTS[2]],
          runs: [REPLAY_RUNS[0], REPLAY_RUNS[2]],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "workbench",
          selectedModelId: "model-yolo-int8",
          selectedRunId: "run-hailo-int8",
        },
      },
      {
        id: "e2e-stage-4",
        scenarioId: "featured-e2e",
        stageIndex: 4,
        title: "Multi-Silicon Pareto Frontier Comparison",
        badge: "5. Pareto Analysis",
        summary: "Compare all 4 devices across latency, throughput, energy efficiency (FPS/Watt), and hardware cost.",
        targetTab: "compare",
        selectedRunId: "run-hailo-int8",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "compare",
          selectedRunId: "run-hailo-int8",
        },
      },
      {
        id: "e2e-stage-5",
        scenarioId: "featured-e2e",
        stageIndex: 5,
        title: "Meta AI Engineer Autonomous Optimization",
        badge: "6. Agent Reasoning",
        summary: "Observable agent trace analyzes robotics SLA constraints and recommends Hailo-8 M.2 with step-by-step tool execution.",
        targetTab: "agent",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          agentResponse: REPLAY_AGENT_RESPONSE,
          activeTab: "agent",
        },
      },
      {
        id: "e2e-stage-6",
        scenarioId: "featured-e2e",
        stageIndex: 6,
        title: "Production Bundle Export & Smoke Verification",
        badge: "7. Deployment Export",
        summary: "Generate standalone edge package with C++ inference script, SHA256 verification, and Docker recipe.",
        targetTab: "deployments",
        selectedModelId: "model-yolo-int8",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "deployments",
          selectedModelId: "model-yolo-int8",
        },
      },
    ],
  },

  // 2. YOLO Inspection & Profiling
  {
    id: "yolo-inspection",
    title: "YOLO Inspection & Architecture Analysis",
    tagline: "Deep-dive into ONNX node topology, tensor dimensions, and operator support.",
    description: "Inspect Conv, BatchNorm, SiLU, MaxPool, and Concat operators, static shape constraints, and memory allocation requirements.",
    iconName: "Layers",
    category: "Architecture",
    stages: [
      {
        id: "yolo-stage-0",
        scenarioId: "yolo-inspection",
        stageIndex: 0,
        title: "ONNX Model Topology & Tensor Dimensions",
        badge: "Graph Inspection",
        summary: "Review 78 nodes, 14 operator types, and static 1x3x640x640 input resolution.",
        targetTab: "models",
        selectedModelId: "model-yolo-fp32",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1], REPLAY_MODELS[2]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [],
          runs: [],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "models",
          selectedModelId: "model-yolo-fp32",
        },
      },
      {
        id: "yolo-stage-1",
        scenarioId: "yolo-inspection",
        stageIndex: 1,
        title: "Hardware Silicon Compatibility Matrix",
        badge: "Compatibility",
        summary: "Verify zero dynamic shapes and 100% native operator support for Hailo-8 and TensorRT.",
        targetTab: "models",
        selectedModelId: "model-yolo-fp32",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [],
          runs: [],
          metaStatus: REPLAY_META_STATUS,
          compatibilityReport: REPLAY_COMPATIBILITY_REPORT,
          activeTab: "models",
          selectedModelId: "model-yolo-fp32",
        },
      },
      {
        id: "yolo-stage-2",
        scenarioId: "yolo-inspection",
        stageIndex: 2,
        title: "Dynamic Shape & Memory Diagnostics",
        badge: "Memory Diagnostics",
        summary: "Confirm zero dynamic axes to guarantee deterministic execution without NPU compiler fallback.",
        targetTab: "workbench",
        selectedModelId: "model-yolo-fp32",
        snapshot: {
          models: [REPLAY_MODELS[0]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [REPLAY_EXPERIMENTS[0]],
          runs: [REPLAY_RUNS[0]],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "workbench",
          selectedModelId: "model-yolo-fp32",
        },
      },
    ],
  },

  // 3. Hardware Silicon Benchmarking
  {
    id: "hardware-benchmarking",
    title: "Hardware Silicon Benchmarking",
    tagline: "Empirical profiling of latency P50/P95, throughput FPS, and power draw.",
    description: "Compare real-world performance on physical hardware: Intel Core i7, NVIDIA RTX 4060, Raspberry Pi 5 + Hailo-8 NPU, and Jetson Orin Nano.",
    iconName: "Cpu",
    category: "Benchmarking",
    stages: [
      {
        id: "hw-stage-0",
        scenarioId: "hardware-benchmarking",
        stageIndex: 0,
        title: "Silicon Inventory & Hardware Telemetry",
        badge: "Telemetry Discovery",
        summary: "Probing NVML, RAPL power counters, and VNNI vector instruction sets across all connected devices.",
        targetTab: "hardware",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [],
          runs: [],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "hardware",
        },
      },
      {
        id: "hw-stage-1",
        scenarioId: "hardware-benchmarking",
        stageIndex: 1,
        title: "Host CPU Baseline (AVX2 / VNNI)",
        badge: "CPU Profiling",
        summary: "Execute 500 timed runs on 20-core Intel i7: 0.84 ms median latency, 65 MB RSS memory.",
        targetTab: "workbench",
        selectedModelId: "model-yolo-fp32",
        selectedRunId: "run-cpu-fp32",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [REPLAY_EXPERIMENTS[0]],
          runs: [REPLAY_RUNS[0]],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "workbench",
          selectedModelId: "model-yolo-fp32",
          selectedRunId: "run-cpu-fp32",
        },
      },
      {
        id: "hw-stage-2",
        scenarioId: "hardware-benchmarking",
        stageIndex: 2,
        title: "Hailo-8 M.2 Edge NPU (8.2W TDP)",
        badge: "NPU Profiling",
        summary: "Execute benchmark on Hailo-8 dataflow architecture: 2.10 ms median, 476.2 FPS, 8.2W power draw.",
        targetTab: "workbench",
        selectedModelId: "model-yolo-int8",
        selectedRunId: "run-hailo-int8",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [REPLAY_EXPERIMENTS[0], REPLAY_EXPERIMENTS[2]],
          runs: [REPLAY_RUNS[0], REPLAY_RUNS[2]],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "workbench",
          selectedModelId: "model-yolo-int8",
          selectedRunId: "run-hailo-int8",
        },
      },
      {
        id: "hw-stage-3",
        scenarioId: "hardware-benchmarking",
        stageIndex: 3,
        title: "Jetson Orin Nano (TensorRT FP16)",
        badge: "Edge GPU Profiling",
        summary: "Profile Jetson Orin Nano: 1.45 ms latency, 689.6 FPS, 12.4W TDP, 1024 CUDA cores.",
        targetTab: "workbench",
        selectedModelId: "model-yolo-fp32",
        selectedRunId: "run-jetson-fp16",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "workbench",
          selectedModelId: "model-yolo-fp32",
          selectedRunId: "run-jetson-fp16",
        },
      },
    ],
  },

  // 4. Precision Optimization
  {
    id: "precision-optimization",
    title: "Precision Optimization (FP32 -> FP16 -> INT8)",
    tagline: "Dynamic and post-training quantization with automated mAP validation.",
    description: "Quantize weights and activations to INT8, profile memory reduction, and verify zero detection accuracy degradation.",
    iconName: "Sliders",
    category: "Optimization",
    stages: [
      {
        id: "prec-stage-0",
        scenarioId: "precision-optimization",
        stageIndex: 0,
        title: "FP32 Unquantized Baseline",
        badge: "FP32 Baseline",
        summary: "Baseline model footprint: 397 KB, mAP@50: 0.854, mAP@50:95: 0.612.",
        targetTab: "models",
        selectedModelId: "model-yolo-fp32",
        snapshot: {
          models: [REPLAY_MODELS[0]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [REPLAY_EXPERIMENTS[0]],
          runs: [REPLAY_RUNS[0]],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "models",
          selectedModelId: "model-yolo-fp32",
        },
      },
      {
        id: "prec-stage-1",
        scenarioId: "precision-optimization",
        stageIndex: 1,
        title: "INT8 Dynamic Quantization",
        badge: "Graph Quantization",
        summary: "Insert QuantizeLinear and DequantizeLinear operators; model shrinks to 104 KB (73.7% reduction).",
        targetTab: "workbench",
        selectedModelId: "model-yolo-int8",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [REPLAY_EXPERIMENTS[0]],
          runs: [REPLAY_RUNS[0]],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "workbench",
          selectedModelId: "model-yolo-int8",
        },
      },
      {
        id: "prec-stage-2",
        scenarioId: "precision-optimization",
        stageIndex: 2,
        title: "Validation Dataset Evaluation & mAP Verification",
        badge: "mAP Retention",
        summary: "Run 12-frame edge vision benchmark validation: 0.2% accuracy delta confirmed (99.8% retention).",
        targetTab: "workbench",
        selectedModelId: "model-yolo-int8",
        selectedRunId: "run-hailo-int8",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: [REPLAY_EXPERIMENTS[0], REPLAY_EXPERIMENTS[2]],
          runs: [REPLAY_RUNS[0], REPLAY_RUNS[2]],
          metaStatus: REPLAY_META_STATUS,
          activeTab: "workbench",
          selectedModelId: "model-yolo-int8",
          selectedRunId: "run-hailo-int8",
        },
      },
    ],
  },

  // 5. Hardware Comparison & Pareto Analysis
  {
    id: "hardware-comparison",
    title: "Hardware Comparison & Pareto Analysis",
    tagline: "Multi-device benchmark comparison matrix, throughput vs TDP, and Pareto frontier.",
    description: "Analyze trade-offs between throughput (FPS), P95 latency (ms), energy efficiency (FPS/Watt), and total hardware cost ($).",
    iconName: "GitCompare",
    category: "Pareto Analytics",
    stages: [
      {
        id: "comp-stage-0",
        scenarioId: "hardware-comparison",
        stageIndex: 0,
        title: "Multi-Device Comparison Matrix",
        badge: "Metrics Matrix",
        summary: "Compare Intel i7, RTX 4060, Raspberry Pi 5 + Hailo-8, and Jetson Orin Nano across 8 key metrics.",
        targetTab: "compare",
        selectedRunId: "run-cpu-fp32",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "compare",
          selectedRunId: "run-cpu-fp32",
        },
      },
      {
        id: "comp-stage-1",
        scenarioId: "hardware-comparison",
        stageIndex: 1,
        title: "Latency vs Accuracy Pareto Frontier",
        badge: "Pareto Frontier",
        summary: "Visualize non-dominated Pareto solutions balancing real-time robotics SLA vs detection accuracy.",
        targetTab: "compare",
        selectedRunId: "run-hailo-int8",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "compare",
          selectedRunId: "run-hailo-int8",
        },
      },
      {
        id: "comp-stage-2",
        scenarioId: "hardware-comparison",
        stageIndex: 2,
        title: "Energy Efficiency & Cost / FPS",
        badge: "Efficiency Index",
        summary: "Hailo-8 delivers 58.1 FPS/Watt at $160 unit cost, achieving top edge deployment efficiency.",
        targetTab: "compare",
        selectedRunId: "run-hailo-int8",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "compare",
          selectedRunId: "run-hailo-int8",
        },
      },
    ],
  },

  // 6. AI Engineer Autonomous Agent
  {
    id: "ai-engineer",
    title: "AI Engineer Autonomous Agent",
    tagline: "Autonomous edge deployment agent with observable multi-step tool execution.",
    description: "Watch Meta AI Engineer query hardware capabilities, run compatibility checks, perform Pareto frontier analysis, and synthesize optimal deployment recipes.",
    iconName: "Bot",
    category: "Autonomous Agent",
    stages: [
      {
        id: "agent-stage-0",
        scenarioId: "ai-engineer",
        stageIndex: 0,
        title: "Robotics Deployment SLA Prompt & Constraints",
        badge: "SLA Ingestion",
        summary: "User objective: latency <= 30ms, FPS >= 30, power <= 15W, budget <= $500 for autonomous drone payload.",
        targetTab: "agent",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "agent",
        },
      },
      {
        id: "agent-stage-1",
        scenarioId: "ai-engineer",
        stageIndex: 1,
        title: "Autonomous Tool Execution Trace",
        badge: "Tool Invocation",
        summary: "Agent calls inspect_model, list_hardware, query_benchmarks, and filter_pareto_candidates in real-time.",
        targetTab: "agent",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          agentResponse: {
            ...REPLAY_AGENT_RESPONSE,
            reply: "Analyzing model graph and querying connected hardware capabilities...",
            traces: REPLAY_AGENT_RESPONSE.traces.slice(0, 2),
          },
          activeTab: "agent",
        },
      },
      {
        id: "agent-stage-2",
        scenarioId: "ai-engineer",
        stageIndex: 2,
        title: "Pareto Optimization & Silicon Decision",
        badge: "Synthesis",
        summary: "Agent synthesizes winning recommendation: Raspberry Pi 5 + Hailo-8 M.2 (2.1ms latency, 8.2W TDP, $160).",
        targetTab: "agent",
        snapshot: {
          models: REPLAY_MODELS,
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          agentResponse: REPLAY_AGENT_RESPONSE,
          activeTab: "agent",
        },
      },
    ],
  },

  // 7. Deployment Bundling & Verification
  {
    id: "deployment-bundling",
    title: "Deployment Bundling & Verification",
    tagline: "Standalone C++ and Python deployment bundles with cryptographic integrity checks.",
    description: "Export self-contained deployment packages including ONNX models, runtime wrappers, test harnesses, and Docker recipes.",
    iconName: "Package",
    category: "Deployment",
    stages: [
      {
        id: "dep-stage-0",
        scenarioId: "deployment-bundling",
        stageIndex: 0,
        title: "Target Silicon Configuration",
        badge: "Export Target",
        summary: "Select Hailo-8 M.2 target with INT8 quantized Edge Tiny YOLO model and ONNX Runtime / HailoRT.",
        targetTab: "deployments",
        selectedModelId: "model-yolo-int8",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "deployments",
          selectedModelId: "model-yolo-int8",
        },
      },
      {
        id: "dep-stage-1",
        scenarioId: "deployment-bundling",
        stageIndex: 1,
        title: "Standalone Bundle Generation",
        badge: "Package Creation",
        summary: "Package infer.py, edge_tiny_yolo.onnx, model metadata, and Dockerfile into standalone ZIP.",
        targetTab: "deployments",
        selectedModelId: "model-yolo-int8",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "deployments",
          selectedModelId: "model-yolo-int8",
        },
      },
      {
        id: "dep-stage-2",
        scenarioId: "deployment-bundling",
        stageIndex: 2,
        title: "Cryptographic Verification & Smoke Test",
        badge: "Integrity Check",
        summary: "Verify SHA256 integrity, runtime dependency check, and simulated inference smoke test.",
        targetTab: "deployments",
        selectedModelId: "model-yolo-int8",
        snapshot: {
          models: [REPLAY_MODELS[0], REPLAY_MODELS[1]],
          hardware: REPLAY_HARDWARE,
          datasets: REPLAY_DATASETS,
          experiments: REPLAY_EXPERIMENTS,
          runs: REPLAY_RUNS,
          metaStatus: REPLAY_META_STATUS,
          activeTab: "deployments",
          selectedModelId: "model-yolo-int8",
        },
      },
    ],
  },
];
