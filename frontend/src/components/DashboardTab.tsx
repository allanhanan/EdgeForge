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
  const fastestRun = [...runs].sort((a, b) => a.median_latency_ms - b.median_latency_ms)[0];
  const highestFpsRun = [...runs].sort((a, b) => b.fps - a.fps)[0];

  return (
    <div className="space-y-6">
      {/* Top Welcome / Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/90 via-zinc-900/40 to-zinc-950 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs text-teal-300 font-mono shadow-sm">
              <Zap className="h-3 w-3 text-teal-400" />
              Meta Global AI Developer Hackathon 2026
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
              Vendor-Neutral Edge AI Intelligence Engine
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
              Benchmark models on real local silicon (Intel CPU & RTX 4060 GPU), inspect ONNX operator graphs,
              evaluate true detection mAP, profile edge devices (Jetson, Raspberry Pi, Hailo, NPU),
              and receive evidence-grounded deployment recommendations from the Meta AI Engineer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab("workbench")}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-5 py-3 text-xs font-bold text-zinc-950 shadow-lg shadow-teal-500/20 hover:brightness-110 active:scale-95 transition-all duration-150"
            >
              <Zap className="h-4 w-4 fill-zinc-950" />
              Launch Workbench
            </button>
            <button
              onClick={() => setActiveTab("agent")}
              className="flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-800 px-5 py-3 text-xs font-semibold text-zinc-200 transition-all duration-150 backdrop-blur-sm"
            >
              Ask Meta AI
              <ArrowRight className="h-3.5 w-3.5 text-teal-400" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Models Registered */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Models Registry</span>
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-100 font-mono tracking-tight">
                {models.length}
              </span>
              <span className="text-xs text-zinc-400 font-mono">verified ONNX</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400 truncate">
              {models.length > 0 ? models[0].name : "No models registered"}
            </p>
          </div>
        </div>

        {/* Online Accelerators */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Silicon Targets</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-100 font-mono tracking-tight">
                {hardware.length}
              </span>
              <span className="text-xs text-emerald-400 font-mono font-medium">
                ({onlineHardware.length} Physical Online)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Local CPU & NVIDIA GPU active
            </p>
          </div>
        </div>

        {/* Fastest Latency */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Fastest Verified</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-teal-300 font-mono tracking-tight">
                {fastestRun ? `${fastestRun.median_latency_ms.toFixed(1)}ms` : "--"}
              </span>
              <span className="text-xs text-zinc-400 font-mono">P50 median</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400 font-mono">
              {highestFpsRun ? `${highestFpsRun.fps.toFixed(0)} FPS peak rate` : "No runs yet"}
            </p>
          </div>
        </div>

        {/* Total Experiments */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="tracking-wider uppercase text-[11px] font-medium">Benchmark Runs</span>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FlaskConical className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-100 font-mono tracking-tight">
                {runs.length}
              </span>
              <span className="text-xs text-zinc-400 font-mono">profile records</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              {experiments.filter((e) => e.status === "COMPLETED").length} completed jobs
            </p>
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
