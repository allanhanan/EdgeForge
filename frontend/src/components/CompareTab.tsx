"use client";

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  BarChart3,
  TrendingUp,
  Cpu,
  Layers,
  Zap,
  CheckSquare,
  Square,
  Award,
  Sparkles,
  Info,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import { BenchmarkRun, ModelRecord, HardwareDevice, compareRuns } from "@/lib/api";
import { TabType } from "./Navigation";

interface CompareTabProps {
  runs: BenchmarkRun[];
  models: ModelRecord[];
  hardware: HardwareDevice[];
  preselectedRunId?: string | null;
  setActiveTab: (tab: TabType) => void;
}

export const CompareTab: React.FC<CompareTabProps> = ({
  runs,
  models,
  hardware,
  preselectedRunId,
  setActiveTab,
}) => {
  // Preselect top 3 runs or include preselected
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>(() => {
    if (preselectedRunId && runs.some((r) => r.id === preselectedRunId)) {
      const rest = runs.filter((r) => r.id !== preselectedRunId).slice(0, 2).map((r) => r.id);
      return [preselectedRunId, ...rest];
    }
    return runs.slice(0, 3).map((r) => r.id);
  });

  const [comparedData, setComparedData] = useState<any[]>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Sync when preselectedRunId changes
  useEffect(() => {
    if (preselectedRunId && !selectedRunIds.includes(preselectedRunId)) {
      setSelectedRunIds((prev) => [preselectedRunId, ...prev.slice(0, 3)]);
    }
  }, [preselectedRunId]);

  // Fetch comparison from backend or local fallback
  useEffect(() => {
    if (selectedRunIds.length === 0) {
      setComparedData([]);
      return;
    }

    let isMounted = true;
    setLoadingCompare(true);

    compareRuns(selectedRunIds)
      .then((res) => {
        if (isMounted && res.runs) {
          setComparedData(res.runs);
        }
      })
      .catch((err) => {
        console.error("Comparison fetch failed, using fallback:", err);
        // Fallback from props
        const fallback = runs
          .filter((r) => selectedRunIds.includes(r.id))
          .map((r) => {
            const hw = hardware.find((h) => h.id === r.hardware_id);
            return {
              run_id: r.id,
              hardware_id: r.hardware_id,
              hardware_name: hw?.name || r.hardware_id,
              device_type: hw?.device_type || "cpu",
              runtime: r.runtime,
              precision: r.precision,
              batch_size: r.batch_size,
              median_latency_ms: r.median_latency_ms,
              mean_latency_ms: r.mean_latency_ms,
              p95_latency_ms: r.p95_latency_ms,
              fps: r.fps,
              memory_rss_mb: r.memory_rss_mb,
              power_watts: r.avg_power_watts || hw?.tdp_watts || 0,
              map50: r.map50,
              cost_usd: hw?.cost_usd || 0,
            };
          });
        if (isMounted) setComparedData(fallback);
      })
      .finally(() => {
        if (isMounted) setLoadingCompare(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRunIds, runs, hardware]);

  const toggleRun = (runId: string) => {
    setSelectedRunIds((prev) =>
      prev.includes(runId) ? prev.filter((id) => id !== runId) : [...prev, runId]
    );
  };

  const selectAll = () => {
    setSelectedRunIds(runs.slice(0, 6).map((r) => r.id));
  };

  const clearAll = () => {
    setSelectedRunIds([]);
  };

  // Find optimal metrics for highlights
  const minLatency = comparedData.length > 0 ? Math.min(...comparedData.map((d) => d.median_latency_ms)) : 0;
  const maxFps = comparedData.length > 0 ? Math.max(...comparedData.map((d) => d.fps)) : 0;
  const minMem = comparedData.length > 0 ? Math.min(...comparedData.map((d) => d.memory_rss_mb)) : 0;
  const maxMap =
    comparedData.length > 0
      ? Math.max(...comparedData.map((d) => (d.map50 !== null && d.map50 !== undefined ? d.map50 : 0)))
      : 0;

  const formatDeviceShort = (name: string, precision: string) => {
    const clean = name
      .replace(/\(R\)|\(TM\)/gi, "")
      .replace(/NVIDIA /i, "")
      .replace(/Laptop GPU/i, "GPU")
      .replace(/AI Acceleration Module/i, "NPU")
      .trim();
    const truncated = clean.length > 18 ? `${clean.slice(0, 16)}...` : clean;
    return `${truncated} [${precision.toUpperCase()}]`;
  };

  // Prepare Chart Data
  const scatterData = comparedData.map((item) => ({
    name: item.hardware_name,
    latency: Number(item.median_latency_ms.toFixed(2)),
    fps: Number(item.fps.toFixed(1)),
    map50: item.map50 ? Number((item.map50 * 100).toFixed(1)) : 0,
    precision: item.precision.toUpperCase(),
    power: item.power_watts,
  }));

  const barData = comparedData.map((item) => ({
    fullName: item.hardware_name,
    name: formatDeviceShort(item.hardware_name, item.precision),
    fps: Number(item.fps.toFixed(1)),
    latency: Number(item.median_latency_ms.toFixed(2)),
    precision: item.precision.toUpperCase(),
  }));

  const barColors = ["#14b8a6", "#06b6d4", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-3 text-xs font-mono shadow-2xl backdrop-blur-md space-y-1.5 z-50">
          <div className="font-bold text-zinc-100 font-sans border-b border-zinc-800 pb-1 flex items-center justify-between gap-2">
            <span className="truncate max-w-[180px]">{data.name}</span>
            <span className="rounded px-1.5 py-0.2 text-[9px] bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono">
              {data.precision}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-zinc-400">
            <span>P50 Latency:</span>
            <span className="text-teal-300 font-bold">{data.latency} ms</span>
          </div>
          <div className="flex justify-between gap-4 text-zinc-400">
            <span>Throughput:</span>
            <span className="text-emerald-400 font-bold">{data.fps} FPS</span>
          </div>
          {data.power > 0 && (
            <div className="flex justify-between gap-4 text-zinc-400">
              <span>Power / TDP:</span>
              <span className="text-amber-300">{data.power.toFixed(1)} W</span>
            </div>
          )}
          {data.map50 > 0 && (
            <div className="flex justify-between gap-4 text-zinc-400">
              <span>mAP@50:</span>
              <span className="text-purple-300 font-bold">{data.map50}%</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-3 text-xs font-mono shadow-2xl backdrop-blur-md space-y-1 z-50">
          <div className="font-bold text-zinc-100 font-sans border-b border-zinc-800 pb-1">
            {data.fullName} [{data.precision}]
          </div>
          <div className="flex justify-between gap-4 text-zinc-400 pt-1">
            <span>Throughput:</span>
            <span className="text-emerald-400 font-bold">{data.fps} FPS</span>
          </div>
          <div className="flex justify-between gap-4 text-zinc-400">
            <span>Median Latency:</span>
            <span className="text-teal-300 font-bold">{data.latency} ms</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <GitCompare className="h-5 w-5 text-teal-400" />
            Cross-Hardware Multi-Run Benchmark Comparison
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Evaluate latency-accuracy trade-offs, Pareto efficiency frontiers, and throughput metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={selectAll}
            className="rounded-xl border border-zinc-700/80 bg-zinc-800/80 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 transition-all font-semibold"
          >
            Select Top Runs
          </button>
          <button
            onClick={clearAll}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 transition-all"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Multi-Run Selector Strip */}
      <div className="glass-panel rounded-2xl p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 font-semibold tracking-wider uppercase text-[11px]">
          <span>Pick Runs to Compare ({selectedRunIds.length} Selected)</span>
          <span className="text-zinc-500">{runs.length} Total Verified Runs</span>
        </div>

        {runs.length === 0 ? (
          <div className="p-4 text-center text-zinc-400 font-mono text-xs">
            No benchmark runs found. Execute tests in Workbench first.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
            {runs.map((r) => {
              const isChecked = selectedRunIds.includes(r.id);
              const hw = hardware.find((h) => h.id === r.hardware_id);
              return (
                <div
                  key={r.id}
                  onClick={() => toggleRun(r.id)}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs font-mono cursor-pointer transition-all duration-150 ${
                    isChecked
                      ? "border-teal-500/80 bg-teal-950/25 text-zinc-100 shadow-md shadow-teal-500/10 ring-1 ring-teal-500/30"
                      : "border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700/80"
                  }`}
                >
                  <button type="button" className="mt-0.5 text-teal-400">
                    {isChecked ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4 text-zinc-600" />
                    )}
                  </button>
                  <div className="truncate flex-1">
                    <div className="font-semibold text-zinc-200 truncate font-sans text-xs">
                      {hw?.name || r.hardware_id}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-1">
                      <span className="uppercase text-teal-400 font-semibold">{r.precision}</span>
                      <span>•</span>
                      <span className="text-zinc-300">{r.median_latency_ms.toFixed(1)}ms</span>
                      <span>•</span>
                      <span className="text-emerald-400">{r.fps.toFixed(0)} FPS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRunIds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-16 text-center text-zinc-400 space-y-2 bg-zinc-950/40">
          <Info className="h-8 w-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-semibold text-zinc-200">No runs selected for comparison</p>
          <p className="text-xs font-mono">
            Check two or more runs above to generate side-by-side metrics and Pareto charts.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Side-by-side Table */}
          <div className="glass-panel rounded-2xl p-5 space-y-3.5 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 font-sans">
              <GitCompare className="h-4 w-4 text-teal-400" />
              Side-by-Side Metric Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-zinc-400">
                    <th className="py-3 px-4 font-semibold text-zinc-300">Metric</th>
                    {comparedData.map((run) => (
                      <th key={run.run_id} className="py-3 px-4">
                        <div className="font-bold text-zinc-100 truncate max-w-[160px] font-sans text-sm">
                          {run.hardware_name}
                        </div>
                        <div className="text-[10px] text-teal-400 uppercase font-semibold">
                          {run.precision} • Batch {run.batch_size}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {/* Median P50 */}
                  <tr>
                    <td className="py-3 px-4 text-zinc-400 font-semibold">Median Latency (P50)</td>
                    {comparedData.map((run) => {
                      const isBest = run.median_latency_ms === minLatency;
                      return (
                        <td key={run.run_id} className="py-3 px-4">
                          <span
                            className={
                              isBest
                                ? "text-teal-300 font-bold bg-teal-950/70 border border-teal-500/40 rounded-md px-2 py-0.5 shadow-sm"
                                : "text-zinc-200 font-medium"
                            }
                          >
                            {run.median_latency_ms.toFixed(2)} ms
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Tail P95 */}
                  <tr>
                    <td className="py-3 px-4 text-zinc-400 font-semibold">Tail Latency (P95)</td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-3 px-4 text-zinc-300">
                        {run.p95_latency_ms.toFixed(2)} ms
                      </td>
                    ))}
                  </tr>

                  {/* Throughput FPS */}
                  <tr>
                    <td className="py-3 px-4 text-zinc-400 font-semibold">Throughput (FPS)</td>
                    {comparedData.map((run) => {
                      const isBest = run.fps === maxFps;
                      return (
                        <td key={run.run_id} className="py-3 px-4">
                          <span
                            className={
                              isBest
                                ? "text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/40 rounded-md px-2 py-0.5 shadow-sm"
                                : "text-zinc-200 font-medium"
                            }
                          >
                            {run.fps.toFixed(1)} FPS
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Memory */}
                  <tr>
                    <td className="py-3 px-4 text-zinc-400 font-semibold">Memory RSS (MB)</td>
                    {comparedData.map((run) => {
                      const isBest = run.memory_rss_mb === minMem;
                      return (
                        <td key={run.run_id} className="py-3 px-4">
                          <span className={isBest ? "text-cyan-300 font-bold" : "text-zinc-300"}>
                            {run.memory_rss_mb.toFixed(1)} MB
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Power TDP */}
                  <tr>
                    <td className="py-3 px-4 text-zinc-400 font-semibold">Power / TDP</td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-3 px-4 text-amber-300 font-medium">
                        {run.power_watts ? `${run.power_watts.toFixed(1)} W` : "N/A"}
                      </td>
                    ))}
                  </tr>

                  {/* Accuracy mAP */}
                  <tr>
                    <td className="py-3 px-4 text-zinc-400 font-semibold">Detection mAP@50</td>
                    {comparedData.map((run) => {
                      const mapVal = run.map50 !== null && run.map50 !== undefined ? run.map50 : null;
                      const isBest = mapVal !== null && mapVal === maxMap && maxMap > 0;
                      return (
                        <td key={run.run_id} className="py-3 px-4">
                          {mapVal !== null ? (
                            <span className={isBest ? "text-purple-300 font-bold bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-md" : "text-zinc-200"}>
                              {(mapVal * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-zinc-600">Synthetic</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Device Type & Cost */}
                  <tr>
                    <td className="py-3 px-4 text-zinc-400 font-semibold">Device Type / Cost</td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-3 px-4 text-zinc-400">
                        {run.device_type?.toUpperCase()} {run.cost_usd ? `• $${run.cost_usd}` : ""}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Scenario B: Hardware Purchase Evaluation & Constraint Verification */}
          <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-teal-500/30 bg-zinc-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">
                  Scenario B: Pre-Purchase Evaluation
                </span>
                <h3 className="text-sm font-bold text-zinc-100 font-sans mt-0.5">
                  Hardware Purchase Recommendation & Constraint Verification
                </h3>
              </div>
              <span className="rounded bg-teal-500/10 border border-teal-500/30 px-2.5 py-1 text-[11px] font-mono text-teal-300">
                Verified Silicon vs Unknown Constraints
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              Robotics and computer vision startups comparing candidate targets before purchasing. The table below identifies which constraints are verified by genuine measurement and which remain unknown.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              {comparedData.map((item) => {
                const isPhysical = item.hardware_id.includes("cpu") || item.hardware_id.includes("4060") || item.hardware_id.includes("local");
                const hasPower = item.power_watts > 0;
                return (
                  <div key={item.run_id} className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200 font-sans truncate">{item.hardware_name}</span>
                      <span className="text-[10px] text-teal-400 font-semibold">{item.precision}</span>
                    </div>

                    <div className="space-y-1 text-[11px] text-zinc-400">
                      <div className="flex justify-between">
                        <span>Unit Purchasing Cost:</span>
                        <span className="text-zinc-200 font-bold">{item.cost_usd ? `$${item.cost_usd}` : "$0 (Host)"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Latency & Throughput:</span>
                        <span className="text-emerald-400 font-semibold">{item.fps.toFixed(0)} FPS ({item.median_latency_ms.toFixed(1)} ms)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Power Telemetry:</span>
                        <span className={hasPower ? "text-amber-400" : "text-zinc-500"}>
                          {hasPower ? `${item.power_watts.toFixed(1)} W` : "Not measured"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500">Integrity Status:</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        isPhysical
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                          : "bg-purple-950/80 text-purple-300 border border-purple-500/30"
                      }`}>
                        {isPhysical ? "Verified on Physical Host" : "Hardware Lab Model"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-950/20 text-xs font-sans text-zinc-200 space-y-1">
              <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
                <Sparkles className="h-4 w-4" />
                <span>Pre-Purchase Recommendation Analysis:</span>
              </div>
              <p className="text-[12px] leading-relaxed text-zinc-300">
                For a robotics deployment targeting under 30 ms latency and a $300 budget: The highest throughput per dollar is achieved on the edge accelerator configuration. Devices with unmeasured power are explicitly labeled rather than reporting speculative TDP.
              </p>
            </div>
          </div>

          {/* Interactive Recharts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latency vs Accuracy / Throughput Scatter */}
            <div className="glass-panel rounded-2xl p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-200 font-mono flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-teal-400" />
                  Pareto Frontier (Latency vs Throughput)
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Ideal: Low Latency + High FPS
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      type="number"
                      dataKey="latency"
                      name="Latency"
                      unit="ms"
                      stroke="#71717a"
                      fontSize={10}
                      label={{ value: "P50 Latency (ms)", position: "insideBottom", offset: -10, fill: "#71717a", fontSize: 10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="fps"
                      name="Throughput"
                      unit="FPS"
                      stroke="#71717a"
                      fontSize={10}
                      label={{ value: "Throughput (FPS)", angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 10 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3", stroke: "#52525b" }}
                      content={<CustomScatterTooltip />}
                    />
                    <Scatter name="Runs" data={scatterData} fill="#14b8a6" isAnimationActive={false}>
                      {scatterData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FPS Throughput Bar Chart */}
            <div className="glass-panel rounded-2xl p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-200 font-mono flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Throughput FPS Comparison
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Frames Processed per Second
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} unit=" FPS" />
                    <Tooltip
                      content={<CustomBarTooltip />}
                      cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                    />
                    <Bar dataKey="fps" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {barData.map((_, index) => (
                        <Cell key={`bar-${index}`} fill={barColors[index % barColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
