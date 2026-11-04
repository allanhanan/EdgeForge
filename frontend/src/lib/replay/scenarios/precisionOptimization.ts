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
  },
};

export const precisionOptimizationScenario: ReplayScenario = {
  id: "precision-optimization",
  title: "Precision Optimization & INT8 Quantization",
  shortDescription:
    "Automate graph quantization from FP32 to INT8, calibrate against real validation frames, and verify precision retention with 0.0% mAP loss and 73.8% compression.",
  category: "optimization",
  badgeText: "Optimization • Quantization",
  iconName: "Sliders",
  durationSeconds: 45,
  tags: ["Quantization", "INT8", "Model Compression", "mAP Accuracy", "Calibration", "VNNI"],
  initialState: baseSnapshot,
  stages: [
    {
      id: "stage-opt-baseline",
      stageNumber: 1,
      title: "FP32 Baseline Assessment",
      subtitle: "Original Model Footprint: 397 KB • mAP@50: 0.854 • Latency: 0.84 ms",
      targetTab: "models",
      durationSeconds: 10,
      startTimeSeconds: 0,
      description:
        "Review the unquantized float32 baseline model. Before quantization, Edge Tiny YOLO requires 397 KB on disk and executes at 0.84 ms on Intel Core i7.",
      keyTakeaway:
        "Establishing an empirical baseline is vital to avoid quantization blindness and detect accuracy degradation.",
      actionCallout: "Auditing original FP32 baseline weight footprint and reference mAP scores.",
      snapshot: {
        ...baseSnapshot,
        modelsTab: {
          selectedModelId: "model-yolov8n-fp32",
        },
      },
      steps: [
        {
          id: "step-opt-base-1",
          stepNumber: 1,
          offsetSeconds: 0,
          label: "Audit Baseline Metrics",
          description: "Verified baseline FP32 size (397 KB) and detection precision (0.854 mAP@50).",
          actionType: "select_model",
          actionCallout: "Baseline reference verified.",
        },
      ],
    },
    {
      id: "stage-opt-quantize",
      stageNumber: 2,
      title: "Automated INT8 Graph Quantization",
      subtitle: "397 KB -> 104 KB (-73.8% Size Reduction • 3.81x Compression Ratio)",
      targetTab: "models",
      durationSeconds: 12,
      startTimeSeconds: 10,
      description:
        "Apply dynamic INT8 quantization. Convolution and linear weights are transformed to 8-bit integers (QDQ format), shrinking memory requirements to just 104 KB.",
      keyTakeaway:
        "73.8% reduction in memory footprint enables running multiple models concurrently in edge memory.",
      actionCallout: "Quantizing computational graph. Transforming float32 tensor weights into signed int8.",
      snapshot: {
        ...baseSnapshot,
        selectedModelId: "model-yolov8n-int8",
        modelsTab: {
          selectedModelId: "model-yolov8n-int8",
        },
      },
      steps: [
        {
          id: "step-opt-quant-1",
          stepNumber: 2,
          offsetSeconds: 0,
          label: "Trigger Quantization",
          description: "Initiated INT8 Dynamic Quantization pipeline on Edge Tiny YOLO.",
          actionType: "state_patch",
          actionCallout: "Generating QDQ integer operators.",
        },
        {
          id: "step-opt-quant-2",
          stepNumber: 3,
          offsetSeconds: 6,
          label: "Verify Compression Ratio",
          description: "Model footprint dropped from 397 KB to 104 KB (3.81x compression).",
          actionType: "select_model",
          actionCallout: "Weight footprint reduced by -73.8%.",
        },
      ],
    },
    {
      id: "stage-opt-calibration",
      stageNumber: 3,
      title: "Validation Dataset Calibration",
      subtitle: "12-Frame Edge Vision Validation Set • IoU Threshold 0.50 Evaluated",
      targetTab: "datasets",
      durationSeconds: 11,
      startTimeSeconds: 22,
      description:
        "Feed edge validation imagery through the quantized model. The computer vision evaluator computes bounding box IoUs and dynamic range histograms across classes.",
      keyTakeaway:
        "Calibration ensures tensor activation clipping thresholds preserve small drone and pedestrian bounding boxes.",
      actionCallout: "Executing validation inference loop on 12-frame edge test dataset.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "datasets",
        selectedDatasetId: "dataset-edge-val-12",
      },
      steps: [
        {
          id: "step-opt-calib-1",
          stepNumber: 4,
          offsetSeconds: 0,
          label: "Navigate to Datasets",
          description: "Selected Edge Vision Benchmark Val dataset (12 frames, 48 annotations).",
          actionType: "navigate",
          targetTab: "datasets",
          actionCallout: "Loading validation imagery and ground truth labels.",
        },
        {
          id: "step-opt-calib-2",
          stepNumber: 5,
          offsetSeconds: 5,
          label: "Run IoU Matching",
          description: "Matched predictions against ground truth bounding boxes across 4 classes.",
          actionType: "state_patch",
          actionCallout: "IoU matching passed with 0 misclassifications.",
        },
      ],
    },
    {
      id: "stage-opt-accuracy",
      stageNumber: 4,
      title: "Accuracy Retention & Throughput Verification",
      subtitle: "mAP@50: 0.854 (0.0% Regression) • 2.0x Throughput Speedup (2,380 FPS)",
      targetTab: "workbench",
      durationSeconds: 12,
      startTimeSeconds: 33,
      description:
        "Review final accuracy and execution metrics. The quantized INT8 model achieves identical 0.854 mAP@50 with zero accuracy regression, while throughput doubles to 2,380 FPS on VNNI cores.",
      keyTakeaway:
        "Quantization without compromise: double the speed, one-quarter the size, and zero accuracy loss.",
      actionCallout: "Quantization verified. Model is certified for production deployment.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "workbench",
        selectedModelId: "model-yolov8n-int8",
        workbenchTab: {
          selectedModelId: "model-yolov8n-int8",
          selectedHardwareId: "cpu-local",
          latestRunResult: REPLAY_RUNS[1],
        },
      },
      steps: [
        {
          id: "step-opt-acc-1",
          stepNumber: 6,
          offsetSeconds: 0,
          label: "Check mAP Retention",
          description: "mAP@50: 0.854, mAP@50:95: 0.612 — 0.0% accuracy degradation.",
          actionType: "complete_benchmark",
          actionCallout: "Accuracy retention verified.",
        },
        {
          id: "step-opt-acc-2",
          stepNumber: 7,
          offsetSeconds: 6,
          label: "Verify Integer Speedup",
          description: "Latency reduced from 0.84 ms to 0.42 ms (2.0x faster on Intel VNNI).",
          actionType: "state_patch",
          actionCallout: "INT8 speedup confirmed.",
        },
      ],
    },
  ],
  finalSummary: {
    headline: "INT8 Optimization & Accuracy Verification Complete",
    achievements: [
      "Compressed model footprint by 73.8% (397 KB down to 104 KB)",
      "Achieved 2.0x execution speedup on Intel VNNI cores (0.84 ms -> 0.42 ms)",
      "Verified 0.0% mAP@50 regression across 12-frame edge validation set",
      "Model registered and ready for edge silicon deployment",
    ],
    metricsAchieved: {
      latency: "0.42 ms (2x speedup)",
      fps: "2,380.0 FPS",
      compression: "3.81x (-73.8%)",
      power: "38.0 W",
      accuracy: "0.854 mAP@50 (100% retained)",
    },
    suggestedNextScenarios: ["hardware-comparison", "ai-engineer-workflow", "deployment-bundling"],
  },
};
