import {
  ReplaySnapshot,
} from "./types";
import {
  REPLAY_MODELS,
  REPLAY_HARDWARE,
  REPLAY_DATASETS,
  REPLAY_RUNS,
  REPLAY_EXPERIMENTS,
  REPLAY_META_STATUS,
  REPLAY_PACKAGES,
  REPLAY_VERIFICATION_RESULT,
  REPLAY_REPORTS,
} from "./commonData";
import type {
  ModelRecord,
  HardwareDevice,
  DatasetRecord,
  Experiment,
  BenchmarkRun,
  MetaStatus,
  AgentResponse,
  CompatibilityReport,
} from "@/lib/api";

type SnapshotGetter = () => ReplaySnapshot | null;

let globalSnapshotGetter: SnapshotGetter | null = null;
let manualReplayActive = false;

/**
 * Register a getter function that returns the currently active replay snapshot from React state.
 */
export function registerReplaySnapshotGetter(getter: SnapshotGetter | null) {
  globalSnapshotGetter = getter;
}

/**
 * Explicitly toggle manual replay isolation if needed outside React context.
 */
export function setManualReplayActive(active: boolean) {
  manualReplayActive = active;
}

/**
 * Query whether Replay Mode is currently active and isolating backend traffic.
 */
export function isReplayActive(): boolean {
  if (manualReplayActive) return true;
  if (!globalSnapshotGetter) return false;
  const snap = globalSnapshotGetter();
  return snap !== null;
}

/**
 * Retrieve the active replay snapshot, or null if live mode.
 */
export function getActiveReplaySnapshot(): ReplaySnapshot | null {
  if (globalSnapshotGetter) {
    const snap = globalSnapshotGetter();
    if (snap) return snap;
  }
  return null;
}

/**
 * Synthetic API responders used by lib/api.ts when Replay Mode is active.
 */
export const replayApiHandlers = {
  getHealth: async () => ({
    status: "online",
    mode: "replay",
    message: "EdgeForge Replay Mode: Deterministic in-memory synthetic engine active",
    timestamp: new Date().toISOString(),
  }),

  getHardware: async (): Promise<HardwareDevice[]> => {
    const snap = getActiveReplaySnapshot();
    return snap?.hardware && snap.hardware.length > 0 ? snap.hardware : REPLAY_HARDWARE;
  },

  getModels: async (): Promise<ModelRecord[]> => {
    const snap = getActiveReplaySnapshot();
    return snap?.models && snap.models.length > 0 ? snap.models : REPLAY_MODELS;
  },

  getDatasets: async (): Promise<DatasetRecord[]> => {
    const snap = getActiveReplaySnapshot();
    return snap?.datasets && snap.datasets.length > 0 ? snap.datasets : REPLAY_DATASETS;
  },

  getExperiments: async (): Promise<Experiment[]> => {
    const snap = getActiveReplaySnapshot();
    return snap?.experiments && snap.experiments.length > 0 ? snap.experiments : REPLAY_EXPERIMENTS;
  },

  getExperiment: async (id: string): Promise<Experiment> => {
    const snap = getActiveReplaySnapshot();
    const list = snap?.experiments || REPLAY_EXPERIMENTS;
    const match = list.find((e) => e.id === id);
    if (match) return match;
    return list[0] || REPLAY_EXPERIMENTS[0];
  },

  getBenchmarkRuns: async (): Promise<BenchmarkRun[]> => {
    const snap = getActiveReplaySnapshot();
    return snap?.runs && snap.runs.length > 0 ? snap.runs : REPLAY_RUNS;
  },

  getMetaStatus: async (): Promise<MetaStatus> => {
    const snap = getActiveReplaySnapshot();
    return snap?.metaStatus || REPLAY_META_STATUS;
  },

  createExperiment: async (data: Record<string, unknown>): Promise<Experiment> => {
    const id = `exp-replay-${Date.now()}`;
    const modelId = String(data.model_id || "model-yolov8n-fp32");
    const hardwareId = String(data.hardware_id || "cpu-local");
    const precision = String(data.precision || "fp32");
    const runtime = String(data.runtime || "onnxruntime_cpu");

    return {
      id,
      name: `Benchmark Job (${precision.toUpperCase()} on ${hardwareId})`,
      model_id: modelId,
      dataset_id: String(data.dataset_id || "dataset-edge-val-12"),
      hardware_id: hardwareId,
      runtime,
      execution_provider: runtime === "tensorrt" ? "TensorrtExecutionProvider" : "CPUExecutionProvider",
      precision,
      batch_size: Number(data.batch_size || 1),
      iterations: Number(data.iterations || 100),
      warmup_iterations: Number(data.warmup_iterations || 10),
      status: "COMPLETED",
      progress: 100,
      logs: `[EdgeForge Replay Engine] Synchronous deterministic run complete.\n[Latency P50]: 0.84 ms\n[Throughput]: 1189.5 FPS`,
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      run: REPLAY_RUNS[0],
    };
  },

  runBenchmark: async (experimentId: string) => {
    const snap = getActiveReplaySnapshot();
    const run = snap?.workbenchTab?.latestRunResult || REPLAY_RUNS[0];
    return {
      status: "COMPLETED",
      experiment_id: experimentId,
      run_id: run.id,
      median_latency_ms: run.median_latency_ms,
      fps: run.fps,
      memory_rss_mb: run.memory_rss_mb,
      verified: true,
      mode: "synthetic_replay",
    };
  },

  compareRuns: async (runIds: string[]) => {
    const snap = getActiveReplaySnapshot();
    const allRuns = snap?.runs || REPLAY_RUNS;
    const selected = allRuns.filter((r) => runIds.includes(r.id));
    return {
      compared_runs: selected.length > 0 ? selected : allRuns.slice(0, 3),
      pareto_frontier: [
        { run_id: "run-yolo-jetson-nano-int8", reason: "Optimal latency-to-power efficiency under 15W" },
        { run_id: "run-yolo-rtx4060-int8", reason: "Absolute maximum throughput (4545 FPS)" },
        { run_id: "run-yolo-hailo8-int8", reason: "Ultra-low power efficiency (287 FPS/W at 2.4W)" },
      ],
    };
  },

  quantizeModel: async (data: { model_id: string; optimization_type: string }) => {
    const snap = getActiveReplaySnapshot();
    const quantized = snap?.models.find((m) => m.id === "model-yolov8n-int8") || REPLAY_MODELS[1];
    return {
      status: "COMPLETED",
      optimization_type: data.optimization_type,
      original_model_id: data.model_id,
      quantized_model: quantized,
      size_reduction_pct: 73.8,
      compression_ratio: 3.81,
      mAP50_regression: 0.0,
      verified: true,
    };
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chatWithAgent: async (_data: { message: string; model_id?: string }): Promise<AgentResponse> => {
    const snap = getActiveReplaySnapshot();
    const agentSnap = snap?.agentTab;

    return {
      session_id: agentSnap?.sessionId || "replay-session-meta-01",
      title: agentSnap?.sessionTitle || "Edge Robotics Deployment Sizing",
      mode: "REPLAY_SIMULATED_REASONING",
      reply:
        (agentSnap?.chatMessages && agentSnap.chatMessages.length > 0
          ? agentSnap.chatMessages[agentSnap.chatMessages.length - 1]?.content
          : null) ||
        "I analyzed the Pareto frontier across connected silicon. For edge robotics requiring <30ms latency, >30 FPS, and <60W power, **NVIDIA Jetson Orin Nano (8GB) with TensorRT INT8** is the Pareto winner with 4.12 ms latency (242.7 FPS) at only 11.8 Watts.",
      traces: agentSnap?.traces && agentSnap.traces.length > 0 ? agentSnap.traces : [],
    };
  },

  exportDeployment: async (modelId: string, runId: string) => {
    const snap = getActiveReplaySnapshot();
    const pkg = snap?.deploymentsTab?.packages?.[0] || REPLAY_PACKAGES[0];
    return {
      status: "SUCCESS",
      bundle_id: pkg.bundle_id,
      model_id: modelId,
      run_id: runId,
      download_url: pkg.download_url,
      files: pkg.files,
      manifest: snap?.deploymentsTab?.manifestJson || pkg.manifest,
    };
  },

  verifyDeployment: async (bundleId: string) => {
    const snap = getActiveReplaySnapshot();
    return snap?.deploymentsTab?.verificationResult || {
      ...REPLAY_VERIFICATION_RESULT,
      bundle_id: bundleId,
    };
  },

  fetchModelReport: async (modelId: string) => {
    const snap = getActiveReplaySnapshot();
    const report = snap?.reportsTab?.reports?.[0] || REPLAY_REPORTS[0];
    return {
      ...report,
      model_id: modelId,
    };
  },

  checkCompatibility: async (data: {
    model_id: string;
    hardware_id: string;
    runtime?: string;
    precision?: string;
  }): Promise<CompatibilityReport> => {
    const snap = getActiveReplaySnapshot();
    if (snap?.modelsTab?.compatibilityReport) {
      return snap.modelsTab.compatibilityReport;
    }

    const hw = (snap?.hardware || REPLAY_HARDWARE).find((h) => h.id === data.hardware_id);
    return {
      model_id: data.model_id,
      hardware_id: data.hardware_id,
      hardware_name: hw?.name || "Target Edge Silicon",
      runtime: data.runtime || "onnxruntime_cpu",
      precision: data.precision || "fp32",
      overall_status: "COMPATIBLE",
      errors_count: 0,
      warnings_count: 0,
      findings: [
        {
          category: "Operator Coverage",
          severity: "INFORMATION",
          message: "All 14 ONNX operator primitives (Conv, Relu, Add, Mul, Sigmoid, etc.) are natively supported.",
          remediation: "No graph partitioning or CPU fallback kernels required.",
          evidence: "100% layer acceleration mapped to hardware execution provider.",
        },
      ],
    };
  },

  fetchCompatibilityMatrix: async (modelId: string) => {
    const snap = getActiveReplaySnapshot();
    if (snap?.modelsTab?.compatibilityMatrix) {
      return snap.modelsTab.compatibilityMatrix;
    }
    return {
      model_id: modelId,
      model_name: "Edge Tiny YOLO (v8-nano style)",
      device_evaluations: [
        {
          hardware_id: "cpu-local",
          hardware_name: "Intel Core i7-14700HX",
          runtime: "onnxruntime_cpu",
          precision: "fp32",
          overall_status: "COMPATIBLE",
          findings: [],
        },
        {
          hardware_id: "nvidia-rtx4060-local",
          hardware_name: "NVIDIA RTX 4060 Laptop GPU",
          runtime: "tensorrt",
          precision: "fp16",
          overall_status: "COMPATIBLE",
          findings: [],
        },
        {
          hardware_id: "nvidia-jetson-orin-nano",
          hardware_name: "NVIDIA Jetson Orin Nano",
          runtime: "tensorrt",
          precision: "int8",
          overall_status: "COMPATIBLE",
          findings: [],
        },
        {
          hardware_id: "hailo-8-m2",
          hardware_name: "Hailo-8 M.2 Acceleration Module",
          runtime: "hailo_rt",
          precision: "int8",
          overall_status: "COMPATIBLE",
          findings: [],
        },
      ],
    };
  },
};
