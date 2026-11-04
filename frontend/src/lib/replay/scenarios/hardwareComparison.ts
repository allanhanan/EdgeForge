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
  activeTab: "compare",
  isOnline: true,
  metaStatus: REPLAY_META_STATUS,
  models: REPLAY_MODELS,
  hardware: REPLAY_HARDWARE,
  datasets: REPLAY_DATASETS,
  experiments: REPLAY_EXPERIMENTS,
  runs: REPLAY_RUNS,
  compareTab: {
    selectedRunIds: [
      "run-yolo-i7-fp32",
      "run-yolo-i7-int8",
      "run-yolo-rtx4060-fp16",
      "run-yolo-rtx4060-int8",
      "run-yolo-jetson-nano-int8",
      "run-yolo-hailo8-int8",
      "run-yolo-rpi5-int8",
    ],
    scatterMetricX: "latency",
    scatterMetricY: "power",
    comparisonObjective: "edge_robotics",
  },
};

export const hardwareComparisonScenario: ReplayScenario = {
  id: "hardware-comparison",
  title: "Multi-Hardware Pareto Frontier Comparison",
  shortDescription:
    "Evaluate cross-silicon trade-offs across Intel i7, RTX 4060, Jetson Orin Nano, Hailo-8 M.2, and Raspberry Pi 5. Discover the mathematical Pareto non-dominated winners.",
  category: "comparison",
  badgeText: "Comparison • Pareto Frontier",
  iconName: "GitCompare",
  durationSeconds: 40,
  tags: ["Comparison", "Pareto Frontier", "FPS/Watt", "Cost Efficiency", "Multi-Silicon", "Jetson", "Hailo"],
  initialState: baseSnapshot,
  stages: [
    {
      id: "stage-comp-runs",
      stageNumber: 1,
      title: "Multi-Silicon Metric Ingestion",
      subtitle: "7 Candidate Configurations Across x86, CUDA, ARM Neon & Dataflow Architectures",
      targetTab: "compare",
      durationSeconds: 10,
      startTimeSeconds: 0,
      description:
        "Ingest verified benchmark runs across heterogeneous hardware: high-performance desktop workstation, discrete GPU, edge robotics SoC, low-power M.2 accelerator, and single-board computer.",
      keyTakeaway:
        "Direct normalization of latency, throughput, power, and thermal metrics across diverse silicon classes.",
      actionCallout: "Aggregating 7 benchmark runs into normalized comparison matrix.",
      snapshot: {
        ...baseSnapshot,
      },
      steps: [
        {
          id: "step-comp-runs-1",
          stepNumber: 1,
          offsetSeconds: 0,
          label: "Load Candidate Runs",
          description: "Selected 7 verified runs spanning 5 distinct silicon architectures.",
          actionType: "navigate",
          targetTab: "compare",
          actionCallout: "Ingesting benchmark runs.",
        },
      ],
    },
    {
      id: "stage-comp-scatter",
      stageNumber: 2,
      title: "Multi-Dimensional Trade-Off Scatter Plot",
      subtitle: "X: Median Latency (ms) vs Y: Package Power Draw (Watts)",
      targetTab: "compare",
      durationSeconds: 10,
      startTimeSeconds: 10,
      description:
        "Plot latency versus power draw. Observe the extreme efficiency cluster: Hailo-8 (1.45 ms @ 2.4W) and Jetson Orin Nano (4.12 ms @ 11.8W) versus high-power desktop silicon.",
      keyTakeaway:
        "Edge hardware achieves within 4x of desktop latency while consuming 10x–28x less power.",
      actionCallout: "Plotting non-dominated frontier boundary in Latency vs Power space.",
      snapshot: {
        ...baseSnapshot,
        compareTab: {
          ...baseSnapshot.compareTab!,
          scatterMetricX: "latency",
          scatterMetricY: "power",
        },
      },
      steps: [
        {
          id: "step-comp-scatter-1",
          stepNumber: 2,
          offsetSeconds: 0,
          label: "Analyze Scatter Chart",
          description: "Plotted Latency (0.22ms – 19.8ms) vs Power (2.4W – 68.0W).",
          actionType: "state_patch",
          actionCallout: "Identifying non-dominated frontier points.",
        },
      ],
    },
    {
      id: "stage-comp-table",
      stageNumber: 3,
      title: "Side-by-Side Efficiency Metrics Table",
      subtitle: "FPS/Watt Efficiency • Cost per FPS ($/FPS) • Memory Footprint Comparison",
      targetTab: "compare",
      durationSeconds: 10,
      startTimeSeconds: 20,
      description:
        "Review normalized efficiency ratios. Hailo-8 delivers 287.3 FPS/Watt, while RTX 4060 delivers maximum raw throughput at 4,545 FPS. Raspberry Pi 5 provides entry-level viability at $1.58/FPS.",
      keyTakeaway:
        "No single hardware wins on every axis: choice depends on whether battery budget, unit cost, or peak throughput dominates.",
      actionCallout: "Sorting delta table by energy efficiency (FPS per Watt).",
      snapshot: {
        ...baseSnapshot,
      },
      steps: [
        {
          id: "step-comp-table-1",
          stepNumber: 3,
          offsetSeconds: 0,
          label: "Inspect FPS/Watt Delta",
          description: "Hailo-8 M.2 tops energy efficiency with 287.3 FPS/W at 2.4W.",
          actionType: "state_patch",
          actionCallout: "Hailo-8 verified highest energy efficiency.",
        },
      ],
    },
    {
      id: "stage-comp-pareto",
      stageNumber: 4,
      title: "Mathematical Pareto Frontier Winners",
      subtitle: "Robotics Winner: Jetson Orin Nano • Pure Efficiency Winner: Hailo-8 M.2",
      targetTab: "compare",
      durationSeconds: 10,
      startTimeSeconds: 30,
      description:
        "Select the Pareto non-dominated winners. For edge robotics requiring sub-10ms latency and sub-15W power, NVIDIA Jetson Orin Nano INT8 (4.12 ms @ 11.8W) dominates all alternatives.",
      keyTakeaway:
        "EdgeForge's Pareto engine eliminates dominated configurations and provides rigorous mathematical justifications.",
      actionCallout: "Highlighting Pareto winner: NVIDIA Jetson Orin Nano (8GB) INT8.",
      snapshot: {
        ...baseSnapshot,
        compareTab: {
          ...baseSnapshot.compareTab!,
          highlightWinnerId: "run-yolo-jetson-nano-int8",
        },
      },
      steps: [
        {
          id: "step-comp-pareto-1",
          stepNumber: 4,
          offsetSeconds: 0,
          label: "Select Non-Dominated Winner",
          description: "Jetson Orin Nano INT8 marked as optimal candidate for edge robotics mission.",
          actionType: "state_patch",
          actionCallout: "Pareto winner confirmed.",
        },
      ],
    },
  ],
  finalSummary: {
    headline: "Pareto Frontier Multi-Hardware Evaluation Complete",
    achievements: [
      "Evaluated 7 configurations across x86, CUDA, ARM Neon, and dataflow silicon",
      "Proved Hailo-8 M.2 delivers highest efficiency: 287.3 FPS/Watt at 2.4W",
      "Identified NVIDIA Jetson Orin Nano INT8 as non-dominated winner for edge robotics (<15W)",
      "Eliminated 3 dominated configurations exceeding latency or thermal limits",
    ],
    metricsAchieved: {
      latency: "4.12 ms (Jetson) / 1.45 ms (Hailo-8)",
      fps: "242.7 FPS (Jetson) / 689.6 FPS (Hailo-8)",
      compression: "3.81x INT8",
      power: "11.8 W (Jetson) / 2.4 W (Hailo-8)",
      accuracy: "0.852 mAP@50",
    },
    suggestedNextScenarios: ["ai-engineer-workflow", "deployment-bundling", "featured-end-to-end"],
  },
};
