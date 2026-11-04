import { ReplayScenario, ReplaySnapshot } from "../types";
import {
  REPLAY_MODELS,
  REPLAY_HARDWARE,
  REPLAY_DATASETS,
  REPLAY_RUNS,
  REPLAY_EXPERIMENTS,
  REPLAY_META_STATUS,
} from "../commonData";

const baseSnapshot: ReplaySnapshot = {
  activeTab: "models",
  isOnline: true,
  metaStatus: REPLAY_META_STATUS,
  models: REPLAY_MODELS,
  hardware: REPLAY_HARDWARE,
  datasets: REPLAY_DATASETS,
  experiments: REPLAY_EXPERIMENTS,
  runs: REPLAY_RUNS,
  selectedModelId: "model-yolov8n-fp32",
  modelsTab: {
    selectedModelId: "model-yolov8n-fp32",
    graphModalOpen: false,
    searchFilter: "",
  },
};

export const yoloInspectionScenario: ReplayScenario = {
  id: "yolo-inspection",
  title: "YOLO ONNX Graph & Architecture Inspection",
  shortDescription:
    "Deep dive into the Edge Tiny YOLO architecture: tensor shapes, operator distribution, execution provider mappings, and memory bandwidth bounds.",
  category: "inspection",
  badgeText: "Inspection • Architecture",
  iconName: "Layers",
  durationSeconds: 40,
  tags: ["ONNX", "Graph", "YOLOv8", "Operator Analysis", "Memory Footprint"],
  initialState: baseSnapshot,
  stages: [
    {
      id: "stage-yolo-meta",
      stageNumber: 1,
      title: "Model Topology & Tensor Dimensions",
      subtitle: "Input: [1, 3, 640, 640] float32 • Output: [1, 84, 8400] float32",
      targetTab: "models",
      durationSeconds: 10,
      startTimeSeconds: 0,
      description:
        "Inspect the structural metadata of Edge Tiny YOLO. Confirm 640x640 RGB spatial dimensions and 8,400 bounding box candidates across 80 COCO classes.",
      keyTakeaway:
        "The model uses standard static tensor shapes ideal for edge acceleration and zero-copy pinned memory allocation.",
      actionCallout: "Verifying model header, opset version 17, and tensor input/output definitions.",
      snapshot: {
        ...baseSnapshot,
        modelsTab: {
          selectedModelId: "model-yolov8n-fp32",
          graphModalOpen: false,
        },
      },
      steps: [
        {
          id: "step-yolo-meta-1",
          stepNumber: 1,
          offsetSeconds: 0,
          label: "Select Edge Tiny YOLO",
          description: "Opened model details view for edge_tiny_yolo.onnx.",
          actionType: "select_model",
          actionCallout: "Inspecting 397 KB ONNX weight container.",
        },
        {
          id: "step-yolo-meta-2",
          stepNumber: 2,
          offsetSeconds: 5,
          label: "Verify Tensor Signatures",
          description: "Confirmed Input 'images' [1, 3, 640, 640] and Output 'output0' [1, 84, 8400].",
          actionType: "state_patch",
          actionCallout: "Static shape confirmed: zero dynamic dimension re-allocations.",
        },
      ],
    },
    {
      id: "stage-yolo-operators",
      stageNumber: 2,
      title: "Operator Frequency & Layer Decomposition",
      subtitle: "32 Conv, 18 Relu, 8 Add, 6 Mul, 4 Sigmoid, 8 Reshape • 88 Nodes Total",
      targetTab: "models",
      durationSeconds: 10,
      startTimeSeconds: 10,
      description:
        "Analyze the operator frequency histogram. 100% of computational FLOPS reside in standard Conv2D, Add, and ReLU primitives, guaranteeing high hardware acceleration efficiency.",
      keyTakeaway:
        "Zero custom or unsupported operators. Perfectly aligned with vendor NPU and GPU compiler pass optimizations.",
      actionCallout: "Opening computational graph inspector to review node-by-node execution flow.",
      snapshot: {
        ...baseSnapshot,
        modelsTab: {
          selectedModelId: "model-yolov8n-fp32",
          graphModalOpen: true,
        },
      },
      steps: [
        {
          id: "step-yolo-op-1",
          stepNumber: 3,
          offsetSeconds: 0,
          label: "Open Graph Inspector",
          description: "Visualized the complete computational DAG from input to bounding box heads.",
          actionType: "select_model",
          actionCallout: "Viewing topological operator sequence.",
        },
        {
          id: "step-yolo-op-2",
          stepNumber: 4,
          offsetSeconds: 5,
          label: "Filter Convolution Layers",
          description: "Audited 32 Conv kernels: 3x3 depthwise and 1x1 pointwise projections.",
          actionType: "state_patch",
          actionCallout: "Convolution layers mapped to fused GEMM execution providers.",
        },
      ],
    },
    {
      id: "stage-yolo-compatibility",
      stageNumber: 3,
      title: "Multi-Silicon Runtime Compatibility Matrix",
      subtitle: "100% Native Acceleration on Intel AVX2, NVIDIA TensorRT & Hailo Dataflow",
      targetTab: "models",
      durationSeconds: 10,
      startTimeSeconds: 20,
      description:
        "Audit the hardware compatibility matrix. Verify that no layers fall back to software emulation or CPU partitioning on target edge platforms.",
      keyTakeaway:
        "Full hardware execution provider coverage guarantees zero host-to-device kernel ping-pong overhead.",
      actionCallout: "Querying compatibility engine for target execution provider mappings.",
      snapshot: {
        ...baseSnapshot,
        modelsTab: {
          selectedModelId: "model-yolov8n-fp32",
          graphModalOpen: true,
          compatibilityMatrix: {
            model_id: "model-yolov8n-fp32",
            supported_targets: [
              { hardware: "Intel Core i7", runtime: "OpenVINO / CPU", status: "COMPATIBLE", coverage: "100%" },
              { hardware: "NVIDIA RTX 4060", runtime: "TensorRT", status: "COMPATIBLE", coverage: "100%" },
              { hardware: "NVIDIA Jetson Orin", runtime: "TensorRT", status: "COMPATIBLE", coverage: "100%" },
              { hardware: "Hailo-8 M.2", runtime: "HailoRT", status: "COMPATIBLE", coverage: "100%" },
            ],
          },
        },
      },
      steps: [
        {
          id: "step-yolo-compat-1",
          stepNumber: 5,
          offsetSeconds: 0,
          label: "Inspect Target Runtimes",
          description: "Verified ONNX Runtime, TensorRT, and Hailo Dataflow compiler compatibility.",
          actionType: "select_hardware",
          actionCallout: "Evaluating silicon execution providers.",
        },
        {
          id: "step-yolo-compat-2",
          stepNumber: 6,
          offsetSeconds: 5,
          label: "Confirm Zero Fallbacks",
          description: "All 88 layers scheduled on hardware accelerators without CPU fallback traps.",
          actionType: "state_patch",
          actionCallout: "Zero CPU fallback confirmed.",
        },
      ],
    },
    {
      id: "stage-yolo-memory",
      stageNumber: 4,
      title: "Memory Footprint & Peak Activation Buffers",
      subtitle: "Model Weights: 397 KB • Peak Activation Tensor: 28.4 MB • Zero Copy Verified",
      targetTab: "models",
      durationSeconds: 10,
      startTimeSeconds: 30,
      description:
        "Examine memory residency requirements. Peak intermediate feature activation memory requires only 28.4 MB, allowing execution on severely constrained microcontroller or edge NPU SRAM.",
      keyTakeaway:
        "Extremely lean memory requirements ensure compatibility with 2GB–8GB edge devices without risking Linux OOM kills.",
      actionCallout: "Analyzing memory buffer allocation and intermediate activation sizes.",
      snapshot: {
        ...baseSnapshot,
        modelsTab: {
          selectedModelId: "model-yolov8n-fp32",
          graphModalOpen: false,
        },
      },
      steps: [
        {
          id: "step-yolo-mem-1",
          stepNumber: 7,
          offsetSeconds: 0,
          label: "Inspect Activation Memory",
          description: "Largest intermediate tensor: 1x64x160x160 (6.55 MB). Total peak memory: 28.4 MB.",
          actionType: "state_patch",
          actionCallout: "Intermediate tensor memory footprint verified.",
        },
        {
          id: "step-yolo-mem-2",
          stepNumber: 8,
          offsetSeconds: 5,
          label: "Summary Inspection Report",
          description: "Model certified clean: 0 warnings, 0 unsupported ops, 100% edge ready.",
          actionType: "navigate",
          actionCallout: "YOLO inspection complete.",
        },
      ],
    },
  ],
  finalSummary: {
    headline: "YOLO Model Inspection & Graph Verification Complete",
    achievements: [
      "Confirmed static input shapes [1, 3, 640, 640] and output grid [1, 84, 8400]",
      "Audited all 88 computational nodes: 100% mapped to hardware execution providers",
      "Verified zero proprietary operators across x86, CUDA, and Hailo silicon targets",
      "Determined peak activation tensor memory bound at 28.4 MB",
    ],
    metricsAchieved: {
      latency: "0.84 ms baseline",
      fps: "1,189.5 FPS",
      compression: "N/A (FP32 baseline)",
      power: "42.0 W baseline",
      accuracy: "0.854 mAP@50",
    },
    suggestedNextScenarios: ["hardware-benchmarking", "precision-optimization", "featured-end-to-end"],
  },
};
