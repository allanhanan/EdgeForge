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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
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
              className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-teal-400 transition-all"
            >
              <Zap className="h-3.5 w-3.5" />
              New Benchmark
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search experiments by model, hardware, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 pl-9 pr-4 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-mono text-zinc-300 focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="RUNNING">Running</option>
            <option value="FAILED">Failed</option>
            <option value="QUEUED">Queued</option>
          </select>

          <select
            value={hardwareFilter}
            onChange={(e) => setHardwareFilter(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-mono text-zinc-300 focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Hardware</option>
            {hardware.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 space-y-3">
            <FlaskConical className="h-8 w-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-medium text-zinc-300">No experiments match filter</p>
            <p className="text-xs text-zinc-400 font-mono">
              Execute a benchmark in the Workbench tab to record new telemetry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400">
                  <th className="py-3 px-4">Experiment / Model</th>
                  <th className="py-3 px-4">Hardware</th>
                  <th className="py-3 px-4">Precision</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Median (P50)</th>
                  <th className="py-3 px-4">Throughput</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
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
                        <div className="font-semibold text-zinc-100 truncate max-w-[200px]">
                          {exp.name}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {model?.name || exp.model_id.slice(0, 12)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        <div className="truncate max-w-[150px]">{hw?.name || exp.hardware_id}</div>
                        <div className="text-[10px] text-zinc-400">{exp.runtime}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">
                          {exp.precision}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-zinc-300">{exp.batch_size}</td>

                      <td className="py-3 px-4">
                        {run ? (
                          <span className="font-bold text-teal-400">
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
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] uppercase font-bold ${
                            exp.status === "COMPLETED"
                              ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-400"
                              : exp.status === "RUNNING"
                              ? "bg-teal-950/60 border border-teal-500/30 text-teal-300 animate-pulse"
                              : exp.status === "FAILED"
                              ? "bg-red-950/60 border border-red-500/30 text-red-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {exp.status === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
                          {exp.status === "FAILED" && <XCircle className="h-3 w-3" />}
                          {exp.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectExp(exp)}
                            className="p-1 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800"
                            title="Inspect Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {run && onSelectForCompare && (
                            <button
                              onClick={() => {
                                onSelectForCompare(run.id);
                                setActiveTab?.("compare");
                              }}
                              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-teal-400 hover:bg-zinc-700"
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

      {/* Experiment Inspection Modal */}
      {inspectExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase">
                  Experiment Inspection • ID: {inspectExp.id}
                </span>
                <h3 className="text-base font-semibold text-zinc-100">{inspectExp.name}</h3>
              </div>
              <button
                onClick={() => setInspectExp(null)}
                className="text-zinc-400 hover:text-zinc-200 text-lg"
              >
                &times;
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
                    <div className="rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">MIN</span>
                      <span className="text-zinc-200 font-bold">
                        {Math.min(...(activeRun.latency_samples_ms || [activeRun.median_latency_ms])).toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded bg-zinc-950 p-2 border border-teal-500/40">
                      <span className="text-[10px] text-teal-400 block font-semibold">P50 (MEDIAN)</span>
                      <span className="text-teal-300 font-bold">
                        {activeRun.median_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">MEAN</span>
                      <span className="text-zinc-200 font-bold">
                        {activeRun.mean_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">P90</span>
                      <span className="text-zinc-200 font-bold">
                        {activeRun.p90_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded bg-zinc-950 p-2 border border-cyan-500/40">
                      <span className="text-[10px] text-cyan-400 block">P95</span>
                      <span className="text-cyan-300 font-bold">
                        {activeRun.p95_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">P99</span>
                      <span className="text-zinc-200 font-bold">
                        {activeRun.p99_latency_ms.toFixed(2)} ms
                      </span>
                    </div>

                    <div className="rounded bg-zinc-950 p-2 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">STD DEV</span>
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
                    <div className="h-44 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="iteration" stroke="#71717a" fontSize={10} tickLine={false} />
                          <YAxis stroke="#71717a" fontSize={10} unit="ms" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#18181b",
                              border: "1px solid #3f3f46",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontFamily: "monospace",
                            }}
                          />
                          <Bar dataKey="latency" fill="#14b8a6" radius={[2, 2, 0, 0]} />
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
                  <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 text-xs font-mono space-y-1.5 text-zinc-300">
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
                      <div className="pt-2 border-t border-zinc-800 space-y-1">
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
                <pre className="max-h-36 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">
                  {inspectExp.logs}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setInspectExp(null)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Close
              </button>
              {activeRun && setActiveTab && (
                <button
                  onClick={() => {
                    setInspectExp(null);
                    setActiveTab("deployments");
                  }}
                  className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-teal-400"
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
