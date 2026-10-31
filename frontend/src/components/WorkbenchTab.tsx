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

  // Form selections
  const [selectedModelId, setSelectedModelId] = useState<string>(
    modelInit || models[0]?.id || ""
  );
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    datasetInit || (datasets.length > 0 ? datasets[0].id : "")
  );
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>(
    hardware[0]?.id || "cpu-local"
  );
  const [precision, setPrecision] = useState<string>("fp32");
  const [batchSize, setBatchSize] = useState<number>(1);
  const [warmupIterations, setWarmupIterations] = useState<number>(5);
  const [benchmarkIterations, setBenchmarkIterations] = useState<number>(30);

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

    setIsRunning(true);
    setErrorMsg(null);
    setLatestRun(null);
    setTerminalLogs(`[INITIALIZE] Setting up real benchmark experiment session...\n[HARDWARE] Selected Target Device: ${selectedHardwareId}\n[PRECISION] Mode: ${precision.toUpperCase()} | Batch Size: ${batchSize}\n`);

    try {
      const exp = await createExperiment({
        name: `Bench_${selectedHardwareId}_${precision}_b${batchSize}_${Date.now().toString().slice(-4)}`,
        model_id: selectedModelId,
        hardware_id: selectedHardwareId,
        dataset_id: selectedDatasetId || undefined,
        precision: precision,
        batch_size: batchSize,
        warmup_runs: warmupIterations,
        benchmark_runs: benchmarkIterations,
      });

      setActiveExperiment(exp);
      setTerminalLogs((prev) => prev + `[CREATED] Experiment ID: ${exp.id} registered in database.\n[START] Triggering in-memory inference loop...\n`);

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
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <Sliders className="h-5 w-5 text-teal-400" />
            Benchmarking Execution Workbench
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Configure precision, hardware execution provider, batch size, and evaluate live metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <div className="flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/60 px-3.5 py-1.5 text-xs text-teal-300 font-mono shadow-md">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
              Executing: {activeExperiment?.progress || 0}%
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-zinc-200">
            &times;
          </button>
        </div>
      )}

      {/* Main Grid: Form (Left) & Live Console / Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters (5 Cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
            <Sliders className="h-4 w-4 text-teal-400" />
            <span>Experiment Parameters</span>
          </div>

          <form onSubmit={handleStartBenchmark} className="space-y-4 text-xs font-mono">
            {/* Model Selector */}
            <div>
              <label className="text-zinc-400 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                <Layers className="h-3.5 w-3.5 text-teal-400" />
                Target ONNX Model
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
                      {m.name} ({(m.file_size_bytes / (1024 * 1024)).toFixed(1)} MB, {m.task_type})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Hardware Target Selector */}
            <div>
              <label className="text-zinc-400 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
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
              {selectedHw && (
                <div className="mt-1.5 text-[10px] text-zinc-400 flex items-center justify-between">
                  <span>Arch: {selectedHw.architecture.slice(0, 32)}</span>
                  <span className={`font-semibold ${selectedHw.is_local ? "text-emerald-400" : "text-purple-400"}`}>
                    {selectedHw.is_local ? "Local Physical Device" : "Simulated Profile"}
                  </span>
                </div>
              )}
            </div>

            {/* Validation Dataset (Optional for mAP) */}
            <div>
              <label className="text-zinc-400 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                <Database className="h-3.5 w-3.5 text-cyan-400" />
                Validation Dataset (Optional - Evaluates true mAP)
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

            {/* Precision & Batch Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1 font-sans font-medium">Precision</label>
                <select
                  value={precision}
                  onChange={(e) => setPrecision(e.target.value)}
                  disabled={isRunning}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none uppercase"
                >
                  <option value="fp32">FP32 (Single Precision)</option>
                  <option value="int8">INT8 (Quantized Engine)</option>
                  <option value="fp16">FP16 (Half Precision)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-sans font-medium">Batch Size</label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                >
                  <option value={1}>Batch 1 (Real-time Edge)</option>
                  <option value={2}>Batch 2</option>
                  <option value={4}>Batch 4</option>
                  <option value={8}>Batch 8 (High Throughput)</option>
                </select>
              </div>
            </div>

            {/* Iterations */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1 font-sans font-medium">Warmup Iterations</label>
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
                <label className="text-zinc-400 block mb-1 font-sans font-medium">Benchmark Iterations</label>
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
          </form>
        </div>

        {/* Right: Live Terminal & Real-Time Results (7 Cols) */}
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
            <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl border-teal-500/40">
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
                  <span className="text-zinc-500 text-[10px] block font-semibold">POWER / TEMP</span>
                  <span className="text-xl font-extrabold text-amber-300 tracking-tight">
                    {latestRun.avg_power_watts ? `${latestRun.avg_power_watts.toFixed(1)}W` : "--"}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    {latestRun.avg_temperature_c ? `${latestRun.avg_temperature_c.toFixed(0)}°C` : "Nominal"}
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
            </div>
          )}

          {/* Streaming Log Terminal */}
          <div className="rounded-2xl border border-zinc-800/90 bg-[#090a0f] p-4 space-y-3 shadow-2xl">
            {/* macOS Window Titlebar */}
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

            <div className="h-64 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1 bg-black/50 p-3.5 rounded-xl border border-zinc-900 leading-relaxed">
              {terminalLogs ? (
                terminalLogs.split("\n").map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes("ERROR")
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
                  No execution logs yet. Configure settings and click &quot;Execute Real Benchmark&quot; to begin.
                </div>
              )}
              <div ref={logTerminalEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
