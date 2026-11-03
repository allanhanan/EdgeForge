"use client";

import React, { useState } from "react";
import {
  FlaskConical,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  BarChart2,
  Cpu,
  Layers,
  Calendar,
  X,
  FileCode,
  ShieldCheck,
  Zap,
  ArrowUpDown,
  GitBranch,
  Flame,
  Camera,
  Wrench,
  ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Experiment, BenchmarkRun, ModelRecord, HardwareDevice } from "@/lib/api";
import { TabType } from "./Navigation";

interface ExperimentsTabProps {
  experiments: Experiment[];
  runs: BenchmarkRun[];
  models: ModelRecord[];
  hardware: HardwareDevice[];
  onRefresh: () => void;
  setActiveTab: (tab: TabType) => void;
  onSelectForCompare?: (runId: string) => void;
  onInspectRun?: (runId: string) => void;
}

export const ExperimentsTab: React.FC<ExperimentsTabProps> = ({
  experiments,
  runs,
  models,
  hardware,
  onRefresh,
  setActiveTab,
  onSelectForCompare,
  onInspectRun,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [hardwareFilter, setHardwareFilter] = useState<string>("ALL");
  const [inspectExp, setInspectExp] = useState<Experiment | null>(null);
  const [selectedLifecycleScenario, setSelectedLifecycleScenario] = useState<string>("regression");

  // Map runs by experiment_id or fallback
  const runMap = new Map<string, BenchmarkRun>();
  runs.forEach((r) => {
    runMap.set(r.experiment_id, r);
  });

  const modelMap = new Map<string, ModelRecord>();
  models.forEach((m) => {
    modelMap.set(m.id, m);
  });

  const hwMap = new Map<string, HardwareDevice>();
  hardware.forEach((h) => {
    hwMap.set(h.id, h);
  });

  // Filter experiments
  const filtered = experiments.filter((exp) => {
    if (statusFilter !== "ALL" && exp.status !== statusFilter) return false;
    if (hardwareFilter !== "ALL" && exp.hardware_id !== hardwareFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const modelName = modelMap.get(exp.model_id)?.name.toLowerCase() || "";
      const hwName = hwMap.get(exp.hardware_id)?.name.toLowerCase() || "";
      const expName = exp.name.toLowerCase();
      return expName.includes(q) || modelName.includes(q) || hwName.includes(q) || exp.hardware_id.toLowerCase().includes(q);
    }
    return true;
  });

  // Inspection run
  const activeRun = inspectExp ? (inspectExp.run || runMap.get(inspectExp.id)) : null;

  // Chart data from latency_samples_ms
  const chartData = activeRun?.latency_samples_ms
    ? activeRun.latency_samples_ms.map((sample, idx) => ({
        iteration: `#${idx + 1}`,
        latency: Number(sample.toFixed(2)),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <FlaskConical className="h-5 w-5 text-teal-400" />
            Experiment Registry & Reproducibility Trace
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Audit trail of all benchmark runs with hardware telemetry, raw latency samples, and exact hashes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {setActiveTab && (
            <button
              onClick={() => setActiveTab("workbench")}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all"
            >
              <Zap className="h-3.5 w-3.5 fill-zinc-950" />
              New Benchmark
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search experiments by model, hardware, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-10 pr-4 py-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-none shadow-inner"
          />
        </div>

        <div className="flex gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-mono text-zinc-300 focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Statuses ({experiments.length})</option>
            <option value="COMPLETED">Completed</option>
            <option value="RUNNING">Running</option>
            <option value="FAILED">Failed</option>
            <option value="QUEUED">Queued</option>
          </select>

          <select
            value={hardwareFilter}
            onChange={(e) => setHardwareFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-mono text-zinc-300 focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Hardware Fleet</option>
            {hardware.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        {filtered.length === 0 ? (
          <div className="p-14 text-center text-zinc-400 space-y-3">
            <FlaskConical className="h-10 w-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-200">No experiments match filter</p>
            <p className="text-xs text-zinc-400 font-mono">
              Execute a benchmark in the Workbench tab to record new telemetry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-zinc-400 font-medium">
                  <th className="py-3 px-4">Experiment / Model</th>
                  <th className="py-3 px-4">Hardware Target</th>
                  <th className="py-3 px-4">Precision</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Median (P50)</th>
                  <th className="py-3 px-4">Throughput</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((exp) => {
                  const run = exp.run || runMap.get(exp.id);
                  const model = modelMap.get(exp.model_id);
                  const hw = hwMap.get(exp.hardware_id);

                  return (
                    <tr
                      key={exp.id}
                      onClick={() => setInspectExp(exp)}
                      className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-100 truncate max-w-[200px] font-sans">
                          {exp.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {model?.name || exp.model_id.slice(0, 12)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        <div className="truncate max-w-[150px] font-medium">{hw?.name || exp.hardware_id}</div>
                        <div className="text-[10px] text-zinc-500">{exp.runtime}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="rounded-md border border-zinc-700/60 bg-zinc-800/80 px-2 py-0.5 text-[10px] uppercase text-zinc-300 font-semibold">
                          {exp.precision}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-zinc-300 font-medium">{exp.batch_size}</td>

                      <td className="py-3 px-4">
                        {run ? (
                          <span className="font-bold text-teal-300">
                            {run.median_latency_ms.toFixed(2)} ms
                          </span>
                        ) : (
                          <span className="text-zinc-600">--</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {run ? (
                          <span className="text-emerald-400 font-semibold">
                            {run.fps.toFixed(1)} FPS
                          </span>
                        ) : (
                          <span className="text-zinc-600">--</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
                            exp.status === "COMPLETED"
                              ? "bg-emerald-950/70 border border-emerald-500/40 text-emerald-400"
                              : exp.status === "RUNNING"
                              ? "bg-teal-950/70 border border-teal-500/40 text-teal-300 animate-pulse"
                              : exp.status === "FAILED"
                              ? "bg-rose-950/70 border border-rose-500/40 text-rose-400"
                              : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/60"
                          }`}
                        >
                          {exp.status === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
                          {exp.status === "FAILED" && <XCircle className="h-3 w-3" />}
                          {exp.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setInspectExp(exp)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {run && onSelectForCompare && (
                            <button
                              onClick={() => {
                                onSelectForCompare(run.id);
                                setActiveTab?.("compare");
                              }}
                              className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-300 hover:bg-teal-500/20 transition-all"
                            >
                              Compare
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Post-Deployment Lifecycle & Continuous Benchmarking (Section 5) */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-zinc-200">
                Post-Deployment Lifecycle & Continuous Benchmarking (Section 5)
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Repeatable engineering workflows: detect regressions, track runtime updates, and audit thermal drift across versions.
            </p>
          </div>

          {/* Scenario Selector Pills */}
          <div className="flex flex-wrap gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px] font-mono">
            {[
              { id: "regression", label: "Regression Gate", icon: ShieldAlert },
              { id: "version", label: "Model v2 Diff", icon: GitBranch },
              { id: "resolution", label: "Multi-Resolution", icon: Layers },
              { id: "batch", label: "Batch Scaling", icon: ArrowUpDown },
              { id: "thermal", label: "Thermal Stability", icon: Flame },
              { id: "streams", label: "Multi-Camera", icon: Camera },
            ].map((sc) => {
              const Icon = sc.icon;
              const isActive = selectedLifecycleScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => setSelectedLifecycleScenario(sc.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                    isActive
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {sc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Lifecycle Scenario Card */}
        {selectedLifecycleScenario === "regression" && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 font-mono flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                Workflow: Automated Latency & Accuracy Regression Gate
              </span>
              <span className="text-[10px] font-mono bg-rose-950/80 border border-rose-500/40 text-rose-300 px-2 py-0.5 rounded-md font-semibold">
                Regression Guard Active
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">PREVIOUS BASELINE (v1.0.0)</span>
                <span className="text-zinc-200 font-bold">28.0 ms P50 • 82.0% mAP</span>
                <span className="text-[10px] text-zinc-500 block">Intel CPU • FP32</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">CURRENT CANDIDATE (PR #42)</span>
                <span className="text-rose-400 font-bold">34.2 ms P50 (+6.2 ms)</span>
                <span className="text-[10px] text-zinc-500 block">Intel CPU • FP32</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-rose-500/30 space-y-1 bg-rose-950/30">
                <span className="text-rose-300 text-[10px] block font-bold">REGRESSION AUDIT</span>
                <span className="text-rose-300 font-bold">+22.1% Latency Violation</span>
                <span className="text-[10px] text-rose-400/80 block">Blocked deployment: Exceeds 30ms SLA</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              When developers introduce architectural changes, EdgeForge automatically benchmarks the commit against historical baselines, preventing silent regressions from reaching edge factory devices.
            </p>
          </div>
        )}

        {selectedLifecycleScenario === "version" && (
          <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300 font-mono flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-teal-400" />
                Workflow: New Model Version Comparison (YOLOv8n v1 vs v2)
              </span>
              <span className="text-[10px] font-mono bg-teal-950/80 border border-teal-500/40 text-teal-300 px-2 py-0.5 rounded-md font-semibold">
                Version Delta Audit
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">YOLOv8n-v1 (Baseline)</span>
                <span className="text-zinc-200 font-bold">45.0 ms • 82.0% mAP</span>
                <span className="text-[10px] text-zinc-500 block">Input: 640x640 • 3.2M params</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">YOLOv8n-v2 (Pruned Candidate)</span>
                <span className="text-emerald-400 font-bold">31.2 ms (-13.8 ms) • 81.6% mAP</span>
                <span className="text-[10px] text-zinc-500 block">Input: 640x640 • 2.6M params</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-emerald-500/30 space-y-1 bg-emerald-950/30">
                <span className="text-emerald-300 text-[10px] block font-bold">RECOMMENDATION</span>
                <span className="text-emerald-300 font-bold">Promote v2 to Production</span>
                <span className="text-[10px] text-emerald-400/80 block">30.6% Speedup with only 0.4 point mAP delta</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Uploads v2 and side-by-side evaluates latency gains, memory footprint reductions, and class-specific mAP retention.
            </p>
          </div>
        )}

        {selectedLifecycleScenario === "resolution" && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-cyan-400" />
                Workflow: Multi-Resolution Scaling Sweep (320 vs 640 vs 960)
              </span>
              <span className="text-[10px] font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-md font-semibold">
                Resolution Trade-off
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">320 x 320 RESOLUTION</span>
                <span className="text-cyan-300 font-bold">12.4 ms • 80.6 FPS</span>
                <span className="text-[10px] text-amber-400 block">mAP: 73.1% (-8.9 pts drop)</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-cyan-500/40 space-y-1 bg-cyan-950/30">
                <span className="text-cyan-300 text-[10px] block font-bold">640 x 640 (BALANCED SWEET SPOT)</span>
                <span className="text-emerald-400 font-bold">28.0 ms • 35.7 FPS</span>
                <span className="text-[10px] text-emerald-300 block">mAP: 81.8% (Target Met)</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">960 x 960 RESOLUTION</span>
                <span className="text-rose-400 font-bold">78.5 ms • 12.7 FPS</span>
                <span className="text-[10px] text-zinc-400 block">mAP: 83.2% (+1.2 pts gain)</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Plots non-linear computational quadratic scaling against true accuracy retention, pinpointing the optimal camera stream resolution.
            </p>
          </div>
        )}

        {selectedLifecycleScenario === "batch" && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 font-mono flex items-center gap-1.5">
                <ArrowUpDown className="h-4 w-4 text-purple-400" />
                Workflow: Batch Size Throughput vs. Latency Curve (Batch 1, 2, 4, 8)
              </span>
              <span className="text-[10px] font-mono bg-purple-950/80 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-md font-semibold">
                Concurrency Profile
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">BATCH 1 (REALTIME)</span>
                <span className="text-zinc-200 font-bold">28.0 ms P50</span>
                <span className="text-[10px] text-teal-400 block">35.7 FPS • 240 MB</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">BATCH 2 (DUAL STREAM)</span>
                <span className="text-zinc-200 font-bold">36.5 ms P50</span>
                <span className="text-[10px] text-teal-400 block">54.8 FPS • 380 MB</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-purple-500/40 space-y-1 bg-purple-950/30">
                <span className="text-purple-300 text-[10px] block font-bold">BATCH 4 (MAX EFFICIENCY)</span>
                <span className="text-emerald-400 font-bold">52.1 ms P50</span>
                <span className="text-[10px] text-emerald-300 block">76.8 FPS • 620 MB</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">BATCH 8 (MEMORY BOUND)</span>
                <span className="text-rose-400 font-bold">98.4 ms P50</span>
                <span className="text-[10px] text-amber-400 block">81.3 FPS • 1180 MB</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Reveals GPU Tensor Core occupancy saturation, demonstrating that Batch=4 delivers 2.15x aggregate throughput before memory bandwidth saturates.
            </p>
          </div>
        )}

        {selectedLifecycleScenario === "thermal" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-400" />
                Workflow: Thermal Throttling & Sustained Stress Workload (1,000 Iterations)
              </span>
              <span className="text-[10px] font-mono bg-amber-950/80 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-md font-semibold">
                Thermal Drift Monitored
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">COLD INFERENCE (0 - 100 runs)</span>
                <span className="text-zinc-200 font-bold">28.0 ms P50 • 42°C</span>
                <span className="text-[10px] text-emerald-400 block">Full boost clock active</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">SUSTAINED RUN (500 - 1000 runs)</span>
                <span className="text-amber-400 font-bold">36.8 ms P50 • 78°C</span>
                <span className="text-[10px] text-amber-400 block">+31.4% Latency degradation</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-amber-500/30 space-y-1 bg-amber-950/30">
                <span className="text-amber-300 text-[10px] block font-bold">THERMAL MITIGATION</span>
                <span className="text-amber-300 font-bold">Fan Profile: Performance Mode</span>
                <span className="text-[10px] text-amber-400/80 block">Requires heatsink enclosure for &gt;45 min runs</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Long-running workloads on fanless edge enclosures encounter clock throttle downscaling; EdgeForge maps temperature drift to real SLA compliance over time.
            </p>
          </div>
        )}

        {selectedLifecycleScenario === "streams" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 font-mono flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-emerald-400" />
                Workflow: Multi-Camera Concurrent Video Stream Contention
              </span>
              <span className="text-[10px] font-mono bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                Multi-Stream Verified
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">1 CAMERA STREAM</span>
                <span className="text-emerald-400 font-bold">30.0 FPS Guaranteed</span>
                <span className="text-[10px] text-zinc-500 block">Latency: 28.0 ms</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">2 CAMERA STREAMS</span>
                <span className="text-emerald-400 font-bold">27.4 FPS per stream</span>
                <span className="text-[10px] text-zinc-500 block">Aggregate: 54.8 FPS</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-emerald-500/40 space-y-1 bg-emerald-950/30">
                <span className="text-emerald-300 text-[10px] block font-bold">4 CAMERA STREAMS</span>
                <span className="text-teal-300 font-bold">19.2 FPS per stream</span>
                <span className="text-[10px] text-teal-400 block">Aggregate: 76.8 FPS</span>
              </div>
              <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[10px] block">8 CAMERA STREAMS</span>
                <span className="text-rose-400 font-bold">10.1 FPS per stream</span>
                <span className="text-[10px] text-rose-400 block">Frame drops detected</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Industrial inspection vision pipelines deploy multiple RTSP cameras to a single edge box; EdgeForge measures PCIe bus and GPU contention under concurrent workloads.
            </p>
          </div>
        )}
      </div>

      {/* Experiment Inspection Modal */}
      {inspectExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase font-semibold">
                  Experiment Inspection • ID: {inspectExp.id}
                </span>
                <h3 className="text-base font-bold text-zinc-100 font-sans">{inspectExp.name}</h3>
              </div>
              <button
                onClick={() => setInspectExp(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Percentile Latency Grid */}
            {activeRun ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200 mb-2 font-mono flex items-center gap-1.5">
                    <BarChart2 className="h-4 w-4 text-teal-400" />
                    Percentile Latency & Variance Distribution
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs font-mono">
                    <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block font-semibold">MIN</span>
                      <span className="text-zinc-200 font-bold">
                        {Math.min(...(activeRun.latency_samples_ms?.length ? activeRun.latency_samples_ms : [activeRun.median_latency_ms])).toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-teal-500/40">
                      <span className="text-[10px] text-teal-400 block font-semibold">P50 (MEDIAN)</span>
                      <span className="text-teal-300 font-bold">
                        {activeRun.median_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block font-semibold">MEAN</span>
                      <span className="text-zinc-200 font-bold">
                        {activeRun.mean_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block font-semibold">P90</span>
                      <span className="text-zinc-200 font-bold">
                        {activeRun.p90_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-cyan-500/40">
                      <span className="text-[10px] text-cyan-400 block font-semibold">P95</span>
                      <span className="text-cyan-300 font-bold">
                        {activeRun.p95_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block font-semibold">P99</span>
                      <span className="text-zinc-200 font-bold">
                        {activeRun.p99_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block font-semibold">STD DEV</span>
                      <span className="text-zinc-200 font-bold">
                        ±{activeRun.std_latency_ms.toFixed(2)} ms
                      </span>
                    </div>
                  </div>
                </div>

                {/* Latency Sample Chart */}
                {chartData.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-zinc-400">
                      Raw Inference Sample Profile ({chartData.length} iterations)
                    </span>
                    <div className="h-48 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 shadow-inner">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="iteration" stroke="#71717a" fontSize={10} tickLine={false} />
                          <YAxis stroke="#71717a" fontSize={10} unit="ms" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#18181b",
                              border: "1px solid #3f3f46",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontFamily: "monospace",
                            }}
                          />
                          <Bar dataKey="latency" fill="#14b8a6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Reproducibility Metadata */}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200 mb-2 font-mono flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Zero-Defect Reproducibility Metadata
                  </h4>
                  <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800 text-xs font-mono space-y-2 text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Timestamp:</span>
                      <span>{new Date(activeRun.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Runtime Execution Provider:</span>
                      <span>{inspectExp.execution_provider} ({inspectExp.runtime})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Throughput:</span>
                      <span className="text-emerald-400 font-bold">{activeRun.fps.toFixed(1)} FPS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Memory RSS:</span>
                      <span>{activeRun.memory_rss_mb.toFixed(1)} MB</span>
                    </div>
                    {activeRun.reproducibility_metadata && (
                      <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                        {Object.entries(activeRun.reproducibility_metadata).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-[11px]">
                            <span className="text-zinc-400">{k}:</span>
                            <span className="text-zinc-300 truncate max-w-sm">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400 font-mono text-xs">
                {inspectExp.status === "RUNNING"
                  ? "Experiment is currently executing. Results will populate upon completion."
                  : inspectExp.error_message || "No benchmark metrics recorded."}
              </div>
            )}

            {/* Logs drawer */}
            {inspectExp.logs && (
              <div>
                <span className="text-xs font-mono text-zinc-400 block mb-1">Execution Log Stream:</span>
                <pre className="max-h-36 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">
                  {inspectExp.logs}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setInspectExp(null)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-all"
              >
                Close
              </button>
              {activeRun && setActiveTab && (
                <button
                  onClick={() => {
                    setInspectExp(null);
                    setActiveTab("deployments");
                  }}
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all"
                >
                  Export Deployment Package
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
