"use client";

import React from "react";
import {
  Layers,
  Cpu,
  FlaskConical,
  Zap,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Activity,
  Sparkles,
} from "lucide-react";
import { ModelRecord, HardwareDevice, Experiment, BenchmarkRun } from "@/lib/api";
import { TabType } from "./Navigation";

interface DashboardTabProps {
  models: ModelRecord[];
  hardware: HardwareDevice[];
  experiments: Experiment[];
  runs: BenchmarkRun[];
  setActiveTab: (tab: TabType) => void;
  onQuickBenchmark: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  models,
  hardware,
  experiments,
  runs,
  setActiveTab,
  onQuickBenchmark,
}) => {
  const onlineHardware = hardware.filter((h) => h.status === "ONLINE");
  const successfulRuns = runs.filter((r) => r.verified !== false);
  const fastestRun = [...runs].sort((a, b) => a.median_latency_ms - b.median_latency_ms)[0];
  const highestFpsRun = [...runs].sort((a, b) => b.fps - a.fps)[0];

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[11px] text-teal-300 font-mono shadow-sm">
            <Zap className="h-3 w-3 text-teal-400" />
            Meta Global AI Developer Hackathon 2026
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Good afternoon.
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 font-medium">
            Your edge AI deployment workspace
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 text-xs font-mono text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Lab connected: {onlineHardware.length} Physical Workers</span>
          </div>
        </div>
      </div>

      {/* 4 Central KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Models */}
        <div className="glass-card rounded-2xl p-5 space-y-2 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Models</span>
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-zinc-100 font-mono tracking-tight">
              {models.length}
            </div>
            <p className="mt-1 text-xs text-zinc-400 font-sans">
              Models registered in workspace
            </p>
          </div>
        </div>

        {/* KPI 2: Experiments */}
        <div className="glass-card rounded-2xl p-5 space-y-2 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Experiments</span>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FlaskConical className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-zinc-100 font-mono tracking-tight">
              {experiments.length}
            </div>
            <p className="mt-1 text-xs text-zinc-400 font-sans">
              Benchmark sweeps & jobs
            </p>
          </div>
        </div>

        {/* KPI 3: Connected devices */}
        <div className="glass-card rounded-2xl p-5 space-y-2 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Connected devices</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Cpu className="h-4 w-4" />
            </div>
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

        {/* KPI 4: Successful runs */}
        <div className="glass-card rounded-2xl p-5 space-y-2 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Successful runs</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
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

      {/* Start a deployment analysis Hero Card & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hero Card: Start a deployment analysis (7 Cols) */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-zinc-900/95 via-zinc-900/60 to-zinc-950 p-6 sm:p-7 backdrop-blur-md shadow-2xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <span className="text-[11px] font-mono text-teal-400 uppercase tracking-wider font-semibold">
              Deployment Workflow
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              Start a deployment analysis
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans max-w-xl">
              Upload a model or continue with an existing project. EdgeForge inspects ONNX operator
              graphs, validates runtime compatibility, profiles latency on physical silicon, and generates
              ready-to-deploy edge packages.
            </p>
          </div>

          <div className="relative z-10 pt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab("models")}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-teal-500/20 hover:brightness-110 active:scale-95 transition-all duration-150"
            >
              <Layers className="h-4 w-4 fill-zinc-950" />
              Upload Model
            </button>
            <button
              onClick={() => setActiveTab("agent")}
              className="flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-200 transition-all duration-150 backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4 text-teal-400" />
              Ask AI Engineer
            </button>
            <button
              onClick={() => setActiveTab("workbench")}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 px-4 py-2.5 text-xs font-mono text-zinc-300 transition-all duration-150"
            >
              <Zap className="h-3.5 w-3.5 text-teal-400" />
              Configure Benchmarks
            </button>
          </div>
        </div>

        {/* Recent Activity Feed (5 Cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-zinc-200 font-sans">Recent activity</h3>
            </div>
            <button
              onClick={() => setActiveTab("experiments")}
              className="text-xs text-teal-400 hover:text-teal-300 font-mono flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Standard Recent Activity items from spec */}
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

            {/* Dynamically append real runs if available */}
            {runs.slice(0, 2).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-950/50 p-3 text-xs hover:border-zinc-700/80 transition-all"
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

      {/* Main Grid: Hardware Fleet Status & Recent Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware Fleet (1 Col) */}
        <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-teal-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Hardware Fleet</h2>
            </div>
            <button
              onClick={() => setActiveTab("hardware")}
              className="text-xs text-teal-400 hover:text-teal-300 font-mono flex items-center gap-1 transition-colors"
            >
              Lab View <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {hardware.slice(0, 6).map((hw) => {
              const isOnline = hw.status === "ONLINE";
              return (
                <div
                  key={hw.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-xs hover:border-zinc-700/80 transition-all duration-150"
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
                      <div className="font-semibold text-zinc-200 truncate max-w-[160px]">
                        {hw.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {hw.device_type.toUpperCase()} • {hw.tdp_watts ? `${hw.tdp_watts}W TDP` : "N/A"}
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

        {/* Recent Runs Table (2 Cols) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Recent Benchmark Runs</h2>
            </div>
            <button
              onClick={() => setActiveTab("experiments")}
              className="text-xs text-teal-400 hover:text-teal-300 font-mono flex items-center gap-1 transition-colors"
            >
              All Runs <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 border border-dashed border-zinc-800/80 rounded-xl">
              <FlaskConical className="h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-xs font-mono">No benchmarks executed yet</p>
              <button
                onClick={() => setActiveTab("workbench")}
                className="mt-3 rounded-lg bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 text-xs text-teal-300 hover:bg-teal-500/20"
              >
                Execute First Benchmark
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-zinc-400 font-mono">
                    <th className="pb-2.5 font-medium">Hardware Target</th>
                    <th className="pb-2.5 font-medium">Precision</th>
                    <th className="pb-2.5 font-medium">Median (P50)</th>
                    <th className="pb-2.5 font-medium">Tail (P95)</th>
                    <th className="pb-2.5 font-medium">Throughput</th>
                    <th className="pb-2.5 font-medium">mAP@50</th>
                    <th className="pb-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 font-mono">
                  {runs.slice(0, 5).map((run) => {
                    const hw = hardware.find((h) => h.id === run.hardware_id);
                    return (
                      <tr key={run.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3">
                          <div className="font-semibold text-zinc-200 font-sans truncate max-w-[200px]">
                            {hw?.name || run.hardware_id}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {run.hardware_id}
                          </div>
                        </td>
                      <td className="py-3">
                        <span className="rounded-md border border-zinc-700/60 bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-300 uppercase font-semibold">
                          {run.precision}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-teal-300">
                        {run.median_latency_ms.toFixed(2)} ms
                      </td>
                      <td className="py-3 text-zinc-400">
                        {run.p95_latency_ms.toFixed(2)} ms
                      </td>
                      <td className="py-3 text-emerald-400 font-semibold">
                        {run.fps.toFixed(1)} FPS
                      </td>
                      <td className="py-3 text-zinc-300">
                        {run.map50 !== null && run.map50 !== undefined ? (
                          <span className="text-purple-300">{(run.map50 * 100).toFixed(1)}%</span>
                        ) : (
                          <span className="text-zinc-600">--</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setActiveTab("compare")}
                          className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs text-teal-300 hover:bg-teal-500/20 transition-all font-semibold"
                        >
                          Compare
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
