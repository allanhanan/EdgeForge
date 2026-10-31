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
              power_watts: r.avg_power_watts || hw?.tdp_watts || 15,
              map50: r.map50,
              cost_usd: hw?.cost_usd || 100,
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

  const toggleRun = (id: string) => {
    setSelectedRunIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedRunIds(runs.slice(0, 6).map((r) => r.id));
  };

  const clearAll = () => {
    setSelectedRunIds([]);
  };

  // Find optimal values for highlighting
  const minLatency = comparedData.length > 0 ? Math.min(...comparedData.map((d) => d.median_latency_ms)) : 0;
  const maxFps = comparedData.length > 0 ? Math.max(...comparedData.map((d) => d.fps)) : 0;
  const minMem = comparedData.length > 0 ? Math.min(...comparedData.map((d) => d.memory_rss_mb)) : 0;
  const maxMap = comparedData.length > 0 ? Math.max(...comparedData.map((d) => d.map50 || 0)) : 0;

  // Chart data
  const scatterData = comparedData.map((item) => ({
    name: `${item.hardware_name} (${item.precision.toUpperCase()})`,
    latency: Number(item.median_latency_ms.toFixed(2)),
    map50: item.map50 ? Number((item.map50 * 100).toFixed(1)) : 85.0, // fallback for viz
    fps: Number(item.fps.toFixed(1)),
  }));

  const barData = comparedData.map((item) => ({
    name: item.hardware_name.length > 18 ? item.hardware_name.slice(0, 16) + "..." : item.hardware_name,
    fps: Number(item.fps.toFixed(1)),
    latency: Number(item.median_latency_ms.toFixed(2)),
    precision: item.precision.toUpperCase(),
  }));

  const barColors = ["#14b8a6", "#06b6d4", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
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
            className="rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-zinc-300 hover:bg-zinc-700"
          >
            Select Top Runs
          </button>
          <button
            onClick={clearAll}
            className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400 hover:text-zinc-200"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Multi-Run Selector Strip */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>PICK RUNS TO COMPARE ({selectedRunIds.length} SELECTED)</span>
          <span>{runs.length} TOTAL VERIFIED RUNS</span>
        </div>

        {runs.length === 0 ? (
          <div className="p-4 text-center text-zinc-400 font-mono text-xs">
            No benchmark runs found. Execute tests in Workbench first.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {runs.map((r) => {
              const isChecked = selectedRunIds.includes(r.id);
              const hw = hardware.find((h) => h.id === r.hardware_id);
              return (
                <div
                  key={r.id}
                  onClick={() => toggleRun(r.id)}
                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs font-mono cursor-pointer transition-all ${
                    isChecked
                      ? "border-teal-500 bg-teal-950/20 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
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
                    <div className="font-semibold text-zinc-200 truncate">
                      {hw?.name || r.hardware_id}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                      <span className="uppercase text-teal-400">{r.precision}</span>
                      <span>•</span>
                      <span>{r.median_latency_ms.toFixed(1)}ms</span>
                      <span>•</span>
                      <span>{r.fps.toFixed(0)} FPS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRunIds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-400 space-y-2">
          <Info className="h-8 w-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-medium text-zinc-300">No runs selected for comparison</p>
          <p className="text-xs font-mono">
            Check two or more runs above to generate side-by-side metrics and Pareto charts.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Side-by-side Table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-teal-400" />
              Side-by-Side Metric Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2.5 px-3">Metric</th>
                    {comparedData.map((run) => (
                      <th key={run.run_id} className="py-2.5 px-3">
                        <div className="font-bold text-zinc-200 truncate max-w-[150px]">
                          {run.hardware_name}
                        </div>
                        <div className="text-[10px] text-teal-400 uppercase">
                          {run.precision} • Batch {run.batch_size}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {/* Median P50 */}
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-400 font-semibold">Median Latency (P50)</td>
                    {comparedData.map((run) => {
                      const isBest = run.median_latency_ms === minLatency;
                      return (
                        <td key={run.run_id} className="py-2.5 px-3">
                          <span
                            className={
                              isBest
                                ? "text-teal-400 font-bold bg-teal-950/60 border border-teal-500/30 rounded px-1.5 py-0.5"
                                : "text-zinc-200"
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
                    <td className="py-2.5 px-3 text-zinc-400 font-semibold">Tail Latency (P95)</td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-2.5 px-3 text-zinc-300">
                        {run.p95_latency_ms.toFixed(2)} ms
                      </td>
                    ))}
                  </tr>

                  {/* Throughput FPS */}
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-400 font-semibold">Throughput (FPS)</td>
                    {comparedData.map((run) => {
                      const isBest = run.fps === maxFps;
                      return (
                        <td key={run.run_id} className="py-2.5 px-3">
                          <span
                            className={
                              isBest
                                ? "text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 rounded px-1.5 py-0.5"
                                : "text-zinc-200"
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
                    <td className="py-2.5 px-3 text-zinc-400 font-semibold">Memory RSS (MB)</td>
                    {comparedData.map((run) => {
                      const isBest = run.memory_rss_mb === minMem;
                      return (
                        <td key={run.run_id} className="py-2.5 px-3">
                          <span className={isBest ? "text-cyan-400 font-bold" : "text-zinc-300"}>
                            {run.memory_rss_mb.toFixed(1)} MB
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Power TDP */}
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-400 font-semibold">Power / TDP</td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-2.5 px-3 text-amber-300">
                        {run.power_watts ? `${run.power_watts.toFixed(1)} W` : "N/A"}
                      </td>
                    ))}
                  </tr>

                  {/* Accuracy mAP */}
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-400 font-semibold">Detection mAP@50</td>
                    {comparedData.map((run) => {
                      const mapVal = run.map50 !== null && run.map50 !== undefined ? run.map50 : null;
                      const isBest = mapVal !== null && mapVal === maxMap && maxMap > 0;
                      return (
                        <td key={run.run_id} className="py-2.5 px-3">
                          {mapVal !== null ? (
                            <span className={isBest ? "text-purple-400 font-bold" : "text-zinc-200"}>
                              {(mapVal * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-zinc-500">Synthetic</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Device Type & Cost */}
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-400 font-semibold">Device Type / Cost</td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-2.5 px-3 text-zinc-400">
                        {run.device_type?.toUpperCase()} {run.cost_usd ? `• $${run.cost_usd}` : ""}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Recharts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latency vs Accuracy / Throughput Scatter */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-200 font-mono flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-teal-400" />
                  Pareto Frontier (Latency vs Accuracy / FPS)
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Ideal: Low Latency + High Score
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
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    />
                    <Scatter name="Runs" data={scatterData} fill="#14b8a6">
                      {scatterData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FPS Throughput Bar Chart */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-200 font-mono flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Throughput FPS Comparison
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono">
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
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    />
                    <Bar dataKey="fps" radius={[4, 4, 0, 0]}>
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
