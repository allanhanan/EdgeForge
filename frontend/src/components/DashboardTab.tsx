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
      <div className="rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-xs text-teal-400 font-mono">
              <Zap className="h-3 w-3" />
              Meta Global AI Developer Hackathon 2026
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              Vendor-Neutral Edge AI Intelligence Engine
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Benchmark models on real local silicon (Intel CPU & RTX 4060 GPU), inspect ONNX graphs,
              evaluate true detection mAP, profile edge devices (Jetson, Raspberry Pi, Hailo, NPU),
              and receive evidence-grounded deployment recommendations from the Meta AI Engineer.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab("workbench")}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-teal-400 active:scale-95"
            >
              <Zap className="h-3.5 w-3.5" />
              Launch Workbench
            </button>
            <button
              onClick={() => setActiveTab("agent")}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-all"
            >
              Ask Meta AI
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Models Registered */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>REGISTERED MODELS</span>
            <Layers className="h-4 w-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-100 font-mono">
              {models.length}
            </span>
            <span className="text-xs text-zinc-400">ONNX models</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {models.length > 0 ? `${models[0].name.slice(0, 24)}...` : "No models uploaded"}
          </div>
        </div>

        {/* Online Accelerators */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>HARDWARE TARGETS</span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-100 font-mono">
              {hardware.length}
            </span>
            <span className="text-xs text-emerald-400 font-mono">
              ({onlineHardware.length} Online)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            Local CPU & NVIDIA GPU active
          </div>
        </div>

        {/* Fastest Latency */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>FASTEST VERIFIED</span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-100 font-mono">
              {fastestRun ? `${fastestRun.median_latency_ms.toFixed(1)}ms` : "--"}
            </span>
            <span className="text-xs text-zinc-400">P50</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 font-mono">
            {highestFpsRun ? `${highestFpsRun.fps.toFixed(0)} FPS max throughput` : "No runs yet"}
          </div>
        </div>

        {/* Total Experiments */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>BENCHMARK RUNS</span>
            <FlaskConical className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-100 font-mono">
              {runs.length}
            </span>
            <span className="text-xs text-zinc-400">runs saved</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {experiments.filter((e) => e.status === "COMPLETED").length} completed jobs
          </div>
        </div>
      </div>

      {/* Main Grid: Hardware Fleet Status & Recent Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware Fleet (1 Col) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-teal-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Hardware Fleet</h2>
            </div>
            <button
              onClick={() => setActiveTab("hardware")}
              className="text-xs text-teal-400 hover:text-teal-300 font-mono flex items-center gap-1"
            >
              Lab View <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {hardware.slice(0, 6).map((hw) => (
              <div
                key={hw.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      hw.status === "ONLINE"
                        ? "bg-emerald-400 animate-pulse"
                        : hw.status === "SIMULATED"
                        ? "bg-purple-400"
                        : "bg-zinc-600"
                    }`}
                  />
                  <div>
                    <div className="font-medium text-zinc-200 truncate max-w-[150px]">
                      {hw.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {hw.device_type.toUpperCase()} • {hw.tdp_watts ? `${hw.tdp_watts}W TDP` : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase ${
                      hw.status === "ONLINE"
                        ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {hw.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Runs Table (2 Cols) */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Recent Benchmark Runs</h2>
            </div>
            <button
              onClick={() => setActiveTab("experiments")}
              className="text-xs text-teal-400 hover:text-teal-300 font-mono flex items-center gap-1"
            >
              All Runs <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-lg">
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
                  <tr className="border-b border-zinc-800 text-zinc-400 font-mono">
                    <th className="pb-2">Hardware</th>
                    <th className="pb-2">Precision</th>
                    <th className="pb-2">Median (P50)</th>
                    <th className="pb-2">P95</th>
                    <th className="pb-2">FPS</th>
                    <th className="pb-2">mAP@50</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {runs.slice(0, 5).map((run) => (
                    <tr key={run.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 text-zinc-200">
                        {run.hardware_id}
                      </td>
                      <td className="py-2.5">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 uppercase">
                          {run.precision}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-teal-400">
                        {run.median_latency_ms.toFixed(2)} ms
                      </td>
                      <td className="py-2.5 text-zinc-400">
                        {run.p95_latency_ms.toFixed(2)} ms
                      </td>
                      <td className="py-2.5 text-emerald-400">
                        {run.fps.toFixed(1)}
                      </td>
                      <td className="py-2.5 text-zinc-300">
                        {run.map50 !== null && run.map50 !== undefined ? run.map50.toFixed(3) : "--"}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setActiveTab("compare")}
                          className="text-xs text-teal-400 hover:underline"
                        >
                          Compare
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
