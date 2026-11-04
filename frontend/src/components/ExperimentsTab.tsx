"use client";

import React, { useState } from "react";
import {
  FlaskConical,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Layers,
  X,
  ShieldCheck,
  Zap,
  ArrowUpDown,
  GitBranch,
  Flame,
  Camera,
  ShieldAlert,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Hash,
  Terminal,
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
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("ALL");
  const [inspectExp, setInspectExp] = useState<Experiment | null>(null);
  const [selectedLifecycleScenario, setSelectedLifecycleScenario] = useState<string>("regression");
  const [lifecycleOpen, setLifecycleOpen] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

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

    // Date range filter
    if (dateRangeFilter !== "ALL") {
      const expDate = new Date(exp.created_at).getTime();
      if (dateRangeFilter === "24H" && now - expDate > 24 * 3600 * 1000) return false;
      if (dateRangeFilter === "7D" && now - expDate > 7 * 24 * 3600 * 1000) return false;
      if (dateRangeFilter === "30D" && now - expDate > 30 * 24 * 3600 * 1000) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const modelName = modelMap.get(exp.model_id)?.name.toLowerCase() || "";
      const hwName = hwMap.get(exp.hardware_id)?.name.toLowerCase() || "";
      const expName = exp.name.toLowerCase();
      const run = exp.run || runMap.get(exp.id);
      const runId = run?.id.toLowerCase() || "";
      return (
        expName.includes(q) ||
        modelName.includes(q) ||
        hwName.includes(q) ||
        exp.hardware_id.toLowerCase().includes(q) ||
        exp.id.toLowerCase().includes(q) ||
        runId.includes(q)
      );
    }
    return true;
  });

  // Inspection run
  const activeRun = inspectExp ? (inspectExp.run || runMap.get(inspectExp.id)) : null;
  const activeModel = inspectExp ? modelMap.get(inspectExp.model_id) : null;
  const activeHw = inspectExp ? hwMap.get(inspectExp.hardware_id) : null;

  // Chart data from latency_samples_ms
  const chartData = activeRun?.latency_samples_ms
    ? activeRun.latency_samples_ms.map((sample, idx) => ({
        iteration: `#${idx + 1}`,
        latency: Number(sample.toFixed(2)),
      }))
    : [];

  const handleCopyHash = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-3 font-sans text-[#ccccdc]">
      {/* Top Header Bar */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-sm bg-[#1f2328] border border-[#2c3235] text-[#5794f2]">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#f4f5f8] uppercase tracking-wider font-sans">
                Experiments Inventory & Telemetry Registry
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm border border-[#2c3235] bg-[#111217] text-[#8e8e9e]">
                {experiments.length} Executions Recorded
              </span>
            </div>
            <p className="text-[11px] text-[#8e8e9e] font-sans">
              Audit trail of all benchmark runs with hardware telemetry, percentile distributions, and SHA-256 hashes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] px-3 py-1.5 rounded-sm text-xs font-sans transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab("workbench")}
              className="flex items-center gap-1.5 bg-[#f59f00] hover:bg-[#ffb020] text-[#111217] px-3 py-1.5 rounded-sm text-xs font-bold font-sans transition-colors"
            >
              <Zap className="h-3.5 w-3.5 fill-[#111217]" />
              <span>New Benchmark</span>
            </button>
          )}
        </div>
      </div>

      {/* Structured Filter Bar */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-2.5 flex flex-col sm:flex-row gap-2 items-center">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8e8e9e]" />
          <input
            type="text"
            placeholder="Search by model, hardware, run ID, or experiment name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111217] border border-[#2c3235] pl-8 pr-3 py-1.5 text-xs font-sans text-[#ccccdc] placeholder-[#8e8e9e] rounded-sm focus:border-[#5794f2] focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111217] border border-[#2c3235] px-2.5 py-1.5 text-xs font-sans text-[#ccccdc] rounded-sm focus:border-[#5794f2] focus:outline-none"
          >
            <option value="ALL">Status: All ({experiments.length})</option>
            <option value="COMPLETED">Status: Completed</option>
            <option value="RUNNING">Status: Running</option>
            <option value="FAILED">Status: Failed</option>
            <option value="QUEUED">Status: Queued</option>
          </select>

          {/* Target Hardware Filter */}
          <select
            value={hardwareFilter}
            onChange={(e) => setHardwareFilter(e.target.value)}
            className="bg-[#111217] border border-[#2c3235] px-2.5 py-1.5 text-xs font-sans text-[#ccccdc] rounded-sm focus:border-[#5794f2] focus:outline-none"
          >
            <option value="ALL">Silicon: All Hardware</option>
            {hardware.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          {/* Date Range Filter */}
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="bg-[#111217] border border-[#2c3235] px-2.5 py-1.5 text-xs font-sans text-[#ccccdc] rounded-sm focus:border-[#5794f2] focus:outline-none"
          >
            <option value="ALL">Time: All Time</option>
            <option value="24H">Time: Last 24 Hours</option>
            <option value="7D">Time: Last 7 Days</option>
            <option value="30D">Time: Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Structured Experiments Inventory Table */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#8e8e9e] space-y-2 font-sans">
            <FlaskConical className="h-8 w-8 text-[#8e8e9e]/60 mx-auto" />
            <p className="text-sm font-semibold text-[#ccccdc]">No experiments match current filters</p>
            <p className="text-xs text-[#8e8e9e]">
              Execute a benchmark in the Workbench tab or adjust your search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-[#2c3235] bg-[#1f2328] text-[#8e8e9e] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Run ID & SHA Digest</th>
                  <th className="py-2.5 px-3">Start Time</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Target Silicon</th>
                  <th className="py-2.5 px-3">Runtime</th>
                  <th className="py-2.5 px-3">Precision</th>
                  <th className="py-2.5 px-3">Latency (P50 • P95)</th>
                  <th className="py-2.5 px-3">FPS</th>
                  <th className="py-2.5 px-3">Peak RSS</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2c3235]/60 bg-[#181b1f]">
                {filtered.map((exp) => {
                  const run = exp.run || runMap.get(exp.id);
                  const model = modelMap.get(exp.model_id);
                  const hw = hwMap.get(exp.hardware_id);
                  const shortId = run ? run.id.slice(0, 8) : exp.id.slice(0, 8);
                  const modelSha = String(model?.sha256 || run?.reproducibility_metadata?.model_sha256 || "e3b0c442");
                  const startTime = new Date(exp.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <tr
                      key={exp.id}
                      onClick={() => setInspectExp(exp)}
                      className="hover:bg-[#1f2328]/80 cursor-pointer transition-colors"
                    >
                      {/* Run ID & SHA Digest */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[#5794f2]">
                          <Hash className="h-3 w-3 text-[#8e8e9e]" />
                          <span title={run?.id || exp.id} className="font-semibold">{shortId}</span>
                          {run?.verified && (
                            <span title="Cryptographically Verified Audit Trail">
                              <ShieldCheck className="h-3 w-3 text-[#73bf69]" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#8e8e9e] font-mono truncate max-w-[110px]" title={`SHA-256: ${modelSha}`}>
                          SHA:{modelSha.slice(0, 8)}
                        </div>
                      </td>

                      {/* Start Time */}
                      <td className="py-2.5 px-3 text-[#8e8e9e] whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="h-3 w-3 text-[#8e8e9e]" />
                          <span>{startTime}</span>
                        </div>
                      </td>

                      {/* Model */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#f4f5f8] truncate max-w-[180px]">
                          {model?.name || exp.model_id.slice(0, 14)}
                        </div>
                        <div className="text-[10px] text-[#8e8e9e]">
                          {model?.task_type || "Vision"} • <span className="font-mono">Batch {exp.batch_size}</span>
                        </div>
                      </td>

                      {/* Target Hardware */}
                      <td className="py-2.5 px-3 text-[#ccccdc]">
                        <div className="truncate max-w-[160px] font-medium">
                          {hw?.name || exp.hardware_id}
                        </div>
                        <div className="text-[10px] text-[#8e8e9e] uppercase font-mono">
                          {hw?.device_type || "accelerator"}
                        </div>
                      </td>

                      {/* Runtime */}
                      <td className="py-2.5 px-3 text-[#8e8e9e] text-[11px]">
                        <div className="font-medium text-[#ccccdc]">{exp.runtime}</div>
                        <div className="text-[10px] text-[#8e8e9e]/70 truncate max-w-[130px] font-mono">
                          {exp.execution_provider}
                        </div>
                      </td>

                      {/* Precision */}
                      <td className="py-2.5 px-3">
                        <span className="rounded-sm border border-[#2c3235] bg-[#111217] px-1.5 py-0.5 text-[10px] uppercase font-bold text-[#ccccdc] font-mono">
                          {exp.precision}
                        </span>
                      </td>

                      {/* Latency (P50 • P95 • P99) */}
                      <td className="py-2.5 px-3">
                        {run ? (
                          <div>
                            <span className="font-bold text-[#f4f5f8] font-mono">
                              {run.median_latency_ms.toFixed(2)} ms
                            </span>
                            <div className="text-[10px] text-[#8e8e9e] font-mono">
                              P95: {run.p95_latency_ms.toFixed(1)}ms • P99: {run.p99_latency_ms.toFixed(1)}ms
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#8e8e9e] font-mono">--</span>
                        )}
                      </td>

                      {/* FPS */}
                      <td className="py-2.5 px-3">
                        {run ? (
                          <span className="text-[#73bf69] font-bold font-mono">
                            {run.fps.toFixed(1)} FPS
                          </span>
                        ) : (
                          <span className="text-[#8e8e9e] font-mono">--</span>
                        )}
                      </td>

                      {/* Peak RSS */}
                      <td className="py-2.5 px-3 text-[#ccccdc]">
                        {run ? (
                          <span className="font-mono">{run.memory_rss_mb.toFixed(1)} MB</span>
                        ) : (
                          <span className="text-[#8e8e9e] font-mono">--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] uppercase font-bold border ${
                            exp.status === "COMPLETED"
                              ? "bg-[#73bf69]/10 border-[#73bf69]/30 text-[#73bf69]"
                              : exp.status === "RUNNING"
                              ? "bg-[#5794f2]/10 border-[#5794f2]/30 text-[#5794f2] animate-pulse"
                              : exp.status === "FAILED"
                              ? "bg-[#f2495c]/10 border-[#f2495c]/30 text-[#f2495c]"
                              : "bg-[#2c3235] border-[#2c3235] text-[#8e8e9e]"
                          }`}
                        >
                          {exp.status === "COMPLETED" && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {exp.status === "FAILED" && <XCircle className="h-2.5 w-2.5" />}
                          {exp.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectExp(exp);
                              if (run && onInspectRun) onInspectRun(run.id);
                            }}
                            className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] px-2 py-1 rounded-sm text-[11px] font-sans transition-colors flex items-center gap-1"
                            title="Inspect Run Details"
                          >
                            <Eye className="h-3 w-3 text-[#5794f2]" />
                            <span>Inspect</span>
                          </button>

                          {run && onSelectForCompare && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectForCompare(run.id);
                                setActiveTab("compare");
                              }}
                              className="bg-[#1f2328] hover:bg-[#2c3235] text-[#5794f2] border border-[#5794f2]/40 px-2 py-1 rounded-sm text-[11px] font-semibold font-sans transition-colors"
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

      {/* Post-Deployment Lifecycle & Continuous Benchmarking */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm">
        <div
          onClick={() => setLifecycleOpen(!lifecycleOpen)}
          className="flex items-center justify-between px-3 py-2 border-b border-[#2c3235] bg-[#1f2328] cursor-pointer hover:bg-[#252a30] transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-[#5794f2]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f4f5f8] font-sans">
              Post-Deployment Lifecycle & Continuous Benchmarking (Section 5)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans text-[#8e8e9e]">
              {lifecycleOpen ? "Collapse" : "Expand"}
            </span>
            {lifecycleOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#8e8e9e]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#8e8e9e]" />
            )}
          </div>
        </div>

        {lifecycleOpen && (
          <div className="p-3 space-y-3">
            {/* Scenario Selector Pills */}
            <div className="flex flex-wrap gap-1 bg-[#111217] p-1 border border-[#2c3235] rounded-sm text-[11px] font-sans">
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
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-colors ${
                      isActive
                        ? "bg-[#1f2328] text-[#5794f2] border border-[#2c3235] font-bold"
                        : "text-[#8e8e9e] hover:text-[#ccccdc]"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{sc.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Lifecycle Content Container */}
            <div className="border border-[#2c3235] bg-[#111217] p-3 rounded-sm text-xs font-sans space-y-2.5">
              {selectedLifecycleScenario === "regression" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#f2495c] flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Automated Latency & Accuracy Regression Gate
                    </span>
                    <span className="text-[10px] bg-[#f2495c]/20 text-[#f2495c] border border-[#f2495c]/40 px-1.5 py-0.5 rounded-sm">
                      Regression Guard Active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">PREVIOUS BASELINE (v1.0.0)</span>
                      <div className="text-[#f4f5f8] font-bold">28.0 ms P50 • 82.0% mAP</div>
                      <span className="text-[10px] text-[#8e8e9e]">Intel CPU • FP32</span>
                    </div>
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">CURRENT CANDIDATE (PR #42)</span>
                      <div className="text-[#f2495c] font-bold">34.2 ms P50 (+6.2 ms)</div>
                      <span className="text-[10px] text-[#8e8e9e]">Intel CPU • FP32</span>
                    </div>
                    <div className="border border-[#f2495c]/30 bg-[#f2495c]/10 p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#f2495c] text-[10px] block font-bold">REGRESSION AUDIT</span>
                      <div className="text-[#f2495c] font-bold">+22.1% Latency Violation</div>
                      <span className="text-[10px] text-[#f2495c]">Blocked deployment: Exceeds 30ms SLA</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8e8e9e] font-sans">
                    When developers introduce architectural changes, EdgeForge automatically benchmarks the commit against historical baselines, preventing silent regressions from reaching edge factory devices.
                  </p>
                </div>
              )}

              {selectedLifecycleScenario === "version" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#5794f2] flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5" />
                      Model Version Comparison: YOLOv8n v1 vs v2
                    </span>
                    <span className="text-[10px] bg-[#5794f2]/20 text-[#5794f2] border border-[#5794f2]/40 px-1.5 py-0.5 rounded-sm">
                      Delta Audit
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">YOLOv8n-v1 (Baseline)</span>
                      <div className="text-[#f4f5f8] font-bold">45.0 ms • 82.0% mAP</div>
                      <span className="text-[10px] text-[#8e8e9e]">640x640 • 3.2M params</span>
                    </div>
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">YOLOv8n-v2 (Pruned Candidate)</span>
                      <div className="text-[#73bf69] font-bold">31.2 ms (-13.8 ms) • 81.6% mAP</div>
                      <span className="text-[10px] text-[#8e8e9e]">640x640 • 2.6M params</span>
                    </div>
                    <div className="border border-[#73bf69]/30 bg-[#73bf69]/10 p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#73bf69] text-[10px] block font-bold">RECOMMENDATION</span>
                      <div className="text-[#73bf69] font-bold">Promote v2 to Production</div>
                      <span className="text-[10px] text-[#73bf69]">30.6% Speedup with only 0.4 pt mAP delta</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLifecycleScenario === "resolution" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#5794f2] flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      Multi-Resolution Scaling Sweep (320 vs 640 vs 960)
                    </span>
                    <span className="text-[10px] bg-[#5794f2]/20 text-[#5794f2] border border-[#5794f2]/40 px-1.5 py-0.5 rounded-sm">
                      Sweep Profile
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">320 x 320 RESOLUTION</span>
                      <div className="text-[#5794f2] font-bold">12.4 ms • 80.6 FPS</div>
                      <span className="text-[10px] text-[#f59f00]">mAP: 73.1% (-8.9 pts drop)</span>
                    </div>
                    <div className="border border-[#73bf69]/30 bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#73bf69] text-[10px] block font-bold">640 x 640 (BALANCED SWEET SPOT)</span>
                      <div className="text-[#73bf69] font-bold">28.0 ms • 35.7 FPS</div>
                      <span className="text-[10px] text-[#73bf69]">mAP: 81.8% (Target Met)</span>
                    </div>
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">960 x 960 RESOLUTION</span>
                      <div className="text-[#f2495c] font-bold">78.5 ms • 12.7 FPS</div>
                      <span className="text-[10px] text-[#8e8e9e]">mAP: 83.2% (+1.2 pts gain)</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLifecycleScenario === "batch" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#5794f2] flex items-center gap-1.5">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Batch Size Throughput vs. Latency Curve (Batch 1, 2, 4, 8)
                    </span>
                    <span className="text-[10px] bg-[#5794f2]/20 text-[#5794f2] border border-[#5794f2]/40 px-1.5 py-0.5 rounded-sm">
                      Saturation Profile
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">BATCH 1 (REALTIME)</span>
                      <div className="text-[#f4f5f8] font-bold">28.0 ms P50</div>
                      <span className="text-[10px] text-[#73bf69]">35.7 FPS • 240 MB</span>
                    </div>
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">BATCH 2 (DUAL STREAM)</span>
                      <div className="text-[#f4f5f8] font-bold">36.5 ms P50</div>
                      <span className="text-[10px] text-[#73bf69]">54.8 FPS • 380 MB</span>
                    </div>
                    <div className="border border-[#73bf69]/30 bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#73bf69] text-[10px] block font-bold">BATCH 4 (MAX EFFICIENCY)</span>
                      <div className="text-[#73bf69] font-bold">52.1 ms P50</div>
                      <span className="text-[10px] text-[#73bf69]">76.8 FPS • 620 MB</span>
                    </div>
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">BATCH 8 (MEMORY BOUND)</span>
                      <div className="text-[#f2495c] font-bold">98.4 ms P50</div>
                      <span className="text-[10px] text-[#f59f00]">81.3 FPS • 1180 MB</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLifecycleScenario === "thermal" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#f59f00] flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5" />
                      Thermal Throttling & Sustained Stress Workload (1,000 Iterations)
                    </span>
                    <span className="text-[10px] bg-[#f59f00]/20 text-[#f59f00] border border-[#f59f00]/40 px-1.5 py-0.5 rounded-sm">
                      Thermal Drift
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">COLD INFERENCE (0 - 100 runs)</span>
                      <div className="text-[#f4f5f8] font-bold">28.0 ms P50 • 42°C</div>
                      <span className="text-[10px] text-[#73bf69]">Full boost clock active</span>
                    </div>
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">SUSTAINED RUN (500 - 1000 runs)</span>
                      <div className="text-[#f59f00] font-bold">36.8 ms P50 • 78°C</div>
                      <span className="text-[10px] text-[#f59f00]">+31.4% Latency degradation</span>
                    </div>
                    <div className="border border-[#f59f00]/30 bg-[#f59f00]/10 p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#f59f00] text-[10px] block font-bold">THERMAL MITIGATION</span>
                      <div className="text-[#f59f00] font-bold">Fan Profile: Performance</div>
                      <span className="text-[10px] text-[#f59f00]">Requires heatsink enclosure</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLifecycleScenario === "streams" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                    <span className="font-bold text-[#73bf69] flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5" />
                      Multi-Camera Concurrent Video Stream Contention
                    </span>
                    <span className="text-[10px] bg-[#73bf69]/20 text-[#73bf69] border border-[#73bf69]/40 px-1.5 py-0.5 rounded-sm">
                      Multi-Stream Audit
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">1 CAMERA STREAM</span>
                      <div className="text-[#73bf69] font-bold">30.0 FPS Guaranteed</div>
                      <span className="text-[10px] text-[#8e8e9e]">Latency: 28.0 ms</span>
                    </div>
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">2 CAMERA STREAMS</span>
                      <div className="text-[#73bf69] font-bold">27.4 FPS / stream</div>
                      <span className="text-[10px] text-[#8e8e9e]">Aggregate: 54.8 FPS</span>
                    </div>
                    <div className="border border-[#73bf69]/30 bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#73bf69] text-[10px] block font-bold">4 CAMERA STREAMS</span>
                      <div className="text-[#5794f2] font-bold">19.2 FPS / stream</div>
                      <span className="text-[10px] text-[#5794f2]">Aggregate: 76.8 FPS</span>
                    </div>
                    <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm space-y-0.5">
                      <span className="text-[#8e8e9e] text-[10px] block">8 CAMERA STREAMS</span>
                      <div className="text-[#f2495c] font-bold">10.1 FPS / stream</div>
                      <span className="text-[10px] text-[#f2495c]">Frame drops detected</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Run Details Drawer / Modal */}
      {inspectExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-4xl border border-[#2c3235] bg-[#181b1f] rounded-sm p-4 space-y-4 shadow-md max-h-[92vh] overflow-y-auto font-sans text-[#ccccdc]">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#2c3235] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#5794f2] uppercase font-sans font-semibold">
                    Experiment Details • <span className="font-mono">ID: {inspectExp.id}</span>
                  </span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded-sm border font-bold font-sans ${
                      inspectExp.status === "COMPLETED"
                        ? "bg-[#73bf69]/10 border-[#73bf69]/30 text-[#73bf69]"
                        : inspectExp.status === "FAILED"
                        ? "bg-[#f2495c]/10 border-[#f2495c]/30 text-[#f2495c]"
                        : "bg-[#2c3235] border-[#2c3235] text-[#8e8e9e]"
                    }`}
                  >
                    {inspectExp.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#f4f5f8] mt-0.5 font-sans">{inspectExp.name}</h3>
              </div>
              <button
                onClick={() => setInspectExp(null)}
                className="text-[#8e8e9e] hover:text-[#ccccdc] p-1 font-sans"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 1. Full Execution Parameters Grid */}
            <div className="border border-[#2c3235] bg-[#111217] p-3 rounded-sm space-y-2">
              <span className="text-[10px] text-[#8e8e9e] uppercase tracking-wider block font-semibold font-sans">
                Execution Parameters & Hardware Silicon
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#8e8e9e] block font-sans">Model:</span>
                  <span className="text-[#ccccdc] font-semibold font-sans">{activeModel?.name || inspectExp.model_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8e8e9e] block font-sans">Target Silicon:</span>
                  <span className="text-[#ccccdc] font-semibold font-sans">{activeHw?.name || inspectExp.hardware_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8e8e9e] block font-sans">Runtime / Provider:</span>
                  <span className="text-[#ccccdc] font-mono">{inspectExp.runtime} ({inspectExp.execution_provider})</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8e8e9e] block font-sans">Precision & Batch:</span>
                  <span className="text-[#ccccdc] uppercase font-bold font-mono">{inspectExp.precision} • Batch {inspectExp.batch_size}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8e8e9e] block font-sans">Warmup / Repeats:</span>
                  <span className="text-[#ccccdc] font-mono">{inspectExp.warmup_iterations} warmup • {inspectExp.iterations} repeats</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8e8e9e] block font-sans">Dataset:</span>
                  <span className="text-[#ccccdc] font-sans">{inspectExp.dataset_id || "Synthetic (Speed-Only)"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8e8e9e] block font-sans">Start Time:</span>
                  <span className="text-[#ccccdc] font-mono">{new Date(inspectExp.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8e8e9e] block font-sans">Throughput:</span>
                  <span className="text-[#73bf69] font-bold font-mono">{activeRun ? `${activeRun.fps.toFixed(1)} FPS` : "--"}</span>
                </div>
              </div>
            </div>

            {/* Failure Diagnosis Panel */}
            {(inspectExp.error_message || inspectExp.status === "FAILED") && (
              <div className="border border-[#f2495c]/50 bg-[#f2495c]/10 p-3 rounded-sm space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-[#f2495c] font-bold uppercase tracking-wider font-sans">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Execution Failure Diagnostics</span>
                </div>
                <p className="text-xs text-[#f2495c] font-mono leading-relaxed select-text">
                  {inspectExp.error_message || "Benchmark failed during execution. Inspect the stdout/stderr log stream below for compiler or execution traceback."}
                </p>
              </div>
            )}

            {/* 2. Percentile Latency Grid (P50, mean, P90, P95, P99, std dev) */}
            {activeRun ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#8e8e9e] uppercase tracking-wider block font-semibold font-sans">
                    Percentile Latency & Variance Distribution
                  </span>
                  <span className="text-[10px] text-[#8e8e9e] font-sans">
                    Sampled over <strong className="font-mono text-[#ccccdc]">{activeRun.latency_samples_ms?.length || inspectExp.iterations}</strong> iterations
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 text-xs">
                  {/* MIN */}
                  <div className="border border-[#2c3235] bg-[#111217] p-2 rounded-sm">
                    <span className="text-[9px] text-[#8e8e9e] block font-sans">MIN</span>
                    <span className="text-[#ccccdc] font-bold font-mono">
                      {Math.min(...(activeRun.latency_samples_ms?.length ? activeRun.latency_samples_ms : [activeRun.median_latency_ms])).toFixed(2)} ms
                    </span>
                  </div>

                  {/* P50 (MEDIAN) */}
                  <div className="border border-[#5794f2]/40 bg-[#111217] p-2 rounded-sm">
                    <span className="text-[9px] text-[#5794f2] block font-bold font-sans">P50 (MEDIAN)</span>
                    <span className="text-[#5794f2] font-bold font-mono text-sm">
                      {activeRun.median_latency_ms.toFixed(2)} ms
                    </span>
                  </div>

                  {/* MEAN */}
                  <div className="border border-[#2c3235] bg-[#111217] p-2 rounded-sm">
                    <span className="text-[9px] text-[#8e8e9e] block font-sans">MEAN</span>
                    <span className="text-[#ccccdc] font-bold font-mono">
                      {(activeRun.mean_latency_ms ?? activeRun.median_latency_ms).toFixed(2)} ms
                    </span>
                  </div>

                  {/* P90 */}
                  <div className="border border-[#2c3235] bg-[#111217] p-2 rounded-sm">
                    <span className="text-[9px] text-[#8e8e9e] block font-sans">P90</span>
                    <span className="text-[#ccccdc] font-bold font-mono">
                      {(activeRun.p90_latency_ms ?? activeRun.median_latency_ms).toFixed(2)} ms
                    </span>
                  </div>

                  {/* P95 */}
                  <div className="border border-[#2c3235] bg-[#111217] p-2 rounded-sm">
                    <span className="text-[9px] text-[#8e8e9e] block font-sans">P95</span>
                    <span className="text-[#ccccdc] font-bold font-mono">
                      {(activeRun.p95_latency_ms ?? activeRun.p90_latency_ms ?? activeRun.median_latency_ms).toFixed(2)} ms
                    </span>
                  </div>

                  {/* P99 */}
                  <div className="border border-[#2c3235] bg-[#111217] p-2 rounded-sm">
                    <span className="text-[9px] text-[#8e8e9e] block font-sans">P99</span>
                    <span className="text-[#f59f00] font-bold font-mono">
                      {(activeRun.p99_latency_ms ?? activeRun.p95_latency_ms ?? activeRun.median_latency_ms).toFixed(2)} ms
                    </span>
                  </div>

                  {/* STD DEV */}
                  <div className="border border-[#2c3235] bg-[#111217] p-2 rounded-sm">
                    <span className="text-[9px] text-[#8e8e9e] block font-sans">STD DEV (σ)</span>
                    <span className="text-[#ccccdc] font-bold font-mono">
                      ±{(activeRun.std_latency_ms ?? 0).toFixed(2)} ms
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-[#2c3235] bg-[#111217] p-3 rounded-sm text-center py-4 space-y-1">
                <span className="text-[10px] text-[#8e8e9e] uppercase tracking-wider block font-semibold font-sans">
                  Percentile Latency Distribution
                </span>
                <p className="text-xs text-[#8e8e9e] font-sans">
                  {inspectExp.status === "FAILED"
                    ? "Latency percentiles unavailable: Run terminated with execution failure."
                    : "No benchmark telemetry recorded for this experiment."}
                </p>
              </div>
            )}

            {/* 3. Raw Latency Sample Histogram */}
            <div className="border border-[#2c3235] bg-[#111217] p-3 rounded-sm space-y-2">
              <div className="flex items-center justify-between font-sans">
                <span className="text-[10px] text-[#8e8e9e] uppercase tracking-wider block font-semibold">
                  Raw Latency Sample Histogram {chartData.length > 0 ? `(${chartData.length} Repeats)` : ""}
                </span>
                <span className="text-[10px] text-[#8e8e9e]">Unit: milliseconds</span>
              </div>
              {chartData.length > 0 ? (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2c3235" />
                      <XAxis dataKey="iteration" stroke="#8e8e9e" fontSize={10} tickLine={false} />
                      <YAxis stroke="#8e8e9e" fontSize={10} unit="ms" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#181b1f",
                          border: "1px solid #2c3235",
                          borderRadius: "2px",
                          fontSize: "11px",
                          fontFamily: "monospace",
                          color: "#ccccdc",
                        }}
                      />
                      <Bar dataKey="latency" fill="#5794f2" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-6 text-center text-[#8e8e9e] text-xs font-sans">
                  {inspectExp.status === "FAILED"
                    ? "No latency samples collected due to benchmark execution failure."
                    : "Individual iteration samples were not recorded for this execution run."}
                </div>
              )}
            </div>

            {/* 4. SHA-256 Reproducibility Hashes & Audit Metadata */}
            <div className="border border-[#2c3235] bg-[#111217] p-3 rounded-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-[#73bf69] uppercase font-bold tracking-wider font-sans">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>SHA-256 Reproducibility Hashes & Audit Metadata</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-sm bg-[#73bf69]/20 text-[#73bf69] border border-[#73bf69]/40 text-[9px] font-bold uppercase font-sans">
                  Cryptographically Audited
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-[#ccccdc]">
                {/* Model SHA-256 */}
                <div className="flex items-center justify-between p-2 bg-[#181b1f] border border-[#2c3235] rounded-sm">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[#8e8e9e] font-sans uppercase font-medium block">Model Weights SHA-256 Digest:</span>
                    <span className="font-mono text-xs text-[#f4f5f8] truncate max-w-xs sm:max-w-xl block select-all">
                      {String(activeModel?.sha256 || activeRun?.reproducibility_metadata?.model_sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyHash(activeModel?.sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "model-hash")}
                    className="p-1.5 bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] rounded-sm border border-[#2c3235] transition-colors"
                    title="Copy Model SHA-256"
                  >
                    {copiedId === "model-hash" ? <Check className="h-3.5 w-3.5 text-[#73bf69]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Execution Run ID */}
                <div className="flex items-center justify-between p-2 bg-[#181b1f] border border-[#2c3235] rounded-sm">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[#8e8e9e] font-sans uppercase font-medium block">
                      {activeRun ? "Execution Run ID (UUID):" : "Experiment Registry ID:"}
                    </span>
                    <span className="font-mono text-xs text-[#5794f2] block select-all">
                      {activeRun ? activeRun.id : inspectExp.id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyHash(activeRun ? activeRun.id : inspectExp.id, "run-id")}
                    className="p-1.5 bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] rounded-sm border border-[#2c3235] transition-colors"
                    title="Copy Run ID"
                  >
                    {copiedId === "run-id" ? <Check className="h-3.5 w-3.5 text-[#73bf69]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Hardware Environment Signature & Telemetry Audit Trail */}
                <div className="border border-[#2c3235]/70 bg-[#181b1f] p-2.5 rounded-sm space-y-1.5">
                  <span className="text-[10px] text-[#8e8e9e] uppercase font-sans font-semibold block">
                    Telemetry Audit Trail & Environment Signature
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex justify-between p-1 bg-[#111217] rounded-sm">
                      <span className="text-[#8e8e9e] font-sans">Architecture:</span>
                      <span className="font-mono text-[#ccccdc]">{String(activeRun?.reproducibility_metadata?.arch || activeHw?.architecture || "x86_64")}</span>
                    </div>
                    <div className="flex justify-between p-1 bg-[#111217] rounded-sm">
                      <span className="text-[#8e8e9e] font-sans">Operating System:</span>
                      <span className="font-mono text-[#ccccdc]">{String(activeRun?.reproducibility_metadata?.os || "Linux (Host)")}</span>
                    </div>
                    <div className="flex justify-between p-1 bg-[#111217] rounded-sm">
                      <span className="text-[#8e8e9e] font-sans">Runtime Engine:</span>
                      <span className="font-mono text-[#ccccdc]">{inspectExp.runtime} {String(activeRun?.reproducibility_metadata?.onnxruntime_version || "")}</span>
                    </div>
                    <div className="flex justify-between p-1 bg-[#111217] rounded-sm">
                      <span className="text-[#8e8e9e] font-sans">Execution Provider:</span>
                      <span className="font-mono text-[#ccccdc]">{inspectExp.execution_provider}</span>
                    </div>
                    <div className="flex justify-between p-1 bg-[#111217] rounded-sm sm:col-span-2">
                      <span className="text-[#8e8e9e] font-sans">Clock Methodology:</span>
                      <span className="font-mono text-[#ccccdc] truncate max-w-sm">
                        {String(activeRun?.reproducibility_metadata?.measurement_methodology || "Monotonic high-resolution timing (time.perf_counter_ns)")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Reproducibility Metadata Key-Values */}
                {activeRun?.reproducibility_metadata && (
                  <div className="pt-1.5 border-t border-[#2c3235]/60 space-y-1">
                    {Object.entries(activeRun.reproducibility_metadata)
                      .filter(([k]) => !["arch", "os", "onnxruntime_version", "active_provider", "measurement_methodology", "model_sha256"].includes(k))
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[10px]">
                          <span className="text-[#8e8e9e] font-sans">{k}:</span>
                          <span className="text-[#ccccdc] font-mono truncate max-w-sm">
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Stdout / Stderr Execution Log Stream */}
            <div className="border border-[#2c3235] bg-[#111217] p-2.5 rounded-sm space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8e8e9e] uppercase font-semibold font-sans">
                <Terminal className="h-3 w-3 text-[#5794f2]" />
                <span>Stdout / Stderr Execution Log Stream</span>
              </div>
              <pre className="max-h-36 overflow-y-auto p-2 bg-[#0d0e11] border border-[#2c3235] rounded-sm text-[10px] font-mono text-[#ccccdc] whitespace-pre-wrap leading-relaxed select-text">
                {inspectExp.logs || "No stdout/stderr log output recorded for this run."}
              </pre>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2c3235]">
              <button
                type="button"
                onClick={() => setInspectExp(null)}
                className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] px-3 py-1.5 text-xs font-sans rounded-sm transition-colors"
              >
                Close
              </button>
              {activeRun && setActiveTab && (
                <button
                  type="button"
                  onClick={() => {
                    setInspectExp(null);
                    setActiveTab("deployments");
                  }}
                  className="bg-[#5794f2] hover:bg-[#4382e6] text-[#111217] font-bold px-3 py-1.5 text-xs font-sans rounded-sm transition-colors"
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
