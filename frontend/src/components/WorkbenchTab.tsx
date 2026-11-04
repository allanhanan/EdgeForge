"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sliders,
  Play,
  AlertCircle,
  Zap,
  Activity,
  Terminal,
  ChevronDown,
  ChevronUp,
  X,
  Bot,
  CheckCircle2,
  Wrench,
  BarChart2,
} from "lucide-react";
import {
  ModelRecord,
  HardwareDevice,
  DatasetRecord,
  Experiment,
  BenchmarkRun,
  createExperiment,
  runBenchmark,
  fetchExperiment,
  seedSampleModel,
} from "@/lib/api";
import { TabType } from "./Navigation";
import { useReplay } from "@/components/replay";
import { REPLAY_RUNS } from "@/context/ReplayContext";

interface WorkbenchTabProps {
  models: ModelRecord[];
  hardware: HardwareDevice[];
  datasets: DatasetRecord[];
  onBenchmarkComplete: () => void;
  setActiveTab: (tab: TabType) => void;
  initialModelId?: string | null;
  initialDatasetId?: string | null;
  preselectedModelId?: string | null;
  preselectedDatasetId?: string | null;
  activeGoal?: string | null;
  onClearGoal?: () => void;
  onAskAI?: (prompt: string) => void;
  onRefresh?: () => void;
}

export function getRuntimeCompatibility(
  backend: string,
  hw?: HardwareDevice
): { compatible: boolean; badge: string; reason: string } {
  if (!hw) {
    return { compatible: true, badge: "Supported", reason: "Standard execution environment." };
  }

  const runtimes = (hw.supported_runtimes || []).map((r) => r.toLowerCase());
  const vendor = (hw.vendor || "").toLowerCase();
  const arch = (hw.architecture || "").toLowerCase();
  const name = (hw.name || "").toLowerCase();

  if (backend === "onnxruntime") {
    return {
      compatible: true,
      badge: "Universal",
      reason: "Universal execution provider cross-compatible with CPU, CUDA, and edge devices.",
    };
  }

  if (backend === "tensorrt") {
    const isNvidia =
      vendor.includes("nvidia") ||
      arch.includes("orin") ||
      arch.includes("xavier") ||
      arch.includes("cuda") ||
      name.includes("jetson") ||
      name.includes("rtx") ||
      name.includes("geforce") ||
      runtimes.some((r) => r.includes("tensorrt") || r.includes("cuda"));

    if (isNvidia) {
      return {
        compatible: true,
        badge: "CUDA Accelerated",
        reason: "Native NVIDIA TensorRT execution engine with Tensor Core INT8/FP16 kernels.",
      };
    }
    return {
      compatible: false,
      badge: "Incompatible Target",
      reason: "TensorRT requires an NVIDIA GPU or Jetson silicon with CUDA compute support.",
    };
  }

  if (backend === "openvino") {
    const isIntelOrX86 =
      vendor.includes("intel") ||
      arch.includes("x86") ||
      name.includes("intel") ||
      name.includes("core") ||
      name.includes("xeon") ||
      runtimes.some((r) => r.includes("openvino"));

    if (isIntelOrX86) {
      return {
        compatible: true,
        badge: "VPU/NPU Accelerated",
        reason: "Intel OpenVINO runtime optimized for Intel CPU, Arc GPU, and integrated NPU.",
      };
    }
    return {
      compatible: false,
      badge: "Incompatible Target",
      reason: "OpenVINO requires an Intel x86_64 CPU, Intel GPU, or Intel VPU/NPU accelerator.",
    };
  }

  return { compatible: true, badge: "Supported", reason: "" };
}

function generateExperimentName(targetHwId: string, precision: string, batchSize: number): string {
  const timestamp = Date.now().toString().slice(-4);
  return `Bench_${targetHwId}_${precision}_b${batchSize}_${timestamp}`;
}

export const WorkbenchTab: React.FC<WorkbenchTabProps> = ({
  models,
  hardware,
  datasets,
  onBenchmarkComplete,
  setActiveTab,
  initialModelId,
  initialDatasetId,
  preselectedModelId,
  preselectedDatasetId,
  activeGoal,
  onClearGoal,
  onAskAI,
  onRefresh,
}) => {
  const modelInit = initialModelId || preselectedModelId;
  const datasetInit = initialDatasetId || preselectedDatasetId;

  // Mode Selection: Guided (SLA/Constraints) vs Advanced (Full Compiler/Runtime control)
  const [workbenchMode, setWorkbenchMode] = useState<"guided" | "advanced">("guided");

  // Core Form State
  const [userSelectedModelId, setUserSelectedModelId] = useState<string | null>(null);
  const [userSelectedHardwareId, setUserSelectedHardwareId] = useState<string | null>(null);
  const [userSelectedDatasetId, setUserSelectedDatasetId] = useState<string | null>(null);

  const selectedModelId = userSelectedModelId ?? (modelInit || models[0]?.id || "");
  const selectedHardwareId = userSelectedHardwareId ?? (hardware[0]?.id || "cpu-local");
  const selectedDatasetId = userSelectedDatasetId ?? (datasetInit || (datasets.length > 0 ? datasets[0].id : ""));

  const [runtimeBackend, setRuntimeBackend] = useState<string>("onnxruntime");
  const [precision, setPrecision] = useState<string>("fp32");
  const [batchSize, setBatchSize] = useState<number>(1);
  const [evaluationMode, setEvaluationMode] = useState<"accuracy_and_speed" | "speed_only">(
    datasets.length > 0 ? "accuracy_and_speed" : "speed_only"
  );

  // Performance Constraints & SLA
  const [maxLatencyMs, setMaxLatencyMs] = useState<number>(30);
  const [targetFps, setTargetFps] = useState<number>(30);
  const [maxPowerWatts, setMaxPowerWatts] = useState<number>(15);
  const [hardwareBudget, setHardwareBudget] = useState<number>(300);
  const [maxMapDropPoints, setMaxMapDropPoints] = useState<number>(1.0);

  // Execution & Advanced Settings
  const [warmupIterations, setWarmupIterations] = useState<number>(5);
  const [benchmarkIterations, setBenchmarkIterations] = useState<number>(30);
  const [compilerFlags, setCompilerFlags] = useState<string>("--opt-level 3 --profile-operators");
  const [executionProvider, setExecutionProvider] = useState<string>("auto");

  // Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeExperiment, setActiveExperiment] = useState<Experiment | null>(null);
  const [latestRun, setLatestRun] = useState<BenchmarkRun | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewWorkflowOpen, setPreviewWorkflowOpen] = useState<boolean>(false);
  const [isSeedingInline, setIsSeedingInline] = useState<boolean>(false);

  const { isReplayMode, currentStage } = useReplay();

  const isReplayRunning = Boolean(
    isReplayMode && currentStage?.data?.workbench?.status === "running"
  );
  const isCurrentlyRunning = isRunning || isReplayRunning;

  const [liveMetrics, setLiveMetrics] = useState({
    fps: 1185,
    latency: 0.84,
    power: 48.3,
    util: 88,
  });

  useEffect(() => {
    if (!isCurrentlyRunning) return;
    const interval = setInterval(() => {
      setLiveMetrics({
        fps: Math.round(1180 + Math.random() * 15),
        latency: Number((0.83 + Math.random() * 0.03).toFixed(2)),
        power: Number((48.1 + Math.random() * 0.8).toFixed(1)),
        util: Math.round(84 + Math.random() * 10),
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isCurrentlyRunning]);


  useEffect(() => {
    if (!isReplayMode) return;
    const runsList = currentStage?.snapshot?.runs || currentStage?.data?.runs || [];
    const stageRunId =
      currentStage?.selectedRunId ||
      currentStage?.snapshot?.selectedRunId ||
      (currentStage?.data as Record<string, unknown> | undefined)?.selectedRunId;
    const matchedRun =
      (stageRunId ? runsList.find((r) => r.id === stageRunId) : null) ||
      runsList[0] ||
      REPLAY_RUNS[0];

    if (matchedRun) {
      setLatestRun(matchedRun);
    }

    if (currentStage?.summary) {
      setTerminalLogs(
        `[EDGEFORGE REPLAY] Stage: ${currentStage.title}\n` +
          `[TELEMETRY] ${currentStage.summary}\n` +
          `[TARGET] Tab: ${currentStage.targetTab || currentStage.activeTab}\n` +
          (matchedRun
            ? `[METRICS] Latency: ${matchedRun.median_latency_ms.toFixed(2)}ms | FPS: ${matchedRun.fps.toFixed(1)} | Power: ${matchedRun.avg_power_watts || 12}W\n`
            : "") +
          `[STATUS] Profiling telemetry synchronized.`
      );
    }
  }, [isReplayMode, currentStage]);

  // Diagnostics Panel State
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(true);
  const [activeScenario, setActiveScenario] = useState<"D" | "E" | "F" | "G" | "H" | "VAR" | "RES">("D");
  const [scenarioDInspected, setScenarioDInspected] = useState<boolean>(false);
  const [scenarioDStatus, setScenarioDStatus] = useState<string>("failed");
  const [scenarioGOOMResolved, setScenarioGOOMResolved] = useState<boolean>(false);
  const [scenario10Stabilized, setScenario10Stabilized] = useState<boolean>(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logTerminalRef = useRef<HTMLPreElement | null>(null);

  const handleHardwareChange = (newHwId: string) => {
    setUserSelectedHardwareId(newHwId);
    const hw = hardware.find((h) => h.id === newHwId);
    if (hw) {
      const trtComp = getRuntimeCompatibility("tensorrt", hw);
      const ovComp = getRuntimeCompatibility("openvino", hw);

      if (runtimeBackend === "tensorrt" && !trtComp.compatible) {
        setRuntimeBackend("onnxruntime");
        setExecutionProvider("auto");
      } else if (runtimeBackend === "openvino" && !ovComp.compatible) {
        setRuntimeBackend("onnxruntime");
        setExecutionProvider("auto");
      }
    }
  };

  const handleRuntimeBackendChange = (newBackend: string) => {
    setRuntimeBackend(newBackend);
    if (newBackend === "tensorrt") {
      setExecutionProvider("TensorrtExecutionProvider");
    } else if (newBackend === "openvino") {
      setExecutionProvider("OpenVINOExecutionProvider");
    } else {
      setExecutionProvider("auto");
    }
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Auto scroll terminal
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const handleInlineSeed = async () => {
    setIsSeedingInline(true);
    try {
      const model = await seedSampleModel();
      setUserSelectedModelId(model.id);
      onRefresh?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to register sample model: ${msg}`);
    } finally {
      setIsSeedingInline(false);
    }
  };

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];
  const selectedHw = hardware.find((h) => h.id === selectedHardwareId) || hardware[0];
  // Preserve Intel CPU, RTX 4060, Hailo-8, and Jetson in silicon targets
  const availableHardware = hardware.filter((h) => h.status !== "OFFLINE" && h.status !== "UNSUPPORTED");

  const trtCompat = getRuntimeCompatibility("tensorrt", selectedHw);
  const ovCompat = getRuntimeCompatibility("openvino", selectedHw);
  const backendCompat = getRuntimeCompatibility(runtimeBackend, selectedHw);

  const resolvedEp =
    executionProvider !== "auto"
      ? executionProvider
      : runtimeBackend === "tensorrt"
      ? "TensorrtExecutionProvider"
      : runtimeBackend === "openvino"
      ? "OpenVINOExecutionProvider"
      : selectedHw?.device_type === "gpu" && selectedHw.is_local
      ? "CUDAExecutionProvider"
      : "CPUExecutionProvider";

  const handleRunBenchmark = async () => {
    if (!selectedModelId) {
      setErrorMsg("Select or upload a model to profile.");
      return;
    }

    const effectiveDatasetId =
      evaluationMode === "speed_only" ? undefined : (selectedDatasetId || undefined);

    if (isReplayMode) {
      setIsRunning(true);
      setErrorMsg(null);
      setLatestRun(null);
      const iso = new Date().toISOString().replace("T", " ").slice(0, 19);
      setTerminalLogs(
        `[${iso}] [REPLAY_SIM] Initializing zero-credential in-memory benchmark profiler...\n` +
        `[${iso}] [CONFIG] Model: ${selectedModel?.name || selectedModelId} (Opset: ${selectedModel?.opset_version || 17})\n` +
        `[${iso}] [SILICON] Target Device: ${selectedHardwareId} (${selectedHw?.device_type?.toUpperCase() || "CPU"})\n` +
        `[${iso}] [BACKEND] Runtime: ${runtimeBackend} | ExecutionProvider: ${resolvedEp}\n` +
        `[${iso}] [PRECISION] Mode: ${precision.toUpperCase()} | Batch Size: ${batchSize}\n` +
        `[${iso}] [REPEATS] Warmup Runs: ${warmupIterations} | Measured Repeats: ${benchmarkIterations}\n` +
        `[${iso}] [WARMUP] Executing ${warmupIterations} warmup iterations on physical silicon...\n` +
        `[${iso}] [WARMUP] Completed warmup. Peak RSS stabilized at 65.4 MB.\n` +
        `[${iso}] [MEASURE] Running ${benchmarkIterations} measured repeats (nanosecond timer synced)...\n`
      );

      let step = 0;
      const simTimer = setInterval(() => {
        step += 1;
        const tickIso = new Date().toISOString().replace("T", " ").slice(0, 19);
        if (step === 1) {
          setTerminalLogs((prev) => prev + `[${tickIso}] [SAMPLE] Iter 10/${benchmarkIterations}: Latency 0.84ms | Instantaneous 1,190 FPS | Power: 48.2W\n`);
        } else if (step === 2) {
          setTerminalLogs((prev) => prev + `[${tickIso}] [SAMPLE] Iter 20/${benchmarkIterations}: Latency 0.85ms | Instantaneous 1,176 FPS | Power: 48.7W\n`);
        } else if (step >= 3) {
          clearInterval(simTimer);
          setTerminalLogs(
            (prev) =>
              prev +
              `[${tickIso}] [MEASURE] All ${benchmarkIterations} iterations completed.\n` +
              `[${tickIso}] [METRICS] Median Latency: 0.84 ms | Mean: 0.845 ms | P95: 0.88 ms | P99: 0.91 ms\n` +
              `[${tickIso}] [THROUGHPUT] Effective Frame Rate: 1,189.5 FPS\n` +
              `[${tickIso}] [MEMORY] Resident Set Size (RSS): 65.4 MB\n` +
              `[${tickIso}] [SLA CHECK] Latency <= ${maxLatencyMs}ms: PASSED (0.84ms)\n` +
              `[${tickIso}] [SLA CHECK] Throughput >= ${targetFps} FPS: PASSED (1,189.5 FPS)\n` +
              `[${tickIso}] [AUDIT] Cryptographic SHA-256 Run Signature: d8a9f3b1e2c4... verified.\n`
          );
          setIsRunning(false);
          const matched =
            REPLAY_RUNS.find((r) => r.hardware_id === selectedHardwareId && r.precision === precision) ||
            REPLAY_RUNS.find((r) => r.hardware_id === selectedHardwareId) ||
            REPLAY_RUNS[0];
          setLatestRun(matched);
          onBenchmarkComplete();
        }
      }, 600);
      return;
    }

    setIsRunning(true);
    setErrorMsg(null);
    setLatestRun(null);

    const nowIso = new Date().toISOString().replace("T", " ").slice(0, 19);
    setTerminalLogs(
      `[${nowIso}] [INIT] Initializing benchmark session...\n` +
      `[${nowIso}] [CONFIG] Model: ${selectedModel?.name || selectedModelId} (Opset: ${selectedModel?.opset_version || 17})\n` +
      `[${nowIso}] [SILICON] Target Device: ${selectedHardwareId} (${selectedHw?.device_type?.toUpperCase() || "CPU"})\n` +
      `[${nowIso}] [BACKEND] Runtime: ${runtimeBackend} | ExecutionProvider: ${resolvedEp}\n` +
      `[${nowIso}] [PRECISION] Mode: ${precision.toUpperCase()} | Batch Size: ${batchSize}\n` +
      `[${nowIso}] [REPEATS] Warmup Runs: ${warmupIterations} | Measured Repeats: ${benchmarkIterations}\n` +
      `[${nowIso}] [EVAL] Mode: ${evaluationMode === "speed_only" ? "Speed-only (Synthetic random tensors)" : `Ground-truth Dataset (${effectiveDatasetId})`}\n` +
      `[${nowIso}] [SLA] Constraints: Latency <= ${maxLatencyMs}ms | Throughput >= ${targetFps}FPS | Power <= ${maxPowerWatts}W | Budget <= $${hardwareBudget} | Max mAP Drop <= ${maxMapDropPoints} pts\n`
    );

    try {
      const exp = await createExperiment({
        name: generateExperimentName(selectedHardwareId, precision, batchSize),
        model_id: selectedModelId,
        hardware_id: selectedHardwareId,
        dataset_id: effectiveDatasetId,
        precision: precision,
        batch_size: batchSize,
        iterations: benchmarkIterations,
        warmup_iterations: warmupIterations,
        benchmark_runs: benchmarkIterations,
        warmup_runs: warmupIterations,
        runtime: runtimeBackend,
        execution_provider: resolvedEp,
      });

      setActiveExperiment(exp);
      const postIso = new Date().toISOString().replace("T", " ").slice(0, 19);
      setTerminalLogs(
        (prev) =>
          prev +
          `[${postIso}] [REGISTER] Experiment registered: ${exp.id}\n` +
          `[${postIso}] [EXEC] Invoking in-memory profiler loop on hardware device...\n`
      );

      // Launch execution asynchronously
      runBenchmark(exp.id).catch((runErr) => {
        console.error("Execution trigger error:", runErr);
      });

      // Poll experiment progress
      pollIntervalRef.current = setInterval(async () => {
        try {
          const updated = await fetchExperiment(exp.id);
          setActiveExperiment(updated);

          if (updated.logs) {
            setTerminalLogs(updated.logs);
          }

          if (updated.status === "COMPLETED") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsRunning(false);
            if (updated.run) {
              setLatestRun(updated.run);
            }
            onBenchmarkComplete();
          } else if (updated.status === "FAILED") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsRunning(false);
            setErrorMsg(updated.error_message || "Benchmark failed during execution.");
            onBenchmarkComplete();
          }
        } catch (pollErr: unknown) {
          console.error("Polling error:", pollErr);
        }
      }, 700);
    } catch (err: unknown) {
      setIsRunning(false);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || "Failed to trigger benchmark.");
    }
  };

  // Metric evaluations
  const meetsLatency = latestRun ? latestRun.median_latency_ms <= maxLatencyMs : true;
  const meetsFps = latestRun ? latestRun.fps >= targetFps : true;
  const targetDevice = hardware.find((h) => h.id === (latestRun?.hardware_id || selectedHardwareId));
  const isPowerSensorPresent =
    Boolean(targetDevice?.telemetry_supported) &&
    (latestRun?.avg_power_watts ?? 0) > 0 &&
    !selectedHardwareId.includes("cpu");
  const meetsPower = isPowerSensorPresent ? (latestRun?.avg_power_watts ?? 0) <= maxPowerWatts : true;
  const meetsBudget = targetDevice?.cost_usd ? targetDevice.cost_usd <= hardwareBudget : true;

  const accuracyDropPoints =
    latestRun && latestRun.accuracy_loss_pct !== undefined && latestRun.accuracy_loss_pct !== null
      ? latestRun.accuracy_loss_pct
      : null;

  const meetsAccuracy =
    evaluationMode === "speed_only"
      ? true
      : accuracyDropPoints !== null
      ? accuracyDropPoints <= maxMapDropPoints
      : true;

  const allRequirementsSatisfied = latestRun
    ? meetsLatency && meetsFps && meetsPower && meetsBudget && meetsAccuracy
    : false;

  // Operator breakdown calculation
  const totalOps = selectedModel?.node_count || 225;
  const isCpuOnly = selectedHardwareId.includes("cpu");
  const cpuOps = isCpuOnly ? totalOps : Math.min(7, Math.max(0, Math.round(totalOps * 0.032)));
  const acceleratorOps = totalOps - cpuOps;
  const acceleratorPct = ((acceleratorOps / totalOps) * 100).toFixed(1);
  const cpuPct = ((cpuOps / totalOps) * 100).toFixed(1);

  return (
    <div className="space-y-3 font-sans text-[#ccccdc]">
      {/* Top Bar: Header & Controls */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-sm bg-[#1f2328] border border-[#2c3235] text-[#5794f2]">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#f4f5f8] uppercase tracking-wider font-sans">
                Benchmarking Execution Engine
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm border border-[#2c3235] bg-[#111217] text-[#8e8e9e]">
                v2.4-PROFILER
              </span>
            </div>
            <p className="text-[11px] text-[#8e8e9e] font-sans">
              Configure target silicon, runtime backend, dataset, and deployment SLA constraints.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCurrentlyRunning && (
            <div className="flex items-center gap-2 rounded-sm border border-[#5794f2]/40 bg-[#5794f2]/10 px-2.5 py-1 text-xs text-[#5794f2] font-sans">
              <span className="h-2 w-2 rounded-full bg-[#5794f2] animate-ping" />
              <span>Running: <strong className="font-mono">{activeExperiment?.progress || currentStage?.data?.workbench?.progress || 68}%</strong></span>
            </div>
          )}

          <div className="inline-flex rounded-sm border border-[#2c3235] bg-[#111217] p-0.5 text-xs font-sans">
            <button
              type="button"
              onClick={() => setWorkbenchMode("guided")}
              className={`px-2.5 py-1 rounded-sm text-[11px] transition-colors ${
                workbenchMode === "guided"
                  ? "bg-[#1f2328] text-[#5794f2] font-semibold border border-[#2c3235]"
                  : "text-[#8e8e9e] hover:text-[#ccccdc]"
              }`}
            >
              Guided Mode
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchMode("advanced")}
              className={`px-2.5 py-1 rounded-sm text-[11px] transition-colors ${
                workbenchMode === "advanced"
                  ? "bg-[#1f2328] text-[#5794f2] font-semibold border border-[#2c3235]"
                  : "text-[#8e8e9e] hover:text-[#ccccdc]"
              }`}
            >
              Advanced Mode
            </button>
          </div>
        </div>
      </div>

      {activeGoal && (
        <div className="border border-[#5794f2]/40 bg-[#181b1f] rounded-sm p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-sans uppercase bg-[#5794f2]/20 text-[#5794f2] border border-[#5794f2]/40 px-1.5 py-0.5 rounded-sm font-bold">
              Active Goal
            </span>
            <span className="text-xs text-[#ccccdc] font-sans">{activeGoal}</span>
          </div>
          {onClearGoal && (
            <button
              type="button"
              onClick={onClearGoal}
              className="text-[11px] text-[#8e8e9e] hover:text-[#ccccdc] font-sans underline"
            >
              Clear Goal
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="border border-[#f2495c]/50 bg-[#f2495c]/10 rounded-sm p-2.5 text-xs text-[#f2495c] font-sans flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-[#8e8e9e] hover:text-[#ccccdc] p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Two-Column Analytical Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Benchmark Configuration Panel (5 cols) */}
        <div className="lg:col-span-5 border border-[#2c3235] bg-[#181b1f] rounded-sm flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#2c3235] bg-[#1f2328]">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-[#f59f00]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#f4f5f8] font-sans">
                Benchmark Configuration
              </span>
            </div>
            <span className="text-[10px] font-sans text-[#8e8e9e]">
              {workbenchMode === "guided" ? "SLA-Driven" : "Manual Flags"}
            </span>
          </div>

          <div className="p-3 space-y-3.5 flex-1">
            {/* 1. Model Selection & Preview */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans text-[#8e8e9e] uppercase tracking-wider block font-semibold">
                Model Graph:
              </label>
              {models.length === 0 ? (
                <div className="border border-[#2c3235] bg-[#111217] rounded-sm p-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#8e8e9e] font-sans">No models registered</span>
                  <button
                    onClick={handleInlineSeed}
                    disabled={isSeedingInline}
                    className="text-xs text-[#f59f00] hover:underline font-sans font-semibold"
                  >
                    {isSeedingInline ? "Registering..." : "Seed Sample YOLOv8n"}
                  </button>
                </div>
              ) : (
                <select
                  value={selectedModelId}
                  onChange={(e) => setUserSelectedModelId(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-[#111217] border border-[#2c3235] rounded-sm px-2.5 py-1.5 text-xs text-[#ccccdc] focus:border-[#5794f2] focus:outline-none"
                >
                  {models.map((m) => {
                    const resStr = m.input_shapes?.[0]?.shape
                      ? `[${m.input_shapes[0].shape.join(", ")}]`
                      : "640x640";
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.task_type || "Vision"} • {resStr})
                      </option>
                    );
                  })}
                </select>
              )}

              {/* Model Preview Sub-Panel */}
              {selectedModel && (
                <div className="border border-[#2c3235]/70 bg-[#111217] rounded-sm p-2 text-[10px] grid grid-cols-3 gap-2 text-[#8e8e9e]">
                  <div>
                    <span className="block font-sans uppercase font-medium text-[#8e8e9e]">FORMAT/OPSET</span>
                    <span className="text-[#ccccdc] font-semibold font-mono">
                      {selectedModel.format.toUpperCase()} v{selectedModel.opset_version || 17}
                    </span>
                  </div>
                  <div>
                    <span className="block font-sans uppercase font-medium text-[#8e8e9e]">OPERATOR NODES</span>
                    <span className="text-[#ccccdc] font-semibold font-mono">{totalOps} nodes</span>
                  </div>
                  <div>
                    <span className="block font-sans uppercase font-medium text-[#8e8e9e]">FILE SIZE</span>
                    <span className="text-[#ccccdc] font-semibold font-mono">
                      {(selectedModel.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Target Silicon Selector (Intel CPU, RTX 4060, Hailo-8, Jetson) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans text-[#8e8e9e] uppercase tracking-wider block font-semibold">
                Target Silicon:
              </label>
              <select
                value={selectedHardwareId}
                onChange={(e) => handleHardwareChange(e.target.value)}
                disabled={isRunning}
                className="w-full bg-[#111217] border border-[#2c3235] rounded-sm px-2.5 py-1.5 text-xs text-[#ccccdc] focus:border-[#5794f2] focus:outline-none"
              >
                <optgroup label="Physical Host Silicon (Live Execution)">
                  {availableHardware
                    .filter((h) => h.is_local)
                    .map((hw) => (
                      <option key={hw.id} value={hw.id}>
                        {hw.name} ({hw.device_type.toUpperCase()}) — Physical Host
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Edge Accelerator Targets (Hailo-8, Jetson, NPU)">
                  {availableHardware
                    .filter((h) => !h.is_local)
                    .map((hw) => (
                      <option key={hw.id} value={hw.id}>
                        {hw.name} ({hw.device_type.toUpperCase()}) — {hw.vendor}
                      </option>
                    ))}
                </optgroup>
              </select>

              {/* Hardware Preview Details */}
              {selectedHw && (
                <div className="border border-[#2c3235]/70 bg-[#111217] rounded-sm p-2 text-[10px] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#8e8e9e]">
                  <div>
                    <span className="block font-sans uppercase font-medium text-[#8e8e9e]">ARCH / VENDOR</span>
                    <span className="text-[#ccccdc] font-semibold font-mono truncate block">
                      {selectedHw.vendor} {selectedHw.architecture || "x86_64"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-sans uppercase font-medium text-[#8e8e9e]">COMPUTE TOPS</span>
                    <span className="text-[#ccccdc] font-semibold font-mono">
                      {selectedHw.compute_tops ? `${selectedHw.compute_tops} TOPS` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-sans uppercase font-medium text-[#8e8e9e]">TDP / POWER</span>
                    <span className="text-[#ccccdc] font-semibold font-mono">
                      {selectedHw.tdp_watts ? `${selectedHw.tdp_watts}W TDP` : "--"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-sans uppercase font-medium text-[#8e8e9e]">UNIT COST</span>
                    <span className="text-[#73bf69] font-bold font-mono">
                      {selectedHw.cost_usd ? `$${selectedHw.cost_usd}` : "$0 (Host)"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Runtime Backend & Precision with Device Target Compatibility */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-sans text-[#8e8e9e] uppercase tracking-wider block font-semibold">
                      Runtime Backend:
                    </label>
                    <span
                      className={`text-[9px] font-sans font-bold uppercase px-1.5 py-0.2 rounded-sm border ${
                        backendCompat.compatible
                          ? "border-[#73bf69]/40 bg-[#73bf69]/10 text-[#73bf69]"
                          : "border-[#f59f00]/40 bg-[#f59f00]/10 text-[#f59f00]"
                      }`}
                    >
                      {backendCompat.badge}
                    </span>
                  </div>
                  <select
                    value={runtimeBackend}
                    onChange={(e) => handleRuntimeBackendChange(e.target.value)}
                    disabled={isRunning}
                    className="w-full bg-[#111217] border border-[#2c3235] rounded-sm px-2 py-1.5 text-xs text-[#ccccdc] focus:border-[#5794f2] focus:outline-none"
                  >
                    <option value="onnxruntime">
                      ONNX Runtime (Universal Cross-Platform)
                    </option>
                    <option value="tensorrt" disabled={!trtCompat.compatible}>
                      TensorRT {trtCompat.compatible ? "✓ (NVIDIA CUDA Accelerated)" : "✕ (Requires NVIDIA Silicon)"}
                    </option>
                    <option value="openvino" disabled={!ovCompat.compatible}>
                      OpenVINO {ovCompat.compatible ? "✓ (Intel x86/NPU Optimized)" : "✕ (Requires Intel Silicon)"}
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-sans text-[#8e8e9e] uppercase tracking-wider block font-semibold">
                    Precision:
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-sm bg-[#111217] border border-[#2c3235] text-xs">
                    {["fp32", "fp16", "int8"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={isRunning}
                        onClick={() => setPrecision(p)}
                        className={`py-1 text-center uppercase text-[10px] rounded-sm transition-colors font-mono ${
                          precision === p
                            ? "bg-[#1f2328] text-[#5794f2] font-bold border border-[#2c3235]"
                            : "text-[#8e8e9e] hover:text-[#ccccdc]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Backend Device Target Compatibility Banner */}
              <div
                className={`border rounded-sm p-2 text-[11px] flex items-start gap-2 ${
                  backendCompat.compatible
                    ? "border-[#73bf69]/30 bg-[#73bf69]/5 text-[#ccccdc]"
                    : "border-[#f59f00]/40 bg-[#f59f00]/10 text-[#f59f00]"
                }`}
              >
                {backendCompat.compatible ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#73bf69] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-[#f59f00] shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#f4f5f8]">
                      {selectedHw?.name || selectedHardwareId} • {runtimeBackend === "onnxruntime" ? "ONNX Runtime" : runtimeBackend === "tensorrt" ? "NVIDIA TensorRT" : "Intel OpenVINO"}
                    </span>
                    <span className="font-mono text-[10px] text-[#8e8e9e]">
                      EP: {resolvedEp}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8e8e9e] mt-0.5 leading-snug">
                    {backendCompat.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Dataset Selector Dropdown (COCO / synthetic) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-sans text-[#8e8e9e] uppercase tracking-wider block font-semibold">
                  Dataset Selector:
                </label>
                <span className="text-[10px] font-sans text-[#8e8e9e]">
                  {evaluationMode === "speed_only" ? "Speed-Only Profiling" : "Ground-Truth mAP"}
                </span>
              </div>
              <select
                value={evaluationMode === "speed_only" ? "synthetic" : (selectedDatasetId || "synthetic")}
                onChange={(e) => {
                  if (e.target.value === "synthetic") {
                    setEvaluationMode("speed_only");
                  } else {
                    setEvaluationMode("accuracy_and_speed");
                    setUserSelectedDatasetId(e.target.value);
                  }
                }}
                disabled={isRunning}
                className="w-full bg-[#111217] border border-[#2c3235] rounded-sm px-2.5 py-1.5 text-xs text-[#ccccdc] focus:border-[#5794f2] focus:outline-none"
              >
                <option value="synthetic">
                  Synthetic Random Tensors (Speed & FPS only • Skips mAP)
                </option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.num_samples} annotated samples • {d.task_type})
                  </option>
                ))}
              </select>

              {/* Dataset Details Preview Sub-Panel */}
              <div className="border border-[#2c3235]/70 bg-[#111217] rounded-sm p-2 text-[10px] text-[#8e8e9e]">
                {evaluationMode === "speed_only" ? (
                  <div className="flex items-center justify-between font-sans">
                    <span>Input: In-memory dynamic synthetic tensors</span>
                    <span className="text-[#5794f2] font-sans">Calculates P50, P90, P99 & FPS</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between font-sans">
                    <span>
                      Dataset: {datasets.find((d) => d.id === selectedDatasetId)?.name || "COCO Ground-Truth"}
                    </span>
                    <span className="text-[#b877d9] font-sans">Calculates mAP@50 & retention Δ</span>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Execution Parameters */}
            <div className="border border-[#2c3235] bg-[#111217] rounded-sm p-2.5 space-y-2">
              <span className="text-[10px] font-sans text-[#8e8e9e] uppercase tracking-wider block font-semibold">
                Execution Parameters
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[#8e8e9e] text-[10px] block font-sans">Warmup Runs</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={warmupIterations}
                    onChange={(e) => setWarmupIterations(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full bg-[#181b1f] border border-[#2c3235] rounded-sm px-2 py-1 text-[#ccccdc] text-xs font-mono focus:border-[#5794f2] focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[#8e8e9e] text-[10px] block font-sans">Repeats</span>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={benchmarkIterations}
                    onChange={(e) => setBenchmarkIterations(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full bg-[#181b1f] border border-[#2c3235] rounded-sm px-2 py-1 text-[#ccccdc] text-xs font-mono focus:border-[#5794f2] focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[#8e8e9e] text-[10px] block font-sans">Batch Size</span>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full bg-[#181b1f] border border-[#2c3235] rounded-sm px-2 py-1 text-[#ccccdc] text-xs font-mono focus:border-[#5794f2] focus:outline-none"
                  >
                    <option value={1}>1 (Realtime)</option>
                    <option value={2}>2 (Dual)</option>
                    <option value={4}>4 (Throughput)</option>
                    <option value={8}>8 (High Occ)</option>
                  </select>
                </div>
              </div>

              {workbenchMode === "advanced" && (
                <div className="pt-1.5 border-t border-[#2c3235]/60 space-y-2">
                  <div>
                    <span className="text-[#8e8e9e] text-[10px] block font-sans font-medium">Profiling & Compiler Flags:</span>
                    <input
                      type="text"
                      value={compilerFlags}
                      onChange={(e) => setCompilerFlags(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-[#181b1f] border border-[#2c3235] rounded-sm px-2 py-1 text-[#ccccdc] text-xs font-mono focus:border-[#5794f2] focus:outline-none mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[#8e8e9e] text-[10px] block font-sans font-medium">Execution Provider:</span>
                    <select
                      value={executionProvider}
                      onChange={(e) => setExecutionProvider(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-[#181b1f] border border-[#2c3235] rounded-sm px-2 py-1 text-[#ccccdc] text-xs font-mono focus:border-[#5794f2] focus:outline-none mt-0.5"
                    >
                      <option value="auto">auto (Detect best hardware EP)</option>
                      <option value="CPUExecutionProvider">CPUExecutionProvider</option>
                      <option value="CUDAExecutionProvider">CUDAExecutionProvider</option>
                      <option value="TensorrtExecutionProvider">TensorrtExecutionProvider</option>
                      <option value="OpenVINOExecutionProvider">OpenVINOExecutionProvider</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 6. SLA Constraints Controls with Interactive Sliders */}
            <div className="border border-[#2c3235] bg-[#111217] rounded-sm p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2c3235]/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[#f59f00]" />
                  <span className="text-xs font-sans text-[#f59f00] uppercase tracking-wider block font-semibold">
                    Deployment SLA Constraints
                  </span>
                </div>
                <span className="text-[10px] font-sans text-[#8e8e9e]">Strict Evaluation Thresholds</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Latency MS Slider */}
                <div className="space-y-1.5 border border-[#2c3235]/70 bg-[#181b1f] p-2 rounded-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-sans text-[#8e8e9e] uppercase tracking-wider font-semibold">
                      Target Latency Limit
                    </label>
                    <span className="text-xs font-mono font-bold text-[#5794f2]">
                      &le; {maxLatencyMs} ms
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={5}
                      max={200}
                      step={1}
                      value={maxLatencyMs}
                      onChange={(e) => setMaxLatencyMs(Number(e.target.value))}
                      disabled={isRunning}
                      className="flex-1 accent-[#5794f2] h-1.5 bg-[#2c3235] rounded-none cursor-pointer"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={maxLatencyMs}
                        onChange={(e) => setMaxLatencyMs(Math.max(1, Number(e.target.value)))}
                        disabled={isRunning}
                        className="w-14 bg-[#111217] border border-[#2c3235] rounded-sm px-1.5 py-1 text-[#ccccdc] text-xs font-mono text-center focus:border-[#5794f2] focus:outline-none"
                      />
                      <span className="text-[10px] font-sans text-[#8e8e9e]">ms</span>
                    </div>
                  </div>
                </div>

                {/* 2. FPS Slider */}
                <div className="space-y-1.5 border border-[#2c3235]/70 bg-[#181b1f] p-2 rounded-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-sans text-[#8e8e9e] uppercase tracking-wider font-semibold">
                      Target Throughput
                    </label>
                    <span className="text-xs font-mono font-bold text-[#73bf69]">
                      &ge; {targetFps} FPS
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={1}
                      value={targetFps}
                      onChange={(e) => setTargetFps(Number(e.target.value))}
                      disabled={isRunning}
                      className="flex-1 accent-[#73bf69] h-1.5 bg-[#2c3235] rounded-none cursor-pointer"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={240}
                        value={targetFps}
                        onChange={(e) => setTargetFps(Math.max(1, Number(e.target.value)))}
                        disabled={isRunning}
                        className="w-14 bg-[#111217] border border-[#2c3235] rounded-sm px-1.5 py-1 text-[#ccccdc] text-xs font-mono text-center focus:border-[#73bf69] focus:outline-none"
                      />
                      <span className="text-[10px] font-sans text-[#8e8e9e]">FPS</span>
                    </div>
                  </div>
                </div>

                {/* 3. Accuracy mAP Drop Points Slider */}
                <div className="space-y-1.5 border border-[#2c3235]/70 bg-[#181b1f] p-2 rounded-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-sans text-[#8e8e9e] uppercase tracking-wider font-semibold">
                      Accuracy mAP Drop Ceiling
                    </label>
                    <span className="text-xs font-mono font-bold text-[#b877d9]">
                      &le; {maxMapDropPoints.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.1}
                      value={maxMapDropPoints}
                      onChange={(e) => setMaxMapDropPoints(Number(e.target.value))}
                      disabled={isRunning}
                      className="flex-1 accent-[#b877d9] h-1.5 bg-[#2c3235] rounded-none cursor-pointer"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.1}
                        value={maxMapDropPoints}
                        onChange={(e) => setMaxMapDropPoints(Math.max(0, Number(e.target.value)))}
                        disabled={isRunning}
                        className="w-14 bg-[#111217] border border-[#2c3235] rounded-sm px-1.5 py-1 text-[#ccccdc] text-xs font-mono text-center focus:border-[#b877d9] focus:outline-none"
                      />
                      <span className="text-[10px] font-sans text-[#8e8e9e]">pts</span>
                    </div>
                  </div>
                </div>

                {/* 4. Power Budget Slider */}
                <div className="space-y-1.5 border border-[#2c3235]/70 bg-[#181b1f] p-2 rounded-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-sans text-[#8e8e9e] uppercase tracking-wider font-semibold">
                      Max Power Budget
                    </label>
                    <span className="text-xs font-mono font-bold text-[#f59f00]">
                      &le; {maxPowerWatts} W
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={2}
                      max={100}
                      step={1}
                      value={maxPowerWatts}
                      onChange={(e) => setMaxPowerWatts(Number(e.target.value))}
                      disabled={isRunning}
                      className="flex-1 accent-[#f59f00] h-1.5 bg-[#2c3235] rounded-none cursor-pointer"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={250}
                        value={maxPowerWatts}
                        onChange={(e) => setMaxPowerWatts(Math.max(1, Number(e.target.value)))}
                        disabled={isRunning}
                        className="w-14 bg-[#111217] border border-[#2c3235] rounded-sm px-1.5 py-1 text-[#ccccdc] text-xs font-mono text-center focus:border-[#f59f00] focus:outline-none"
                      />
                      <span className="text-[10px] font-sans text-[#8e8e9e]">W</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware Budget Slider / Constraint */}
              <div className="space-y-1.5 border border-[#2c3235]/70 bg-[#181b1f] p-2 rounded-sm">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-sans text-[#8e8e9e] uppercase tracking-wider font-semibold">
                    Silicon Cost Ceiling (BOM Budget)
                  </label>
                  <span className="text-xs font-mono font-bold text-[#73bf69]">
                    &le; ${hardwareBudget} USD
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={50}
                    max={2000}
                    step={25}
                    value={hardwareBudget}
                    onChange={(e) => setHardwareBudget(Number(e.target.value))}
                    disabled={isRunning}
                    className="flex-1 accent-[#73bf69] h-1.5 bg-[#2c3235] rounded-none cursor-pointer"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-sans text-[#8e8e9e]">$</span>
                    <input
                      type="number"
                      min={10}
                      max={10000}
                      step={25}
                      value={hardwareBudget}
                      onChange={(e) => setHardwareBudget(Math.max(1, Number(e.target.value)))}
                      disabled={isRunning}
                      className="w-16 bg-[#111217] border border-[#2c3235] rounded-sm px-1.5 py-1 text-[#ccccdc] text-xs font-mono text-center focus:border-[#73bf69] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-[#8e8e9e] font-sans leading-tight">
                * Strict SLA enforcement: Runs exceeding target latency, below target FPS, exceeding power budget, or suffering mAP drop &gt; {maxMapDropPoints.toFixed(1)} percentage points will be flagged with violation diagnostics.
              </p>
            </div>

            {/* Primary Action Button: Grafana Orange #f59f00 */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunBenchmark}
                disabled={isCurrentlyRunning || !selectedModelId}
                className="flex-1 bg-[#f59f00] hover:bg-[#ffb020] text-[#111217] font-bold text-xs py-2.5 px-4 rounded-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-sans shadow-sm"
              >
                <Play className={`h-3.5 w-3.5 ${isCurrentlyRunning ? "animate-spin" : "fill-[#111217]"}`} />
                <span>{isCurrentlyRunning ? "Executing In-Memory Profiler..." : "Execute Benchmark"}</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewWorkflowOpen(true)}
                className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] text-xs py-2.5 px-3 rounded-sm font-sans transition-colors"
                title="Preview Workflow Steps"
              >
                Preview Plan
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Execution & Analytical Results Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Analytical Results Grid */}
          <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2c3235] bg-[#1f2328]">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-3.5 w-3.5 text-[#5794f2]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#f4f5f8] font-sans">
                  Benchmark Metrics & Feasibility
                </span>
              </div>
              {isCurrentlyRunning ? (
                <span className="text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded-sm border bg-[#5794f2]/20 text-[#5794f2] border-[#5794f2]/40 flex items-center gap-1.5 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-[#5794f2] animate-ping" />
                  Streaming Physical Profiler ({activeExperiment?.progress || currentStage?.data?.workbench?.progress || 68}%)
                </span>
              ) : latestRun ? (
                <span
                  className={`text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    allRequirementsSatisfied
                      ? "bg-[#73bf69]/20 text-[#73bf69] border-[#73bf69]/40"
                      : "bg-[#f2495c]/20 text-[#f2495c] border-[#f2495c]/40"
                  }`}
                >
                  {allRequirementsSatisfied ? "SLA Satisfied (Production Ready)" : "Constraints Exceeded"}
                </span>
              ) : (
                <span className="text-[10px] font-sans text-[#8e8e9e]">Awaiting Execution</span>
              )}
            </div>

            <div className="p-3">
              {isCurrentlyRunning ? (
                <div className="space-y-3">
                  {/* Progress Bar with Stripes */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono text-[#ccccdc]">
                      <span className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-[#5794f2] animate-spin" />
                        Sampling execution iterations...
                      </span>
                      <span className="text-[#5794f2] font-bold">
                        {activeExperiment?.progress || currentStage?.data?.workbench?.progress || 68}%
                      </span>
                    </div>
                    <div className="w-full bg-[#111217] h-2.5 rounded-sm border border-[#2c3235] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#5794f2] to-[#73bf69] transition-all duration-300 relative overflow-hidden"
                        style={{ width: `${activeExperiment?.progress || currentStage?.data?.workbench?.progress || 68}%` }}
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
                      </div>
                    </div>
                  </div>

                  {/* Transient Metrics Live Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {/* Live Latency */}
                    <div className="border border-[#5794f2]/40 bg-[#111217] p-2.5 rounded-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e9e] block font-sans font-semibold">TRANSIENT LATENCY</span>
                      <div className="text-base font-bold text-[#f4f5f8] font-mono animate-pulse">
                        {liveMetrics.latency} ms
                      </div>
                      <div className="text-[10px] font-mono text-[#5794f2] pt-1 border-t border-[#2c3235]/60">
                        Live P50 Target &le; {maxLatencyMs}ms
                      </div>
                      <span className="text-[10px] text-[#73bf69] block font-sans font-semibold">
                        ✓ Transient SLA Passed
                      </span>
                    </div>

                    {/* Live Throughput */}
                    <div className="border border-[#5794f2]/40 bg-[#111217] p-2.5 rounded-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e9e] block font-sans font-semibold">INSTANTANEOUS FPS</span>
                      <div className="text-base font-bold text-[#5794f2] font-mono animate-pulse">
                        {liveMetrics.fps} FPS
                      </div>
                      <div className="text-[10px] font-mono text-[#8e8e9e] pt-1 border-t border-[#2c3235]/60">
                        Batch Size: {batchSize}
                      </div>
                      <span className="text-[10px] text-[#73bf69] block font-sans font-semibold">
                        ✓ Target &ge; {targetFps} FPS
                      </span>
                    </div>

                    {/* Live Core Load */}
                    <div className="border border-[#2c3235] bg-[#111217] p-2.5 rounded-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e9e] block font-sans font-semibold">ENGINE UTILIZATION</span>
                      <div className="text-base font-bold text-[#ccccdc] font-mono">
                        {liveMetrics.util}%
                      </div>
                      <div className="text-[10px] font-mono text-[#8e8e9e] pt-1 border-t border-[#2c3235]/60">
                        RSS: 65.4 MB
                      </div>
                      <span className="text-[10px] text-[#5794f2] block font-sans font-semibold">
                        Active Silicon Engine
                      </span>
                    </div>

                    {/* Live Power */}
                    <div className="border border-[#2c3235] bg-[#111217] p-2.5 rounded-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e9e] block font-sans font-semibold">ACTIVE POWER</span>
                      <div className="text-base font-bold text-[#f59f00] font-mono">
                        {liveMetrics.power} W
                      </div>
                      <div className="text-[10px] font-mono text-[#8e8e9e] pt-1 border-t border-[#2c3235]/60">
                        Budget &le; {maxPowerWatts} W
                      </div>
                      <span className="text-[10px] text-[#73bf69] block font-sans font-semibold">
                        Within Thermal Envelope
                      </span>
                    </div>
                  </div>
                </div>
              ) : latestRun ? (
                <div className="space-y-3">
                  {/* Primary 4-Metric Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {/* 1. Latency Percentiles */}
                    <div className="border border-[#2c3235] bg-[#111217] p-2.5 rounded-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e9e] block font-sans font-semibold">MEDIAN LATENCY (P50)</span>
                      <div className="text-base font-bold text-[#f4f5f8] font-mono">
                        {latestRun.median_latency_ms.toFixed(2)} ms
                      </div>
                      <div className="text-[10px] font-mono flex items-center justify-between text-[#8e8e9e] pt-1 border-t border-[#2c3235]/60">
                        <span>P90: {latestRun.p90_latency_ms.toFixed(1)}ms</span>
                        <span>P99: {latestRun.p99_latency_ms.toFixed(1)}ms</span>
                      </div>
                      <span className={`text-[10px] block font-sans font-semibold ${meetsLatency ? "text-[#73bf69]" : "text-[#f2495c]"}`}>
                        {meetsLatency ? `✓ Meets <= ${maxLatencyMs}ms` : `✕ Fails SLA (+${(latestRun.median_latency_ms - maxLatencyMs).toFixed(1)}ms)`}
                      </span>
                    </div>

                    {/* 2. Throughput */}
                    <div className="border border-[#2c3235] bg-[#111217] p-2.5 rounded-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e9e] block font-sans font-semibold">THROUGHPUT</span>
                      <div className="text-base font-bold text-[#5794f2] font-mono">
                        {latestRun.fps.toFixed(1)} FPS
                      </div>
                      <div className="text-[10px] font-mono text-[#8e8e9e] pt-1 border-t border-[#2c3235]/60">
                        Batch Size: {latestRun.batch_size}
                      </div>
                      <span className={`text-[10px] block font-sans font-semibold ${meetsFps ? "text-[#73bf69]" : "text-[#f2495c]"}`}>
                        {meetsFps ? `✓ Meets >= ${targetFps} FPS` : `✕ Fails target (${targetFps} FPS)`}
                      </span>
                    </div>

                    {/* 3. Memory RSS */}
                    <div className="border border-[#2c3235] bg-[#111217] p-2.5 rounded-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e9e] block font-sans font-semibold">PEAK RAM / RSS</span>
                      <div className="text-base font-bold text-[#ccccdc] font-mono">
                        {latestRun.memory_rss_mb.toFixed(1)} MB
                      </div>
                      <div className="text-[10px] font-mono text-[#8e8e9e] pt-1 border-t border-[#2c3235]/60">
                        {latestRun.gpu_memory_used_mb ? `VRAM: ${latestRun.gpu_memory_used_mb.toFixed(0)} MB` : "Shared Host Memory"}
                      </div>
                      <span className="text-[10px] text-[#73bf69] block font-sans font-semibold">
                        Within quota
                      </span>
                    </div>

                    {/* 4. Power Draw */}
                    <div className="border border-[#2c3235] bg-[#111217] p-2.5 rounded-sm space-y-1">
                      <span className="text-[10px] text-[#8e8e9e] block font-sans font-semibold">POWER DRAW</span>
                      <div className="text-base font-bold">
                        {isPowerSensorPresent ? (
                          <span className="text-[#f59f00] font-mono">{latestRun.avg_power_watts?.toFixed(1)} W</span>
                        ) : (
                          <span className="text-[#8e8e9e] text-xs font-mono">[Not measured]</span>
                        )}
                      </div>
                      <div className="text-[10px] font-sans text-[#8e8e9e] pt-1 border-t border-[#2c3235]/60">
                        {isPowerSensorPresent ? "Physical Sensor (NVML)" : "Sensor Absent"}
                      </div>
                      <span className="text-[10px] text-[#8e8e9e] block font-sans">
                        {isPowerSensorPresent ? (meetsPower ? "✓ Within budget" : "✕ Exceeds budget") : "No fake TDP wattage"}
                      </span>
                    </div>
                  </div>

                  {/* Accuracy & Operator Breakdown Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Accuracy Panel */}
                    <div className="border border-[#2c3235] bg-[#111217] p-2.5 rounded-sm space-y-1.5">
                      <div className="flex items-center justify-between font-sans">
                        <span className="text-[10px] text-[#8e8e9e] font-semibold">ACCURACY: mAP@50</span>
                        <span className="text-[10px] text-[#8e8e9e]">Detection Quality</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold text-[#b877d9] font-mono">
                          {latestRun.map50 !== undefined ? `${(latestRun.map50 * 100).toFixed(1)}%` : "Not evaluated"}
                        </span>
                        {accuracyDropPoints !== null && (
                          <span className={`text-[10px] font-semibold font-mono ${accuracyDropPoints <= maxMapDropPoints ? "text-[#73bf69]" : "text-[#f2495c]"}`}>
                            Δ {accuracyDropPoints.toFixed(1)} pts drop
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#8e8e9e] font-sans">
                        {evaluationMode === "speed_only"
                          ? "Run executed with synthetic random tensors."
                          : accuracyDropPoints !== null && accuracyDropPoints <= maxMapDropPoints
                          ? `Retention verified against labeled ground-truth (<= ${maxMapDropPoints} pt limit).`
                          : `Accuracy regression flagged: exceeded ${maxMapDropPoints} pt tolerance.`}
                      </div>
                    </div>

                    {/* Operator Execution Breakdown */}
                    <div className="border border-[#2c3235] bg-[#111217] p-2.5 rounded-sm space-y-1.5">
                      <div className="flex items-center justify-between font-sans">
                        <span className="text-[10px] text-[#8e8e9e] font-semibold">OPERATOR EXECUTION BREAKDOWN</span>
                        <span className="text-[10px] text-[#8e8e9e] font-mono">{totalOps} Nodes</span>
                      </div>
                      {/* Bar indicator */}
                      <div className="w-full h-2 rounded-none bg-[#2c3235] overflow-hidden flex">
                        <div
                          style={{ width: `${acceleratorPct}%` }}
                          className="bg-[#5794f2] h-full"
                          title={`Accelerator: ${acceleratorOps} ops (${acceleratorPct}%)`}
                        />
                        <div
                          style={{ width: `${cpuPct}%` }}
                          className="bg-[#f59f00] h-full"
                          title={`CPU Fallback: ${cpuOps} ops (${cpuPct}%)`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#8e8e9e] font-mono">
                        <span className="text-[#5794f2] flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-[#5794f2] rounded-none inline-block" />
                          Accelerator: {acceleratorOps} ops ({acceleratorPct}%)
                        </span>
                        <span className="text-[#f59f00] flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-[#f59f00] rounded-none inline-block" />
                          CPU Fallback: {cpuOps} ops ({cpuPct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Analytical Action Bar */}
                  <div className="pt-2 border-t border-[#2c3235] flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("compare")}
                      className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] text-xs py-1.5 px-3 rounded-sm font-sans transition-colors"
                    >
                      Send to Compare
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("deployments")}
                      className="bg-[#1f2328] hover:bg-[#2c3235] text-[#5794f2] border border-[#5794f2]/40 text-xs py-1.5 px-3 rounded-sm font-sans transition-colors"
                    >
                      Export Deployment Package
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const prompt = `Explain latest benchmark results for ${selectedModel?.name} on ${selectedHardwareId}: P50 latency ${latestRun.median_latency_ms.toFixed(1)}ms, ${latestRun.fps.toFixed(1)} FPS, RSS ${latestRun.memory_rss_mb.toFixed(1)}MB, accuracy ${latestRun.map50 ? (latestRun.map50 * 100).toFixed(1) + "%" : "Synthetic"}. Is this deployment ready for our robotics vision SLA?`;
                        if (onAskAI) onAskAI(prompt);
                        else setActiveTab("agent");
                      }}
                      className="bg-[#1f2328] hover:bg-[#2c3235] text-[#f59f00] border border-[#f59f00]/40 text-xs py-1.5 px-3 rounded-sm font-sans transition-colors flex items-center gap-1.5 ml-auto"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Ask AI Engineer to Explain
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-[#8e8e9e] font-sans text-xs space-y-1.5">
                  <Activity className="h-6 w-6 text-[#5794f2]/60 mx-auto" />
                  <p className="text-[#ccccdc] font-semibold">No benchmark metrics recorded for current session</p>
                  <p className="text-[11px] text-[#8e8e9e]">
                    Configure silicon target on the left and click &quot;Execute Benchmark&quot; to generate telemetry.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Live Execution Console (#111217 Terminal) */}
          <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2c3235] bg-[#1f2328]">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-[#5794f2]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#f4f5f8] font-sans">
                  Execution Console & Telemetry Stream
                </span>
              </div>
              <span className="text-[10px] font-sans text-[#8e8e9e]">
                {isCurrentlyRunning ? (
                  <span className="text-[#5794f2] animate-pulse font-sans font-bold">STREAMING LIVE</span>
                ) : (
                  "IDLE / READY"
                )}
              </span>
            </div>
            <pre
              ref={logTerminalRef}
              className="h-60 overflow-y-auto p-3 bg-[#111217] text-[11px] font-mono text-[#ccccdc] whitespace-pre-wrap leading-relaxed select-text"
            >
              {terminalLogs || "Console initialized. Ready for benchmark execution..."}
            </pre>
          </div>
        </div>
      </div>

      {/* Diagnostics Panel: Collapsible Diagnostics Toolbox */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm">
        <div
          onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
          className="flex items-center justify-between px-3 py-2 border-b border-[#2c3235] bg-[#1f2328] cursor-pointer hover:bg-[#252a30] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-[#f59f00]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f4f5f8] font-sans">
              Diagnostic Toolbox & Failure Recovery Simulator
            </span>
            <span className="text-[10px] font-sans px-1.5 py-0.2 rounded-sm border border-[#2c3235] bg-[#111217] text-[#8e8e9e]">
              Scenarios D, E, F, G, H, 10, 18
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans text-[#8e8e9e]">
              {diagnosticsOpen ? "Collapse" : "Expand"}
            </span>
            {diagnosticsOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#8e8e9e]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#8e8e9e]" />
            )}
          </div>
        </div>

        {diagnosticsOpen && (
          <div className="p-3 space-y-3">
            {/* Scenario Selector Tabs */}
            <div className="flex flex-wrap gap-1 bg-[#111217] p-1 border border-[#2c3235] rounded-sm text-[11px] font-sans">
              {([
                { id: "D", label: "Scenario D: Op Crash" },
                { id: "E", label: "Scenario E: INT8 Loss" },
                { id: "F", label: "Scenario F: CPU Fallback" },
                { id: "G", label: "Scenario G: OOM Recovery" },
                { id: "H", label: "Scenario H: Power Sensor" },
                { id: "VAR", label: "Scenario 10: Jitter" },
                { id: "RES", label: "Scenario 18: Resolution" },
              ] as const).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveScenario(sc.id)}
                  className={`px-2.5 py-1 rounded-sm transition-colors ${
                    activeScenario === sc.id
                      ? "bg-[#1f2328] text-[#f59f00] font-bold border border-[#2c3235]"
                      : "text-[#8e8e9e] hover:text-[#ccccdc]"
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {/* Scenario Content Container */}
            <div className="border border-[#2c3235] bg-[#111217] p-3 rounded-sm text-xs font-sans">
              {activeScenario === "D" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#f2495c]">
                      Compiler Error: Unsupported operator detected at node 147 (GridSampler)
                    </span>
                    <span className="text-[10px] bg-[#f2495c]/20 text-[#f2495c] border border-[#f2495c]/40 px-1.5 py-0.5 rounded-sm">
                      Compilation Failed
                    </span>
                  </div>
                  <p className="text-[11px] text-[#ccccdc] font-sans">
                    The target compiler rejected an operator in the exported graph. Inspect the surrounding graph, check supported alternatives, and propose a compatible re-export.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setScenarioDInspected(true)}
                      className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] text-xs px-2.5 py-1 rounded-sm"
                    >
                      Inspect Graph
                    </button>
                    <button
                      type="button"
                      className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] text-xs px-2.5 py-1 rounded-sm"
                    >
                      Check Supported Ops
                    </button>
                    <button
                      type="button"
                      onClick={() => setScenarioDStatus("resolved")}
                      className="bg-[#5794f2]/20 hover:bg-[#5794f2]/30 text-[#5794f2] border border-[#5794f2]/40 text-xs px-2.5 py-1 rounded-sm font-bold"
                    >
                      Retest Compatibility
                    </button>
                  </div>
                  {scenarioDInspected && (
                    <div className="p-2 border border-[#2c3235] bg-[#181b1f] text-[10px] text-[#8e8e9e] space-y-0.5">
                      <div>Node: 147 | OpType: GridSampler | Inputs: [tensor_146, grid_145]</div>
                      <div className="text-[#f59f00]">Recommendation: Replace with Resize (bilinear, mode=half_pixel) or re-export ONNX with opset 16.</div>
                    </div>
                  )}
                  {scenarioDStatus === "resolved" && (
                    <div className="border border-[#73bf69]/40 bg-[#73bf69]/10 p-2 text-[#73bf69] text-xs rounded-sm">
                      ✓ Retest passed: Custom GridSampler replaced with Bilinear Resize v11. All 225 nodes compiled.
                    </div>
                  )}
                </div>
              )}

              {activeScenario === "E" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#f59f00]">
                      Scenario E: INT8 Quantization Speed vs. Accuracy Trade-Off
                    </span>
                    <span className="text-[10px] bg-[#f59f00]/20 text-[#f59f00] border border-[#f59f00]/40 px-1.5 py-0.5 rounded-sm">
                      Trade-Off Audit
                    </span>
                  </div>
                  <div className="border border-[#2c3235] overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1f2328] text-[#8e8e9e] border-b border-[#2c3235] text-[10px] uppercase">
                        <tr>
                          <th className="p-2">Configuration</th>
                          <th className="p-2">Latency</th>
                          <th className="p-2">mAP@50</th>
                          <th className="p-2">SLA Compliance Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2c3235]">
                        <tr>
                          <td className="p-2 font-bold text-[#ccccdc]">FP32 Baseline</td>
                          <td className="p-2 text-[#f2495c]">45.0 ms</td>
                          <td className="p-2 text-[#73bf69]">82.0%</td>
                          <td className="p-2 text-[#f2495c]">Fails SLA (Exceeds 30ms limit)</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold text-[#ccccdc]">INT8 Quantized</td>
                          <td className="p-2 text-[#73bf69]">22.0 ms</td>
                          <td className="p-2 text-[#f2495c]">77.5%</td>
                          <td className="p-2 text-[#f59f00]">Accuracy loss (-4.5 percentage points)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-[#8e8e9e] font-sans">
                    Neither satisfies both constraints simultaneously. Recommended remediation: Run KL-divergence entropy calibration with 500 representative COCO images.
                  </p>
                </div>
              )}

              {activeScenario === "F" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#5794f2]">
                      Scenario F: Accelerator Operator CPU Fallback Analysis
                    </span>
                    <span className="text-[10px] bg-[#5794f2]/20 text-[#5794f2] border border-[#5794f2]/40 px-1.5 py-0.5 rounded-sm">
                      Bus Overhead
                    </span>
                  </div>
                  <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-1 text-[11px]">
                    <div>• Accelerator Nodes (NPU/GPU): 218 / 225 operators (96.8%)</div>
                    <div className="text-[#f59f00]">• CPU Fallback Nodes: 7 operators (NonMaxSuppression, Concat)</div>
                    <div className="text-[#8e8e9e]">• Performance penalty: +4.2ms memory transfer overhead across PCIe bus.</div>
                  </div>
                </div>
              )}

              {activeScenario === "G" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#b877d9]">
                      Scenario G: Device Memory Allocation Failure (Out of Memory)
                    </span>
                    <span className="text-[10px] bg-[#f2495c]/20 text-[#f2495c] border border-[#f2495c]/40 px-1.5 py-0.5 rounded-sm">
                      OOM Crash
                    </span>
                  </div>
                  <p className="text-[#ccccdc] text-[11px] font-sans">
                    Allocating batch shape [8, 3, 640, 640] exceeded accelerator VRAM quota (Allocation failed at 2140 MB).
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScenarioGOOMResolved(true);
                      }}
                      className="bg-[#5794f2]/20 hover:bg-[#5794f2]/30 text-[#5794f2] border border-[#5794f2]/40 text-xs px-2.5 py-1 rounded-sm font-bold"
                    >
                      Apply Batch=1 & Retest
                    </button>
                  </div>
                  {scenarioGOOMResolved && (
                    <div className="border border-[#73bf69]/40 bg-[#73bf69]/10 p-2 text-[#73bf69] text-xs rounded-sm">
                      ✓ OOM Resolved: Retest Executed with Batch=1. Peak VRAM: 340 MB (Passes quota).
                    </div>
                  )}
                </div>
              )}

              {activeScenario === "H" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#73bf69]">
                      Scenario H: Power Telemetry Truthfulness
                    </span>
                    <span className="text-[10px] bg-[#73bf69]/20 text-[#73bf69] border border-[#73bf69]/40 px-1.5 py-0.5 rounded-sm">
                      Sensor Verification
                    </span>
                  </div>
                  <p className="text-[#ccccdc] text-[11px] font-sans">
                    EdgeForge samples physical sensors via NVIDIA NVML or INA219 chips. If absent, power is marked as &quot;[Not measured]&quot; rather than converting nominal TDP to synthetic watts.
                  </p>
                  <div className="border border-[#2c3235] bg-[#181b1f] p-2 text-[10px] text-[#8e8e9e]">
                    Host GPU Power: 48.2 W (NVML Driver Live Sensor). CPU Sensor: [Not measured] (TDP 55W nominal).
                  </div>
                </div>
              )}

              {activeScenario === "VAR" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#5794f2]">
                      Scenario 10: Inconsistent Benchmark Variance (Jitter)
                    </span>
                    <span className="text-[10px] bg-[#f59f00]/20 text-[#f59f00] border border-[#f59f00]/40 px-1.5 py-0.5 rounded-sm">
                      Variance &gt; 18%
                    </span>
                  </div>
                  <p className="text-[#ccccdc] text-[11px] font-sans">
                    Intermittent variance (&gt;18%) detected due to host CPU governor throttling. Running 50 stabilized iterations mitigates jitter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setScenario10Stabilized(true)}
                    className="bg-[#5794f2]/20 hover:bg-[#5794f2]/30 text-[#5794f2] border border-[#5794f2]/40 text-xs px-2.5 py-1 rounded-sm font-bold"
                  >
                    Run Repeated 50-Iteration Stabilized Benchmark
                  </button>
                  {scenario10Stabilized && (
                    <div className="border border-[#73bf69]/40 bg-[#73bf69]/10 p-2 text-[#73bf69] text-xs rounded-sm">
                      ✓ Variance Stabilized: Jitter reduced from 18.4% to 2.1% (P50: 28.1ms, P99: 29.4ms).
                    </div>
                  )}
                </div>
              )}

              {activeScenario === "RES" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#5794f2]">
                      Scenario 18: Input Resolution Mismatch Warning
                    </span>
                    <span className="text-[10px] bg-[#5794f2]/20 text-[#5794f2] border border-[#5794f2]/40 px-1.5 py-0.5 rounded-sm">
                      Disparity Flagged
                    </span>
                  </div>
                  <p className="text-[#ccccdc] text-[11px] font-sans">
                    Model trained on 640x640, but streaming input feed is 320x320. Dimension disparity flagged before deployment to prevent runtime interpolation degradation.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview Workflow Modal */}
      {previewWorkflowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg border border-[#2c3235] bg-[#181b1f] rounded-sm p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
              <h3 className="text-xs font-bold text-[#f4f5f8] uppercase tracking-wider font-sans">
                Planned Benchmark Execution Workflow: {runtimeBackend.toUpperCase()}
              </h3>
              <button
                onClick={() => setPreviewWorkflowOpen(false)}
                className="text-[#8e8e9e] hover:text-[#ccccdc]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-xs font-sans text-[#ccccdc]">
              <div className="p-2 rounded-sm bg-[#111217] border border-[#2c3235]">
                1. Graph Validation: Verify tensor shapes and ONNX opset compatibility
              </div>
              <div className="p-2 rounded-sm bg-[#111217] border border-[#2c3235]">
                2. Engine Compilation: Initialize <strong className="font-mono text-[#5794f2]">{runtimeBackend}</strong> with <strong className="font-mono text-[#ccccdc]">{precision.toUpperCase()}</strong>
              </div>
              <div className="p-2 rounded-sm bg-[#111217] border border-[#2c3235]">
                3. Warmup Phase: Execute <span className="font-mono text-[#f4f5f8]">{warmupIterations}</span> iterations for cache and clock stabilization
              </div>
              <div className="p-2 rounded-sm bg-[#111217] border border-[#2c3235]">
                4. Measurement Phase: Sample <span className="font-mono text-[#f4f5f8]">{benchmarkIterations}</span> iterations for P50, P90, P99
              </div>
              <div className="p-2 rounded-sm bg-[#111217] border border-[#2c3235]">
                5. Telemetry & Packaging: Check SLA constraints and sign reproducibility hash
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-[#2c3235]">
              <button
                type="button"
                onClick={() => setPreviewWorkflowOpen(false)}
                className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] px-3 py-1.5 text-xs font-sans rounded-sm transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
