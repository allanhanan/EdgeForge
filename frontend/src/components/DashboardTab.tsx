"use client";

import React, { useState } from "react";
import {
  Layers,
  Cpu,
  FlaskConical,
  Zap,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Activity,
  Sliders,
  Sparkles,
  Package,
  Wrench,
  Gauge,
  GitCompare,
} from "lucide-react";
import { ModelRecord, HardwareDevice, Experiment, BenchmarkRun, seedSampleModel } from "@/lib/api";
import { TabType, WorkflowGoal } from "./Navigation";

interface DashboardTabProps {
  models: ModelRecord[];
  hardware: HardwareDevice[];
  experiments: Experiment[];
  runs: BenchmarkRun[];
  setActiveTab: (tab: TabType) => void;
  onQuickBenchmark: () => void;
  activeGoal?: WorkflowGoal;
  onSelectGoal?: (goal: WorkflowGoal) => void;
  onClearGoal?: () => void;
  onRefreshData?: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  models,
  hardware,
  experiments,
  runs,
  setActiveTab,
  onQuickBenchmark,
  onRefreshData,
}) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const onlineHardware = hardware.filter((h) => h.status === "ONLINE");
  const successfulRuns = runs.filter((r) => r.verified !== false);
  const fastestRun = [...runs].sort((a, b) => a.median_latency_ms - b.median_latency_ms)[0];
  const highestFpsRun = [...runs].sort((a, b) => b.fps - a.fps)[0];

  const handleSeedSample = async () => {
    setIsSeeding(true);
    setSeedMessage(null);
    try {
      const model = await seedSampleModel();
      setSeedMessage(`Registered sample model "${model.name}".`);
      onRefreshData?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedMessage(`Failed to register sample model: ${msg}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[11px] text-teal-300 font-mono shadow-sm">
            <Zap className="h-3 w-3 text-teal-400" />
            Meta Global AI Developer Hackathon 2026
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Good afternoon.
          </h1>
          <p className="text-sm text-zinc-300 font-sans">
            Your edge AI deployment workspace
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveTab("workbench")}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md transition-all font-sans"
          >
            <Sliders className="h-3.5 w-3.5 fill-zinc-950" />
            <span>New Benchmark</span>
          </button>
          <button
            onClick={() => setActiveTab("models")}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 transition-all font-sans"
          >
            <Layers className="h-3.5 w-3.5 text-zinc-400" />
            <span>Upload Model</span>
          </button>
          <button
            onClick={() => setActiveTab("agent")}
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-950/40 hover:bg-purple-900/40 px-4 py-2 text-xs font-semibold text-purple-200 transition-all font-sans"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Ask AI Engineer</span>
          </button>
        </div>
      </div>

      {/* 4 Central Workspace KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Models */}
        <div
          onClick={() => setActiveTab("models")}
          className="glass-card rounded-2xl p-5 space-y-2 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Models</span>
            <Layers className="h-4 w-4 text-teal-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-zinc-100 font-mono tracking-tight">
              {models.length}
            </div>
            <p className="mt-1 text-xs text-zinc-400 font-sans">
              {models.length === 0 ? "No models registered" : "Ready for execution"}
            </p>
          </div>
        </div>

        {/* KPI 2: Experiments */}
        <div
          onClick={() => setActiveTab("experiments")}
          className="glass-card rounded-2xl p-5 space-y-2 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Experiments</span>
            <FlaskConical className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-zinc-100 font-mono tracking-tight">
              {experiments.length}
            </div>
            <p className="mt-1 text-xs text-zinc-400 font-sans">
              Recorded sweeps & jobs
            </p>
          </div>
        </div>

        {/* KPI 3: Connected Devices */}
        <div
          onClick={() => setActiveTab("hardware")}
          className="glass-card rounded-2xl p-5 space-y-2 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Connected Devices</span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-zinc-100 font-mono tracking-tight">
              {onlineHardware.length}
            </div>
            <p className="mt-1 text-xs text-zinc-400 font-sans">
              Physical local silicon workers
            </p>
          </div>
        </div>

        {/* KPI 4: Successful Runs */}
        <div
          onClick={() => setActiveTab("compare")}
          className="glass-card rounded-2xl p-5 space-y-2 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Successful Runs</span>
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-teal-300 font-mono tracking-tight">
              {successfulRuns.length}
            </div>
            <p className="mt-1 text-xs text-zinc-400 font-sans">
              Verified profiling records
            </p>
          </div>
        </div>
      </div>

      {/* Zero Models Notification / Seed Action */}
      {models.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-200 font-sans">
              No models in registry
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Upload an ONNX model or register our reference YOLOv8n object detection model to begin benchmarking.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleSeedSample}
              disabled={isSeeding}
              className="flex items-center gap-2 rounded-xl bg-teal-500/10 border border-teal-500/30 px-4 py-2 text-xs font-bold text-teal-300 hover:bg-teal-500/20 transition-all font-sans disabled:opacity-50"
            >
              <Zap className={`h-3.5 w-3.5 ${isSeeding ? "animate-spin" : ""}`} />
              <span>{isSeeding ? "Registering..." : "Register Sample YOLOv8n"}</span>
            </button>
            <button
              onClick={() => setActiveTab("models")}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all font-sans"
            >
              Upload ONNX
            </button>
          </div>
        </div>
      )}

      {seedMessage && (
        <div className="rounded-xl bg-zinc-900/90 border border-teal-500/30 p-3 text-xs text-teal-300 font-mono flex items-center justify-between">
          <span>{seedMessage}</span>
          <button onClick={() => setSeedMessage(null)} className="text-zinc-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Core Engineering Workflows (High density, clean cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("hardware")}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2 hover:border-emerald-500/50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              Hardware Sizing
            </span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 font-sans">
            Evaluate Edge Silicon
          </h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Filter Jetson, Raspberry Pi, Hailo-8, and Intel NPU against latency, budget, and power constraints.
          </p>
          <div className="pt-2 flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <span>Open Hardware Lab</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("workbench")}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2 hover:border-teal-500/50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">
              Profiling Engine
            </span>
            <Gauge className="h-4 w-4 text-teal-400" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 font-sans">
            Profile Performance
          </h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Run real nanosecond latency benchmarks, batch throughput sweeps, and peak RSS memory profiling.
          </p>
          <div className="pt-2 flex items-center gap-1 text-xs font-semibold text-teal-400">
            <span>Configure Benchmark</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("agent")}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2 hover:border-purple-500/50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">
              AI Optimization
            </span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 font-sans">
            Precision Tuning & Quantization
          </h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Analyze INT8 calibration loss, operator placement, and accuracy-recovery search guided by Meta AI.
          </p>
          <div className="pt-2 flex items-center gap-1 text-xs font-semibold text-purple-400">
            <span>Ask AI Engineer</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("deployments")}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2 hover:border-cyan-500/50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Packaging & Ship
            </span>
            <Package className="h-4 w-4 text-cyan-400" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 font-sans">
            Export Deployment Bundle
          </h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Generate self-contained ZIP bundles with verified Python wrappers, config, and local sandbox verification.
          </p>
          <div className="pt-2 flex items-center gap-1 text-xs font-semibold text-cyan-400">
            <span>Export Bundle</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Hardware Fleet Status & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hardware Fleet (5 Cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-zinc-200 font-sans">Hardware Fleet Status</h3>
            </div>
            <button
              onClick={() => setActiveTab("hardware")}
              className="text-xs text-teal-400 hover:text-teal-300 font-mono flex items-center gap-1 transition-colors"
            >
              Lab Fleet <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {hardware.slice(0, 5).map((hw) => {
              const isOnline = hw.status === "ONLINE";
              return (
                <div
                  key={hw.id}
                  onClick={() => setActiveTab("hardware")}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-xs hover:border-zinc-700/80 cursor-pointer transition-all duration-150"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      {isOnline && (
                        <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          isOnline
                            ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                            : hw.status === "SIMULATED"
                            ? "bg-purple-400"
                            : "bg-zinc-600"
                        }`}
                      />
                    </span>
                    <div>
                      <div className="font-semibold text-zinc-200 truncate max-w-[170px] font-sans">
                        {hw.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {hw.is_local ? "Physical Local Host" : "Profiled Target"} • {hw.tdp_watts ? `${hw.tdp_watts}W TDP` : "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ${
                        isOnline
                          ? "bg-emerald-950/70 border border-emerald-500/40 text-emerald-400"
                          : "bg-purple-950/60 border border-purple-500/30 text-purple-300"
                      }`}
                    >
                      {hw.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed (7 Cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-zinc-200 font-sans">Recent Activity</h3>
            </div>
            <button
              onClick={() => setActiveTab("experiments")}
              className="text-xs text-teal-400 hover:text-teal-300 font-mono flex items-center gap-1 transition-colors"
            >
              All Runs <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Standard spec activity entries */}
            <div
              onClick={() => setActiveTab("experiments")}
              className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 text-xs hover:border-teal-500/60 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <div>
                  <div className="font-semibold text-zinc-200 font-mono">
                    YOLOv8n · ONNX Runtime
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    FP32 • Intel Core i7 CPU • Batch 1
                  </div>
                </div>
              </div>
              <span className="rounded-md bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                Completed
              </span>
            </div>

            <div
              onClick={() => setActiveTab("experiments")}
              className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 text-xs hover:border-teal-500/60 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <div>
                  <div className="font-semibold text-zinc-200 font-mono">
                    YOLOv8n · TensorRT INT8
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    INT8 Dynamic • NVIDIA RTX 4060 GPU
                  </div>
                </div>
              </div>
              <span className="rounded-md bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                Completed
              </span>
            </div>

            <div
              onClick={() => setActiveTab("hardware")}
              className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 text-xs hover:border-amber-500/60 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                <div>
                  <div className="font-semibold text-zinc-300 font-mono">
                    YOLOv8s · Hailo
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    Requires Hailo-8 M.2 hardware worker
                  </div>
                </div>
              </div>
              <span className="rounded-md bg-zinc-800/90 border border-zinc-700/80 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-300">
                Not configured
              </span>
            </div>

            {/* Dynamic recent runs */}
            {runs.slice(0, 2).map((run) => (
              <div
                key={run.id}
                onClick={() => setActiveTab("experiments")}
                className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-950/50 p-3 text-xs hover:border-zinc-700/80 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  <div>
                    <div className="font-semibold text-zinc-200 font-mono truncate max-w-[180px]">
                      {run.model_id} · {run.runtime}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {run.precision.toUpperCase()} • {run.median_latency_ms.toFixed(1)}ms P50
                    </div>
                  </div>
                </div>
                <span className="rounded-md bg-teal-950/60 border border-teal-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-teal-300">
                  {run.fps.toFixed(0)} FPS
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
