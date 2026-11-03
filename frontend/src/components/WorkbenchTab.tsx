"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sliders,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Activity,
  Terminal,
  Cpu,
  Layers,
  Database,
  ChevronRight,
  TrendingUp,
  Flame,
  Award,
  Shield,
  Info,
  Check,
  Eye,
  HelpCircle,
  RefreshCw,
  AlertTriangle,
  Workflow,
  X,
  Gauge,
  FileCode,
  Sparkles,
  ArrowRight,
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
} from "@/lib/api";
import { TabType } from "./Navigation";

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
}) => {
  const modelInit = initialModelId || preselectedModelId;
  const datasetInit = initialDatasetId || preselectedDatasetId;

  // Mode Selection: Guided vs Advanced
  const [workbenchMode, setWorkbenchMode] = useState<"guided" | "advanced">("guided");

  // Common Form Selections
  const [selectedModelId, setSelectedModelId] = useState<string>(
    modelInit || models[0]?.id || ""
  );
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    datasetInit || (datasets.length > 0 ? datasets[0].id : "")
  );

  // Guided Mode Constraints
  const [guidedHardwareTarget, setGuidedHardwareTarget] = useState<string>("all");
  const [maxLatencyMs, setMaxLatencyMs] = useState<number>(30);
  const [maxPowerWatts, setMaxPowerWatts] = useState<number>(15);
  const [hardwareBudget, setHardwareBudget] = useState<number>(300);
  const [maxMapDropPoints, setMaxMapDropPoints] = useState<number>(1.0);
  const [previewWorkflowOpen, setPreviewWorkflowOpen] = useState(false);

  // Advanced Mode Selections
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>(
    hardware[0]?.id || "cpu-local"
  );
  const [precision, setPrecision] = useState<string>("fp32");
  const [batchSize, setBatchSize] = useState<number>(1);
  const [warmupIterations, setWarmupIterations] = useState<number>(5);
  const [benchmarkIterations, setBenchmarkIterations] = useState<number>(30);
  const [executionProvider, setExecutionProvider] = useState<string>("auto");
  const [calibrationMethod, setCalibrationMethod] = useState<string>("entropy");
  const [compilerFlags, setCompilerFlags] = useState<string>("--fp16 --optLevel=3");
  const [enablePowerTelemetry, setEnablePowerTelemetry] = useState<boolean>(true);
  const [enableCpuFallbackAudit, setEnableCpuFallbackAudit] = useState<boolean>(true);

  // Failure & Diagnostic Scenario Showcase
  const [activeScenario, setActiveScenario] = useState<"D" | "E" | "F" | "G" | "H" | "VAR" | "RES">("D");
  const [scenarioDStep, setScenarioDStep] = useState<string>("initial"); // 'initial' | 'inspected' | 'ops_checked' | 'fix_proposed' | 'retested'
  const [scenarioGResolved, setScenarioGResolved] = useState<boolean>(false);
  const [varianceStabilized, setVarianceStabilized] = useState<boolean>(false);

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [activeExperiment, setActiveExperiment] = useState<Experiment | null>(null);
  const [latestRun, setLatestRun] = useState<BenchmarkRun | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string>("");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logTerminalEndRef = useRef<HTMLDivElement | null>(null);

  // Sync initial props & async loaded data
  useEffect(() => {
    const id = initialModelId || preselectedModelId;
    if (id) {
      setSelectedModelId(id);
    } else if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [initialModelId, preselectedModelId, models, selectedModelId]);

  useEffect(() => {
    const id = initialDatasetId || preselectedDatasetId;
    if (id) {
      setSelectedDatasetId(id);
    } else if (!selectedDatasetId && datasets.length > 0) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [initialDatasetId, preselectedDatasetId, datasets, selectedDatasetId]);

  useEffect(() => {
    if ((!selectedHardwareId || !hardware.some((h) => h.id === selectedHardwareId)) && hardware.length > 0) {
      setSelectedHardwareId(hardware[0].id);
    }
  }, [hardware, selectedHardwareId]);

  // Adjust default hardware / precision compat
  const selectedHw = hardware.find((h) => h.id === selectedHardwareId);
  useEffect(() => {
    if (selectedHw && !selectedHw.supported_precisions.includes(precision.toLowerCase())) {
      setPrecision(selectedHw.supported_precisions[0] || "fp32");
    }
  }, [selectedHardwareId, selectedHw, precision]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    logTerminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  const handleStartBenchmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId) {
      setErrorMsg("Please select an ONNX model to benchmark.");
      return;
    }

    // Determine target hardware based on mode
    let targetHwId = selectedHardwareId;
    if (workbenchMode === "guided") {
      if (guidedHardwareTarget === "all") {
        // Pick best available local device or first device
        const localHw = hardware.find((h) => h.is_local && h.status === "ONLINE");
        targetHwId = localHw ? localHw.id : (hardware[0]?.id || "cpu-local");
      } else {
        targetHwId = guidedHardwareTarget;
      }
    }

    setIsRunning(true);
    setErrorMsg(null);
    setLatestRun(null);
    setTerminalLogs(
      `[INITIALIZE] Setting up real benchmark experiment session...\n` +
      `[MODE] ${workbenchMode.toUpperCase()} Benchmark Analysis\n` +
      `[HARDWARE] Target Silicon: ${targetHwId}\n` +
      `[PRECISION] Mode: ${precision.toUpperCase()} | Batch Size: ${batchSize}\n` +
      (workbenchMode === "guided"
        ? `[CONSTRAINTS] SLA Target: Max Latency <= ${maxLatencyMs}ms | Max Power <= ${maxPowerWatts}W | Budget <= $${hardwareBudget} | Max mAP Drop <= ${maxMapDropPoints} points\n`
        : `[COMPILER] Flags: ${compilerFlags} | Execution Provider: ${executionProvider}\n`)
    );

    try {
      const exp = await createExperiment({
        name: `Bench_${targetHwId}_${precision}_b${batchSize}_${Date.now().toString().slice(-4)}`,
        model_id: selectedModelId,
        hardware_id: targetHwId,
        dataset_id: selectedDatasetId || undefined,
        precision: precision,
        batch_size: batchSize,
        warmup_runs: warmupIterations,
        benchmark_runs: benchmarkIterations,
      });

      setActiveExperiment(exp);
      setTerminalLogs(
        (prev) =>
          prev +
          `[CREATED] Experiment ID: ${exp.id} registered in database.\n[START] Triggering in-memory inference loop...\n`
      );

      // Launch execution
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
        } catch (pollErr: any) {
          console.error("Polling error:", pollErr);
        }
      }, 700);
    } catch (err: any) {
      setIsRunning(false);
      setErrorMsg(err.message || "Failed to trigger benchmark.");
    }
  };

  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-teal-400 font-semibold tracking-wider">
              Benchmarking Execution Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans mt-0.5">
            <Sliders className="h-5 w-5 text-teal-400" />
            New deployment analysis
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Configure your benchmark objective • Guided mode simplifies controls while Advanced workbench gives deep execution provider tuning.
          </p>
        </div>

        {/* Guided vs Advanced Mode Switcher */}
        <div className="flex items-center gap-2">
          {isRunning && (
            <div className="flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/60 px-3.5 py-1.5 text-xs text-teal-300 font-mono shadow-md mr-2">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
              Executing: {activeExperiment?.progress || 0}%
            </div>
          )}

          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/90 p-1 text-xs font-medium shadow-inner">
            <button
              type="button"
              onClick={() => setWorkbenchMode("guided")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
                workbenchMode === "guided"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-400 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Guided
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchMode("advanced")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
                workbenchMode === "advanced"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-400 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Advanced
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-zinc-200">
            &times;
          </button>
        </div>
      )}

      {/* Main Grid: Form (Left) & Console / Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters (5 Cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-5 shadow-xl border border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 font-sans">
              {workbenchMode === "guided" ? (
                <>
                  <Sparkles className="h-4 w-4 text-teal-400" />
                  <span>Configure your benchmark objective</span>
                </>
              ) : (
                <>
                  <Sliders className="h-4 w-4 text-teal-400" />
                  <span>Advanced Workbench Controls</span>
                </>
              )}
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 uppercase">
              {workbenchMode} Mode
            </span>
          </div>

          <form onSubmit={handleStartBenchmark} className="space-y-4 text-xs font-mono">
            {/* Model Selector (Common) */}
            <div>
              <label className="text-zinc-300 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                <Layers className="h-3.5 w-3.5 text-teal-400" />
                Model
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={isRunning}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none disabled:opacity-50"
              >
                {models.length === 0 ? (
                  <option value="">No models available - seed sample first</option>
                ) : (
                  models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.task_type.replace("_", " ")} ({(m.file_size_bytes / (1024 * 1024)).toFixed(1)} MB)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* GUIDED MODE CONTROLS */}
            {workbenchMode === "guided" && (
              <div className="space-y-4">
                {/* Target Hardware Dropdown */}
                <div>
                  <label className="text-zinc-300 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                    <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                    Target hardware
                  </label>
                  <select
                    value={guidedHardwareTarget}
                    onChange={(e) => setGuidedHardwareTarget(e.target.value)}
                    disabled={isRunning}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="all">All available devices (Autonomous Fleet Analysis)</option>
                    {hardware.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} [{h.status}] ({h.vendor} • {h.tdp_watts ? `${h.tdp_watts}W` : "N/A"})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-zinc-500 font-sans">
                    EdgeForge will dispatch to connected workers and evaluate candidate runtimes.
                  </p>
                </div>

                {/* Deployment Constraints Section */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-3">
                  <span className="text-[11px] font-sans font-bold text-zinc-300 uppercase tracking-wider block">
                    Deployment constraints
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Max Latency */}
                    <div>
                      <label className="text-zinc-400 block mb-1 font-sans text-[11px]">
                        Maximum latency (ms)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={maxLatencyMs}
                        onChange={(e) => setMaxLatencyMs(Number(e.target.value))}
                        disabled={isRunning}
                        placeholder="30"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    {/* Max Power */}
                    <div>
                      <label className="text-zinc-400 block mb-1 font-sans text-[11px]">
                        Maximum power (W)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={maxPowerWatts}
                        onChange={(e) => setMaxPowerWatts(Number(e.target.value))}
                        disabled={isRunning}
                        placeholder="15"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    {/* Hardware Budget */}
                    <div>
                      <label className="text-zinc-400 block mb-1 font-sans text-[11px]">
                        Hardware budget ($)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={10000}
                        value={hardwareBudget}
                        onChange={(e) => setHardwareBudget(Number(e.target.value))}
                        disabled={isRunning}
                        placeholder="300"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    {/* Maximum mAP drop with explicit points clarification */}
                    <div>
                      <label className="text-zinc-400 block mb-1 font-sans text-[11px]">
                        Maximum mAP drop (points)
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        max={20}
                        value={maxMapDropPoints}
                        onChange={(e) => setMaxMapDropPoints(Number(e.target.value))}
                        disabled={isRunning}
                        placeholder="1.0"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Explicit definition banner required by spec */}
                  <div className="rounded-lg bg-teal-500/10 border border-teal-500/20 p-2.5 text-[11px] font-sans text-teal-300 leading-snug flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-teal-400" />
                    <span>
                      <strong>Precision definition:</strong> A drop from 0.80 to 0.79 is 1 percentage point, not a 1% relative loss. EdgeForge enforces absolute mAP points.
                    </span>
                  </div>
                </div>

                {/* Action Buttons for Guided Mode */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setPreviewWorkflowOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-all"
                  >
                    <Workflow className="h-3.5 w-3.5 text-teal-400" />
                    Preview benchmark workflow
                  </button>

                  <button
                    type="submit"
                    disabled={isRunning || models.length === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 py-3 text-xs font-bold text-zinc-950 transition-all hover:brightness-110 disabled:opacity-50 active:scale-98 shadow-lg shadow-teal-500/20"
                  >
                    {isRunning ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                        Running Analysis...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-zinc-950" />
                        Launch Benchmark Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ADVANCED WORKBENCH CONTROLS */}
            {workbenchMode === "advanced" && (
              <div className="space-y-4">
                {/* Hardware Target Selector */}
                <div>
                  <label className="text-zinc-300 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                    <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                    Hardware Target Device
                  </label>
                  <select
                    value={selectedHardwareId}
                    onChange={(e) => setSelectedHardwareId(e.target.value)}
                    disabled={isRunning}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none disabled:opacity-50"
                  >
                    {hardware.map((h) => (
                      <option key={h.id} value={h.id}>
                        [{h.status}] {h.name} ({h.vendor} • {h.tdp_watts || "?"}W)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Validation Dataset (Optional for mAP) */}
                <div>
                  <label className="text-zinc-300 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                    <Database className="h-3.5 w-3.5 text-cyan-400" />
                    Validation Dataset (Evaluates mAP accuracy)
                  </label>
                  <select
                    value={selectedDatasetId}
                    onChange={(e) => setSelectedDatasetId(e.target.value)}
                    disabled={isRunning}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">None (Synthetic Tensor Inputs, Latency Only)</option>
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.num_samples} frames, {d.classes?.length || 0} classes)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Precision & Execution Provider */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-sans font-medium">Precision</label>
                    <select
                      value={precision}
                      onChange={(e) => setPrecision(e.target.value)}
                      disabled={isRunning}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none uppercase"
                    >
                      <option value="fp32">FP32 (Single)</option>
                      <option value="fp16">FP16 (Half)</option>
                      <option value="int8">INT8 (Quantized)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1 font-sans font-medium">Execution Provider</label>
                    <select
                      value={executionProvider}
                      onChange={(e) => setExecutionProvider(e.target.value)}
                      disabled={isRunning}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="auto">Auto Select</option>
                      <option value="CPUExecutionProvider">CPUExecutionProvider</option>
                      <option value="CUDAExecutionProvider">CUDAExecutionProvider</option>
                      <option value="TensorrtExecutionProvider">TensorrtExecutionProvider</option>
                      <option value="OpenVINOExecutionProvider">OpenVINOExecutionProvider</option>
                    </select>
                  </div>
                </div>

                {/* Batch Size & Iterations */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-sans font-medium">Batch Size</label>
                    <select
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      disabled={isRunning}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={4}>4</option>
                      <option value={8}>8</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1 font-sans font-medium">Warmup</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={warmupIterations}
                      onChange={(e) => setWarmupIterations(Number(e.target.value))}
                      disabled={isRunning}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1 font-sans font-medium">Repeats</label>
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={benchmarkIterations}
                      onChange={(e) => setBenchmarkIterations(Number(e.target.value))}
                      disabled={isRunning}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Calibration & Compiler Flags */}
                <div className="space-y-2 pt-1 border-t border-zinc-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 block mb-1 font-sans font-medium">Calibration</label>
                      <select
                        value={calibrationMethod}
                        onChange={(e) => setCalibrationMethod(e.target.value)}
                        disabled={isRunning}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                      >
                        <option value="entropy">Entropy (KL)</option>
                        <option value="minmax">MinMax</option>
                        <option value="percentile">Percentile 99.9%</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-zinc-400 block mb-1 font-sans font-medium">Compiler Flags</label>
                      <input
                        type="text"
                        value={compilerFlags}
                        onChange={(e) => setCompilerFlags(e.target.value)}
                        disabled={isRunning}
                        placeholder="--fp16 --optLevel=3"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Telemetry Toggles */}
                  <div className="flex items-center justify-between text-[11px] font-sans text-zinc-400 pt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enablePowerTelemetry}
                        onChange={(e) => setEnablePowerTelemetry(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-teal-400 focus:ring-0"
                      />
                      <span>Power Telemetry</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableCpuFallbackAudit}
                        onChange={(e) => setEnableCpuFallbackAudit(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-teal-400 focus:ring-0"
                      />
                      <span>CPU Fallback Audit</span>
                    </label>
                  </div>
                </div>

                {/* Launch Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isRunning || models.length === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 py-3 text-xs font-bold text-zinc-950 transition-all hover:brightness-110 disabled:opacity-50 active:scale-98 shadow-lg shadow-teal-500/20"
                  >
                    {isRunning ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                        Executing In-Memory Profiling...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-zinc-950" />
                        Execute Real Benchmark
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right: Live Terminal, KPIs, & Scenarios (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Progress Bar if Running */}
          {isRunning && (
            <div className="rounded-2xl border border-teal-500/40 bg-teal-950/25 p-4 space-y-2 shadow-lg">
              <div className="flex justify-between text-xs font-mono text-zinc-300">
                <span className="flex items-center gap-2 text-teal-300 font-semibold">
                  <Activity className="h-4 w-4 animate-pulse" />
                  Running Benchmark Job ({activeExperiment?.status})
                </span>
                <span className="font-bold text-teal-400">{activeExperiment?.progress || 0}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${activeExperiment?.progress || 5}%` }}
                />
              </div>
            </div>
          )}

          {/* Results Summary Card if completed */}
          {latestRun && (
            <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl border-teal-500/40 bg-zinc-900/60">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 font-sans">
                      Verified Benchmark Result
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Target: {latestRun.hardware_id} • {latestRun.precision.toUpperCase()} • Batch {latestRun.batch_size}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("compare")}
                    className="rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all"
                  >
                    Compare Runs
                  </button>
                  <button
                    onClick={() => setActiveTab("deployments")}
                    className="rounded-lg bg-gradient-to-r from-teal-500 to-emerald-400 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-sm shadow-teal-500/20 transition-all"
                  >
                    Export Package
                  </button>
                </div>
              </div>

              {/* 6 Key KPIs */}
              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-semibold">MEDIAN P50</span>
                  <span className="text-xl font-extrabold text-teal-300 tracking-tight">
                    {latestRun.median_latency_ms.toFixed(2)} ms
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Mean: {latestRun.mean_latency_ms.toFixed(2)} ms
                  </span>
                </div>

                <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-semibold">TAIL LATENCY (P95)</span>
                  <span className="text-xl font-extrabold text-cyan-300 tracking-tight">
                    {latestRun.p95_latency_ms.toFixed(2)} ms
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    P99: {latestRun.p99_latency_ms.toFixed(2)} ms
                  </span>
                </div>

                <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-semibold">THROUGHPUT</span>
                  <span className="text-xl font-extrabold text-emerald-300 tracking-tight">
                    {latestRun.fps.toFixed(1)} FPS
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Batch Size {latestRun.batch_size}
                  </span>
                </div>

                <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-semibold">MEMORY USAGE</span>
                  <span className="text-xl font-extrabold text-zinc-100 tracking-tight">
                    {latestRun.memory_rss_mb.toFixed(1)} MB
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    RSS System Memory
                  </span>
                </div>

                <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-semibold">POWER (W)</span>
                  <span className="text-xl font-extrabold text-amber-300 tracking-tight">
                    {latestRun.avg_power_watts ? (
                      `${latestRun.avg_power_watts.toFixed(1)}W`
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        Not measured
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    {latestRun.avg_power_watts ? "Live sampled sensor" : "Sensor unavailable"}
                  </span>
                </div>

                <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-semibold">ACCURACY mAP@50</span>
                  <span className="text-xl font-extrabold text-purple-300 tracking-tight">
                    {latestRun.map50 !== null && latestRun.map50 !== undefined
                      ? (latestRun.map50 * 100).toFixed(1) + "%"
                      : "N/A (Synthetic)"}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    {latestRun.map50_95 ? `mAP 50-95: ${(latestRun.map50_95 * 100).toFixed(1)}%` : "Ground-truth"}
                  </span>
                </div>
              </div>

              {/* Deployment Constraints SLA Verification (Section 2 Step 6 & Section 3) */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-teal-400" />
                    <span className="text-xs font-bold font-sans text-zinc-100">
                      Deployment Constraints SLA Verification
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    latestRun.median_latency_ms <= maxLatencyMs
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                  }`}>
                    {latestRun.median_latency_ms <= maxLatencyMs ? "Constraints Satisfied" : "Constraints Violated"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  {/* Latency check */}
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 text-[10px] block font-semibold">MAX LATENCY</span>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-200 font-bold">{latestRun.median_latency_ms.toFixed(1)} ms</span>
                      <span className={`text-[10px] font-bold ${
                        latestRun.median_latency_ms <= maxLatencyMs ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {latestRun.median_latency_ms <= maxLatencyMs ? "<=" : ">"} {maxLatencyMs} ms
                      </span>
                    </div>
                  </div>

                  {/* Power check */}
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 text-[10px] block font-semibold">MAX POWER</span>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-200 font-bold">
                        {latestRun.avg_power_watts ? `${latestRun.avg_power_watts.toFixed(1)} W` : "Not measured"}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        limit: {maxPowerWatts} W
                      </span>
                    </div>
                  </div>

                  {/* Budget check */}
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 text-[10px] block font-semibold">HARDWARE BUDGET</span>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-200 font-bold">
                        ${hardware.find((h) => h.id === latestRun.hardware_id)?.cost_usd || 0}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        &lt;= ${hardwareBudget}
                      </span>
                    </div>
                  </div>

                  {/* mAP drop check */}
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 text-[10px] block font-semibold">MAX mAP DROP</span>
                    <div className="flex items-center justify-between">
                      <span className="text-purple-300 font-bold">
                        {latestRun.map50 !== null && latestRun.map50 !== undefined ? `${(latestRun.map50 * 100).toFixed(1)}%` : "Synthetic"}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        limit: &lt;= {maxMapDropPoints} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Next Action Banner */}
                <div className={`p-3 rounded-lg text-xs font-sans flex items-start gap-2 border ${
                  latestRun.median_latency_ms <= maxLatencyMs
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-950/30 border-amber-500/30 text-amber-300"
                }`}>
                  <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-teal-400" />
                  <div>
                    <strong>AI Deployment Engineer Verdict: </strong>
                    {latestRun.median_latency_ms <= maxLatencyMs
                      ? `Candidate passes latency constraint (${latestRun.median_latency_ms.toFixed(1)} ms <= ${maxLatencyMs} ms). Verified and ready for deployment bundle export.`
                      : `Candidate violates SLA latency (${latestRun.median_latency_ms.toFixed(1)} ms > ${maxLatencyMs} ms). AI recommendation: Apply INT8 quantization with Entropy calibration or evaluate FP16 TensorRT to satisfy latency target.`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Streaming Log Terminal */}
          <div className="rounded-2xl border border-zinc-800/90 bg-[#090a0f] p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-zinc-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-teal-400" />
                  edgeforge@worker:~/benchmark
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-teal-400">
                {isRunning ? "STREAMING" : "IDLE"}
              </span>
            </div>

            <div className="h-44 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1 bg-black/50 p-3.5 rounded-xl border border-zinc-900 leading-relaxed">
              {terminalLogs ? (
                terminalLogs.split("\n").map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes("ERROR") || line.includes("FAILED")
                        ? "text-red-400"
                        : line.includes("completed successfully")
                        ? "text-emerald-400 font-semibold"
                        : line.includes("Applying") || line.includes("Warmup")
                        ? "text-teal-300"
                        : "text-zinc-400"
                    }
                  >
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 italic">
                  Configure requirements and click &quot;Launch Benchmark Analysis&quot; to begin.
                </div>
              )}
              <div ref={logTerminalEndRef} />
            </div>
          </div>

          {/* Interactive Failure & Edge-Case Diagnostics Laboratory (Scenarios D, E, F, G, H) */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">
                  Edge Engineering Diagnostics Laboratory
                </span>
                <h3 className="text-sm font-bold text-zinc-100 font-sans">
                  Failure Recovery & Hardware Edge Scenarios
                </h3>
              </div>

              {/* Scenario Selector Pills */}
              <div className="flex flex-wrap gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveScenario("D")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeScenario === "D"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Scenario D: Op Crash
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenario("E")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeScenario === "E"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Scenario E: INT8 Loss
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenario("F")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeScenario === "F"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Scenario F: CPU Fallback
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenario("G")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeScenario === "G"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Scenario G: OOM
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenario("H")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeScenario === "H"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Scenario H: Power
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenario("VAR")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeScenario === "VAR"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Scenario 10: Jitter
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenario("RES")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeScenario === "RES"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Scenario 18: Resolution
                </button>
              </div>
            </div>

            {/* SCENARIO D: Model Conversion Fails */}
            {activeScenario === "D" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-rose-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-bold text-rose-300 font-sans">
                        Compatibility analysis: Failed
                      </div>
                      <div className="text-[11px] text-rose-400/90">
                        Compiler output: Unsupported operator detected at node 147
                      </div>
                    </div>
                  </div>
                  <span className="rounded bg-rose-950 border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300 font-bold">
                    Node: GridSampler_147
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-teal-400 font-semibold font-sans">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Deployment Engineer Diagnostic</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] font-sans leading-relaxed">
                    The target compiler rejected an operator in the exported graph. I can inspect the
                    surrounding graph, check supported alternatives, and propose a compatible re-export
                    or graph transformation.
                  </p>

                  {/* Interactive Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setScenarioDStep("inspected")}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-sans font-medium transition-all ${
                        scenarioDStep === "inspected"
                          ? "bg-teal-500/20 border-teal-500 text-teal-300"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      Inspect graph
                    </button>
                    <button
                      type="button"
                      onClick={() => setScenarioDStep("ops_checked")}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-sans font-medium transition-all ${
                        scenarioDStep === "ops_checked"
                          ? "bg-teal-500/20 border-teal-500 text-teal-300"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      Check supported ops
                    </button>
                    <button
                      type="button"
                      onClick={() => setScenarioDStep("fix_proposed")}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-sans font-medium transition-all ${
                        scenarioDStep === "fix_proposed"
                          ? "bg-teal-500/20 border-teal-500 text-teal-300"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      Propose fix
                    </button>
                    <button
                      type="button"
                      onClick={() => setScenarioDStep("retested")}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-sans font-semibold transition-all ${
                        scenarioDStep === "retested"
                          ? "bg-emerald-500 text-zinc-950"
                          : "border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/70"
                      }`}
                    >
                      Retest
                    </button>
                  </div>

                  {/* Step Feedback Box */}
                  {scenarioDStep === "inspected" && (
                    <div className="p-3 mt-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                      <div className="text-teal-300 font-semibold font-mono">
                        Node 147: OpType=&quot;GridSampler&quot; [Domain=&quot;ai.onnx&quot;]
                      </div>
                      <p>Inputs: [input_tensor_3 (1x64x80x80), grid_coords (1x80x80x2)]</p>
                      <p className="text-zinc-500">Root cause: Target edge compiler does not support 5D bicubic sampling. Nearest neighbor bilinear mode is required.</p>
                    </div>
                  )}

                  {scenarioDStep === "ops_checked" && (
                    <div className="p-3 mt-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                      <div className="text-teal-300 font-semibold font-mono">Target Hardware Operator Registry:</div>
                      <p>• Supported: Resize (Bilinear), Conv, BatchNorm, Concat, MaxPool, Add, Sigmoid</p>
                      <p>• Unsupported: GridSampler (Bicubic mode), DynamicNonZero</p>
                    </div>
                  )}

                  {scenarioDStep === "fix_proposed" && (
                    <div className="p-3 mt-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] space-y-1 font-mono">
                      <div className="text-teal-300 font-semibold font-sans">Compatible Graph Transformation Patch:</div>
                      <pre className="text-emerald-300 p-2 bg-black/60 rounded border border-zinc-800 overflow-x-auto">
{`# Replace GridSampler with standard Resize Bilinear
torch.onnx.export(
    model, dummy_input, "yolov8n_fixed.onnx",
    opset_version=17,
    do_constant_folding=True
)`}
                      </pre>
                    </div>
                  )}

                  {scenarioDStep === "retested" && (
                    <div className="p-3 mt-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Retest passed! Graph successfully compiled to target runtime engine with 0 unsupported nodes.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCENARIO E: Quantization Accuracy Loss vs Speed */}
            {activeScenario === "E" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="text-zinc-400 text-[11px] font-sans">
                  Illustrative optimization comparison: User requires latency &lt; 30 ms and maximum mAP loss &lt;= 1.0 point.
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="p-2.5 font-medium">Metric</th>
                        <th className="p-2.5 font-medium">FP32 Baseline</th>
                        <th className="p-2.5 font-medium">INT8 Quantized</th>
                        <th className="p-2.5 font-medium text-right">Constraint Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      <tr>
                        <td className="p-2.5 text-zinc-300 font-semibold">Latency</td>
                        <td className="p-2.5 text-zinc-200">45 ms</td>
                        <td className="p-2.5 text-emerald-400 font-bold">22 ms</td>
                        <td className="p-2.5 text-right">
                          <span className="rounded bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300">
                            Too slow in FP32
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-zinc-300 font-semibold">mAP@50</td>
                        <td className="p-2.5 text-purple-300 font-bold">82.0%</td>
                        <td className="p-2.5 text-amber-300">77.5%</td>
                        <td className="p-2.5 text-right">
                          <span className="rounded bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300">
                            Accuracy loss (-4.5 pts)
                          </span>
                        </td>
                      </tr>
                      <tr className="bg-zinc-900/40">
                        <td className="p-2.5 text-zinc-200 font-semibold font-sans">Overall Verdict</td>
                        <td className="p-2.5 text-zinc-400 font-sans">Fails latency</td>
                        <td className="p-2.5 text-zinc-400 font-sans">Fails mAP limit</td>
                        <td className="p-2.5 text-right font-sans">
                          <span className="text-amber-400 font-bold">Neither satisfies both</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3 text-[11px] font-sans text-teal-300 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Meta AI Recommendation:</strong> Do not blindly deploy INT8. Suggested next experiment: Run Entropy-based calibration with 500 images or evaluate FP16 (28 ms, 81.8% mAP) to satisfy both constraints simultaneously.
                  </span>
                </div>
              </div>
            )}

            {/* SCENARIO F: Accelerator Silently Falls Back to CPU */}
            {activeScenario === "F" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-cyan-300 font-semibold font-sans">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="h-4 w-4 text-cyan-400" />
                      Operator Placement & CPU Fallback Telemetry
                    </span>
                    <span className="text-[10px] rounded bg-cyan-900/60 px-2 py-0.5 text-cyan-200">
                      Partial Acceleration Detected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] block">ACCELERATOR EXECUTION</span>
                      <span className="text-base font-bold text-emerald-400">92% of Graph Ops</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">238 / 258 Layers on NPU</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] block">SILENT CPU FALLBACK</span>
                      <span className="text-base font-bold text-amber-400">8% of Graph Ops</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">20 Layers on Host CPU</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed pt-1">
                    <strong>Placement Evidence:</strong> Nodes 192-212 (Bilinear interpolation & ArgMax) fell back to CPU due to missing runtime kernel support. Estimated latency penalty: +4.8 ms.
                  </p>
                  <p className="text-[10px] text-zinc-500 font-sans">
                    *Where the runtime does not expose execution placement reliably, EdgeForge transparently labels results as &quot;Unverified&quot;.
                  </p>
                </div>
              </div>
            )}

            {/* SCENARIO G: Device Memory Exceeded (OOM Recovery) */}
            {activeScenario === "G" && (
              <div className="space-y-3 font-mono text-xs">
                {!scenarioGResolved ? (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 space-y-3">
                    <div className="flex items-center gap-2 text-rose-300 font-bold font-sans">
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                      <span>Out-Of-Memory (OOM) Failure Recorded on Device</span>
                    </div>
                    <p className="text-zinc-300 text-[11px] font-sans leading-relaxed">
                      Target <strong>Jetson Orin Nano (4GB)</strong> exhausted available unified memory during batch 4 inference. Peak memory requested: 4.2 GB / 4.0 GB limit.
                    </p>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
                      <span className="text-teal-400 font-semibold font-sans text-xs">
                        Concrete Recovery Remedies:
                      </span>
                      <ul className="list-disc list-inside text-zinc-300 text-[11px] space-y-1">
                        <li>Reduce inference batch size from 4 to 1 (saves ~2.2 GB).</li>
                        <li>Downscale input resolution from 640x640 to 320x320.</li>
                        <li>Apply INT8 weight quantization (cuts model footprint by 75%).</li>
                      </ul>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setBatchSize(1);
                          setScenarioGResolved(true);
                        }}
                        className="rounded-lg bg-gradient-to-r from-teal-500 to-emerald-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:brightness-110 font-sans"
                      >
                        Apply Batch=1 & Retest
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPrecision("int8");
                          setBatchSize(1);
                          setScenarioGResolved(true);
                        }}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 font-sans"
                      >
                        Apply INT8 + Batch=1
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 space-y-2 text-emerald-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-bold font-sans">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        OOM Resolved: Retest Executed with Batch=1
                      </span>
                      <button
                        type="button"
                        onClick={() => setScenarioGResolved(false)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200 underline"
                      >
                        Reset Demo
                      </button>
                    </div>
                    <p className="text-[11px] font-sans text-zinc-300">
                      Peak memory footprint reduced to 1.1 GB (fits comfortably within 4.0 GB budget). Median latency: 26.4 ms at 37.8 FPS.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SCENARIO H: Power Telemetry Absence */}
            {activeScenario === "H" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-zinc-200 font-semibold">
                      Power Telemetry Boundary Verification
                    </span>
                    <span className="rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300 font-bold font-mono">
                      Not measured
                    </span>
                  </div>
                  <p className="text-zinc-300 text-[11px] font-sans leading-relaxed">
                    EdgeForge never manufactures a fake power reading from a chipmaker&apos;s TDP specification. If the target host lacks a physical power sensor (INA219, RAPL, or IPMI), the metric is truthfully displayed as &quot;Not measured&quot;.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <span className="text-emerald-400 font-bold block">Physical Sensor Present:</span>
                      <span className="text-zinc-300">Reports sampled watts over time and energy per inference (Joules).</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <span className="text-amber-400 font-bold block">Sensor Absent:</span>
                      <span className="text-zinc-400">Shows &quot;Not measured&quot; rather than turning TDP into a measured wattage.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCENARIO 10: Inconsistent Benchmark Variance / Thermal Throttling */}
            {activeScenario === "VAR" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-amber-300 font-sans font-bold">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Inconsistent Benchmark Variance Detected (+-19.2% Jitter)
                    </span>
                    <span className="rounded bg-amber-950 border border-amber-500/40 px-2 py-0.5 text-[10px] text-amber-300 font-bold font-mono">
                      Thermal / CPU Governor
                    </span>
                  </div>

                  <p className="text-zinc-300 text-[11px] font-sans leading-relaxed">
                    Single-iteration runs showed excessive execution variance: Min 22.4 ms vs Max 41.6 ms (P95: 39.8 ms). Root cause: Target CPU thermal throttling or background OS process contention during inference.
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] block">MIN LATENCY</span>
                      <span className="text-emerald-400 font-bold">22.4 ms</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] block">MEDIAN P50</span>
                      <span className="text-teal-300 font-bold">28.1 ms</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-500 text-[10px] block">PEAK JITTER</span>
                      <span className="text-rose-400 font-bold">41.6 ms (+48%)</span>
                    </div>
                  </div>

                  {!varianceStabilized ? (
                    <button
                      type="button"
                      onClick={() => setVarianceStabilized(true)}
                      className="rounded-lg bg-gradient-to-r from-teal-500 to-emerald-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:brightness-110 font-sans"
                    >
                      Run Repeated 50-Iteration Stabilized Benchmark
                    </button>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center justify-between font-sans">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        Variance Stabilized: 50 warmup iterations completed. Coefficient of variation reduced to 1.8% (27.9 +- 0.5 ms).
                      </span>
                      <button
                        type="button"
                        onClick={() => setVarianceStabilized(false)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200 underline font-mono"
                      >
                        Reset Demo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCENARIO 18: Input Resolution Mismatch Warning */}
            {activeScenario === "RES" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-xl border border-teal-500/40 bg-zinc-950/80 p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-teal-300 font-sans font-bold">
                    <span className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-teal-400" />
                      Input Resolution Mismatch Warning
                    </span>
                    <span className="rounded bg-teal-950 border border-teal-500/40 px-2 py-0.5 text-[10px] text-teal-300 font-mono">
                      Dimension Disparity
                    </span>
                  </div>

                  <p className="text-zinc-300 text-[11px] font-sans leading-relaxed">
                    Warning: Comparing Run A (640x640) with Run B (320x320) is invalid. Higher FPS at 320x320 comes from 4x fewer input pixels, not compiler or hardware efficiency.
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                      <span className="text-zinc-200 font-bold block font-sans">Run A: Full Resolution (640x640)</span>
                      <div className="text-zinc-400">Latency: 28.0 ms • mAP@50: 81.8%</div>
                      <span className="text-[10px] text-teal-400 block">High fidelity for small object defects</span>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                      <span className="text-zinc-200 font-bold block font-sans">Run B: Downscaled (320x320)</span>
                      <div className="text-zinc-400">Latency: 14.2 ms • mAP@50: 71.4%</div>
                      <span className="text-[10px] text-amber-400 block">-10.4 point mAP drop due to pixel decimation</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 font-sans italic">
                    EdgeForge explicitly warns developers that runs with different input dimensions are not directly comparable.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Workflow Preview Modal */}
      {previewWorkflowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-teal-500/30 bg-zinc-900/95 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-teal-400" />
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  Preview Benchmark Workflow Plan
                </h3>
              </div>
              <button
                onClick={() => setPreviewWorkflowOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <p className="text-zinc-300">
                EdgeForge will orchestrate the following 6-step deployment validation pipeline for{' '}
                <strong className="text-teal-300">{selectedModel?.name || "Target Model"}</strong>:
              </p>

              <div className="space-y-2.5 font-mono text-[11px]">
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 flex items-start gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 font-bold shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-zinc-200 block font-sans">Model Graph Inspection</strong>
                    <span className="text-zinc-400">Parse ONNX graph, check opset version, validate dynamic shape dimensions, and verify operator compatibility matrix.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 flex items-start gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 font-bold shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-zinc-200 block font-sans">Target Hardware Filtering</strong>
                    <span className="text-zinc-400">Filter online hardware fleet by budget (&lt;= ${hardwareBudget}) and verify physical worker connections.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 flex items-start gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 font-bold shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-zinc-200 block font-sans">Optimization Experiment Sweep</strong>
                    <span className="text-zinc-400">Run baseline FP32, then test supported FP16 and INT8 quantized candidates with calibration dataset.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 flex items-start gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 font-bold shrink-0">
                    4
                  </span>
                  <div>
                    <strong className="text-zinc-200 block font-sans">Physical Silicon Profiling</strong>
                    <span className="text-zinc-400">Execute warmup iterations, sample latency distribution (P50/P95), measure memory RSS, and record live power telemetry.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 flex items-start gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 font-bold shrink-0">
                    5
                  </span>
                  <div>
                    <strong className="text-zinc-200 block font-sans">SLA Constraint Verification</strong>
                    <span className="text-zinc-400">Validate if Latency &lt;= {maxLatencyMs}ms, Power &lt;= {maxPowerWatts}W, and mAP degradation &lt;= {maxMapDropPoints} points.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 flex items-start gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 font-bold shrink-0">
                    6
                  </span>
                  <div>
                    <strong className="text-zinc-200 block font-sans">Deployment Package Generation</strong>
                    <span className="text-zinc-400">Assemble validated model artifact, inference runner, requirements, and reproducibility manifest.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setPreviewWorkflowOpen(false)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setPreviewWorkflowOpen(false);
                  handleStartBenchmark(e);
                }}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20"
              >
                Execute Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
