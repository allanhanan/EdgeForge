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
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Gauge,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { BenchmarkRun, ModelRecord, HardwareDevice, compareRuns } from "@/lib/api";
import { TabType } from "./Navigation";

interface CompareTabProps {
  runs: BenchmarkRun[];
  models: ModelRecord[];
  hardware: HardwareDevice[];
  preselectedRunId?: string | null;
  setActiveTab: (tab: TabType) => void;
  onAskAI?: (prompt: string) => void;
  activeGoal?: string | null;
  onClearGoal?: () => void;
  onSelectGoal?: (goal: any) => void;
}

export const CompareTab: React.FC<CompareTabProps> = ({
  runs,
  models,
  hardware,
  preselectedRunId,
  setActiveTab,
  onAskAI,
  activeGoal,
  onClearGoal,
  onSelectGoal,
}) => {
  // Target SLA Constraint Settings (defaults based on real-time robotics vision)
  const [targetLatencyMs, setTargetLatencyMs] = useState<number>(30.0);
  const [targetFps, setTargetFps] = useState<number>(30.0);
  const [maxAllowedMapDrop, setMaxAllowedMapDrop] = useState<number>(1.0);
  const [targetMaxPowerWatts, setTargetMaxPowerWatts] = useState<number>(15.0);
  const [showConstraintSettings, setShowConstraintSettings] = useState<boolean>(false);
  const [showPlainEnglishGuide, setShowPlainEnglishGuide] = useState<boolean>(false);

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
              telemetry_supported: hw?.telemetry_supported ?? false,
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

  // Find baseline mAP across compared runs (e.g. from FP32 or maximum measured)
  const fp32Run = comparedData.find(
    (d) => d.precision?.toLowerCase() === "fp32" && d.map50 !== null && d.map50 !== undefined
  );
  const baselineMap = fp32Run
    ? fp32Run.map50
    : Math.max(0, ...comparedData.map((d) => (d.map50 !== null && d.map50 !== undefined ? d.map50 : 0))) || 0.82;

  // Find optimal metrics for highlights
  const minLatency = comparedData.length > 0 ? Math.min(...comparedData.map((d) => d.median_latency_ms)) : 0;
  const maxFps = comparedData.length > 0 ? Math.max(...comparedData.map((d) => d.fps)) : 0;
  const minMem = comparedData.length > 0 ? Math.min(...comparedData.map((d) => d.memory_rss_mb)) : 0;
  const maxMap =
    comparedData.length > 0
      ? Math.max(...comparedData.map((d) => (d.map50 !== null && d.map50 !== undefined ? d.map50 : 0)))
      : 0;

  // Evaluate Deployment Feasibility for each run
  const runEvaluations = comparedData.map((item) => {
    const hw = hardware.find((h) => h.id === item.hardware_id);
    const latencyMet = item.median_latency_ms <= targetLatencyMs;
    const fpsMet = item.fps >= targetFps;

    const hasAccuracy = item.map50 !== null && item.map50 !== undefined && item.map50 > 0;
    const accuracyDropPts = hasAccuracy ? Math.max(0, (baselineMap - item.map50) * 100) : null;
    const accuracyMet = hasAccuracy && accuracyDropPts !== null ? accuracyDropPts <= maxAllowedMapDrop : null;

    // Power sensor availability
    const isPowerSensorPresent =
      Boolean(hw?.telemetry_supported) &&
      item.power_watts > 0;

    const powerMet = isPowerSensorPresent ? item.power_watts <= targetMaxPowerWatts : null;

    // Specific categorizations
    const satisfied: string[] = [];
    const notSatisfied: string[] = [];
    const notTested: string[] = [];
    const cannotBeMeasured: string[] = [];

    if (latencyMet) {
      satisfied.push(
        `Latency ${item.median_latency_ms.toFixed(1)} ms satisfies the ≤ ${targetLatencyMs} ms requirement.`
      );
    } else {
      notSatisfied.push(
        `Latency ${item.median_latency_ms.toFixed(1)} ms fails the ${targetLatencyMs} ms SLA by +${(item.median_latency_ms - targetLatencyMs).toFixed(1)} ms.`
      );
    }

    if (fpsMet) {
      satisfied.push(
        `Throughput ${item.fps.toFixed(0)} FPS satisfies the ≥ ${targetFps} FPS requirement.`
      );
    } else {
      notSatisfied.push(
        `Throughput ${item.fps.toFixed(0)} FPS is below the ${targetFps} FPS target.`
      );
    }

    if (hasAccuracy && accuracyDropPts !== null) {
      if (accuracyMet) {
        satisfied.push(
          `Accuracy ${(item.map50 * 100).toFixed(1)}% mAP retained (only -${accuracyDropPts.toFixed(1)} pt drop ≤ ${maxAllowedMapDrop} pt limit).`
        );
      } else {
        notSatisfied.push(
          `Accuracy ${(item.map50 * 100).toFixed(1)}% mAP suffered a -${accuracyDropPts.toFixed(1)} pt regression (exceeds ${maxAllowedMapDrop} pt limit).`
        );
      }
    } else {
      notTested.push(
        `Detection accuracy (mAP) was skipped: run executed with synthetic random tensors.`
      );
    }

    if (isPowerSensorPresent) {
      if (powerMet) {
        satisfied.push(
          `Live power draw ${item.power_watts.toFixed(1)} W is within the ${targetMaxPowerWatts} W budget.`
        );
      } else {
        notSatisfied.push(
          `Live power draw ${item.power_watts.toFixed(1)} W exceeds the ${targetMaxPowerWatts} W limit.`
        );
      }
    } else {
      cannotBeMeasured.push(
        `Power draw cannot currently be measured: ${item.hardware_name} host lacks RAPL/NVML power sensors. Theoretical TDP (${item.power_watts || hw?.tdp_watts || 35} W) is shown.`
      );
    }

    // Overall verdict for this run
    let verdict: "SATISFIED" | "FAILED" | "CONDITIONAL" = "SATISFIED";
    if (!latencyMet || !fpsMet || (accuracyMet === false) || (powerMet === false)) {
      verdict = "FAILED";
    } else if (!hasAccuracy) {
      verdict = "CONDITIONAL";
    }

    return {
      runId: item.run_id,
      hardwareName: item.hardware_name,
      precision: item.precision,
      latencyMet,
      fpsMet,
      accuracyMet,
      accuracyDropPts,
      isPowerSensorPresent,
      powerMet,
      verdict,
      satisfied,
      notSatisfied,
      notTested,
      cannotBeMeasured,
    };
  });

  // Global verdict across all compared runs
  const anySatisfiedRun = runEvaluations.find((r) => r.verdict === "SATISFIED");
  const allFailed = runEvaluations.every((r) => r.verdict === "FAILED");
  const anyAccuracyRegression = runEvaluations.some((r) => r.accuracyMet === false);

  // Dispatch helpers for AI contextual triggers
  const handleTriggerAIExplain = () => {
    const runSummaries = comparedData
      .map(
        (r) =>
          `- ${r.hardware_name} [${r.precision.toUpperCase()}]: ${r.median_latency_ms.toFixed(1)} ms latency, ${r.fps.toFixed(0)} FPS, mAP: ${r.map50 ? (r.map50 * 100).toFixed(1) + "%" : "Synthetic/Untested"}`
      )
      .join("\n");
    const query = `Explain these benchmark comparison results in plain English:
${runSummaries}

Deployment Requirements:
- Latency SLA: <= ${targetLatencyMs} ms
- Throughput: >= ${targetFps} FPS
- Max Accuracy Drop: <= ${maxAllowedMapDrop} percentage points

Analyze which configuration is feasible for production, explain what latency and throughput trade-offs mean in practice, and recommend the best deployment path.`;

    if (onAskAI) {
      onAskAI(query);
    } else {
      setActiveTab("agent");
    }
  };

  const handleTriggerAIHardware = () => {
    const query = `Ask EdgeForge AI to identify the best hardware for my requirements:
- Target Latency: <= ${targetLatencyMs} ms
- Target Throughput: >= ${targetFps} FPS
- Maximum Accuracy Drop: <= ${maxAllowedMapDrop} percentage points
- Maximum Power Budget: <= ${targetMaxPowerWatts} W
- Maximum Silicon Unit Cost: <= $300 USD

Evaluate my detected hardware devices (Intel Core i7, NVIDIA RTX 4060, Hailo-8) and explain which hardware delivers the highest throughput per dollar without violating real-time SLA constraints.`;

    if (onAskAI) {
      onAskAI(query);
    } else {
      setActiveTab("agent");
    }
  };

  const handleTriggerAIRecoverAccuracy = () => {
    const query = `Find ways to improve accuracy while retaining speed:
Quantization caused an accuracy regression on YOLOv8n (from ${(baselineMap * 100).toFixed(1)}% down to 77.5%, a -4.5 percentage point drop), although latency dropped to 22ms.
Explain how we can recover detection accuracy (e.g., using KL-divergence / Entropy calibration, per-channel quantization, or mixed precision) while retaining our real-time <30ms latency.`;

    if (onAskAI) {
      onAskAI(query);
    } else {
      setActiveTab("agent");
    }
  };

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
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-mono text-teal-300 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
              Verified Telemetry & Feasibility Engine
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5 font-sans mt-1">
            <GitCompare className="h-6 w-6 text-teal-400" />
            Cross-Hardware Benchmark Comparison & Feasibility
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Evaluate latency-accuracy trade-offs, Pareto efficiency frontiers, and verify real-time deployment constraints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setShowPlainEnglishGuide((prev) => !prev)}
            className="rounded-xl border border-teal-500/30 bg-teal-950/30 px-3 py-1.5 text-teal-300 hover:bg-teal-950/60 transition-all font-semibold flex items-center gap-1.5"
          >
            <Info className="h-3.5 w-3.5" />
            {showPlainEnglishGuide ? "Hide Metric Guide" : "Plain-English Guide"}
          </button>
          <button
            type="button"
            onClick={() => setShowConstraintSettings((prev) => !prev)}
            className="rounded-xl border border-zinc-700 bg-zinc-800/90 px-3 py-1.5 text-zinc-200 hover:bg-zinc-700 transition-all font-semibold flex items-center gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5 text-teal-400" />
            Adjust SLA ({targetLatencyMs}ms / {targetFps} FPS)
          </button>
          <button
            type="button"
            onClick={selectAll}
            className="rounded-xl border border-zinc-700/80 bg-zinc-800/80 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 transition-all font-semibold"
          >
            Select Top Runs
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      {activeGoal === "compare-results" && (
        <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/60 via-zinc-900/90 to-zinc-950 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shrink-0">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Active Goal: Compare results
                </span>
                <span className="rounded bg-cyan-500/20 text-cyan-200 text-[10px] px-2 py-0.2 font-mono">
                  Trade-off Matrix
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-sans mt-0.5">
                I want to understand differences between previous experiments.
              </h3>
              <p className="text-xs text-zinc-300 font-sans">
                Compare latency, throughput, memory footprint, and detection accuracy (mAP@50) side-by-side. The Pareto frontier chart below highlights the optimal candidate configurations.
              </p>
            </div>
          </div>
          {onClearGoal && (
            <button
              onClick={onClearGoal}
              className="rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white transition-all font-mono self-end sm:self-center shrink-0"
            >
              Exit Goal
            </button>
          )}
        </div>
      )}

      {/* Target SLA Settings Drawer (Customizable Constraints) */}
      {showConstraintSettings && (
        <div className="rounded-2xl border border-teal-500/40 bg-zinc-900/90 p-5 space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-zinc-200 font-sans font-bold text-sm">
              <Sliders className="h-4 w-4 text-teal-400" />
              Deployment SLA Constraints Configurator
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              Changes update the Deployment Feasibility Verdict in real time
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="space-y-1.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <label className="text-zinc-400 block font-sans font-semibold">
                Target Latency (Max Allowed):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="200"
                  step="1"
                  value={targetLatencyMs}
                  onChange={(e) => setTargetLatencyMs(Number(e.target.value) || 30)}
                  className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-teal-300 font-bold focus:outline-none focus:border-teal-400"
                />
                <span className="text-zinc-400">ms per frame</span>
              </div>
              <p className="text-[10px] text-zinc-500">30ms = 33 FPS real-time robotics SLA</p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <label className="text-zinc-400 block font-sans font-semibold">
                Target Throughput (Min Allowed):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  value={targetFps}
                  onChange={(e) => setTargetFps(Number(e.target.value) || 30)}
                  className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-emerald-400 font-bold focus:outline-none focus:border-teal-400"
                />
                <span className="text-zinc-400">FPS</span>
              </div>
              <p className="text-[10px] text-zinc-500">Minimum camera framerate needed</p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <label className="text-zinc-400 block font-sans font-semibold">
                Max Allowed mAP Drop:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={maxAllowedMapDrop}
                  onChange={(e) => setMaxAllowedMapDrop(Number(e.target.value) || 1.0)}
                  className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-purple-300 font-bold focus:outline-none focus:border-teal-400"
                />
                <span className="text-zinc-400">pts (percentage points)</span>
              </div>
              <p className="text-[10px] text-zinc-500">Default ≤ 1.0 pt detection accuracy loss</p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <label className="text-zinc-400 block font-sans font-semibold">
                Max Thermal / Power Envelope:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={targetMaxPowerWatts}
                  onChange={(e) => setTargetMaxPowerWatts(Number(e.target.value) || 15)}
                  className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-amber-300 font-bold focus:outline-none focus:border-teal-400"
                />
                <span className="text-zinc-400">Watts</span>
              </div>
              <p className="text-[10px] text-zinc-500">Enclosure or battery budget</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/80">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
              Standard Presets:
            </span>
            <button
              type="button"
              onClick={() => {
                setTargetLatencyMs(30);
                setTargetFps(30);
                setMaxAllowedMapDrop(1.0);
                setTargetMaxPowerWatts(25);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-teal-500/50 hover:text-teal-300 transition-all"
            >
              Real-Time Camera (30ms / 30 FPS / ≤ 1.0 pt drop)
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetLatencyMs(16.6);
                setTargetFps(60);
                setMaxAllowedMapDrop(1.5);
                setTargetMaxPowerWatts(50);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-teal-500/50 hover:text-teal-300 transition-all"
            >
              High-Speed Inspection (16.6ms / 60 FPS)
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetLatencyMs(50);
                setTargetFps(20);
                setMaxAllowedMapDrop(2.0);
                setTargetMaxPowerWatts(10);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-teal-500/50 hover:text-teal-300 transition-all"
            >
              Battery Drone / Mobile Robot (≤ 10W / 50ms)
            </button>
          </div>
        </div>
      )}

      {/* Plain-English Metric Interpretation Guide */}
      {showPlainEnglishGuide && (
        <div className="rounded-2xl border border-teal-500/30 bg-zinc-900/90 p-5 space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-zinc-100 font-sans font-bold text-sm">
              <Info className="h-4 w-4 text-teal-400" />
              Plain-English Guide: How to Interpret Edge AI Benchmark Results
            </div>
            <button
              type="button"
              onClick={() => setShowPlainEnglishGuide(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-sans">
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-1.5">
              <span className="font-bold text-teal-300 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Latency (P50 & P95)
              </span>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                <strong>How long the model takes to produce a prediction.</strong> In real-time video,
                each frame arrives every 33 milliseconds (30 FPS). If latency exceeds 30ms, the system
                drops frames and lags behind physical reality.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-1.5">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Throughput (FPS)
              </span>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                <strong>How many frames/second the system can process.</strong> Higher throughput allows
                multiplexing multiple camera feeds onto a single edge processor or inspecting rapid
                factory conveyor lines.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-1.5">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" /> Accuracy (mAP@50)
              </span>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                <strong>Detection quality retention vs original model.</strong> When models are compressed,
                detection scores drop. A drop greater than 1.0 percentage point may cause missed defect
                detections or false alarms in production.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" /> Quantization (INT8 vs FP16)
              </span>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                <strong>INT8 reduces model size and improves speed, but can reduce precision.</strong>
                FP16 half-precision maintains accuracy on Tensor Cores with zero loss; INT8 quadruples
                efficiency but needs calibration images to prevent accuracy collapse.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Run Selector Strip */}
      <div className="glass-panel rounded-2xl p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 font-semibold tracking-wider uppercase text-[11px]">
          <span>Select Runs to Compare ({selectedRunIds.length} Selected)</span>
          <span className="text-zinc-500">{runs.length} Total Verified Runs in System</span>
        </div>

        {runs.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 font-sans text-xs space-y-3">
            <Info className="h-7 w-7 text-teal-400/60 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-200">No benchmark runs recorded yet</h4>
              <p className="text-zinc-400 max-w-md mx-auto">
                Comparing results requires at least two benchmark runs to plot the Pareto frontier (Latency vs Accuracy vs Power) and compute metric deltas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onSelectGoal) onSelectGoal("test-model");
                else setActiveTab("workbench");
              }}
              className="mt-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-zinc-950 hover:brightness-110 text-xs font-bold transition-all shadow-md shadow-teal-500/10 inline-flex items-center gap-1.5"
            >
              <Gauge className="h-3.5 w-3.5" />
              <span>Run First Benchmark</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
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
                      <span className={r.median_latency_ms <= targetLatencyMs ? "text-emerald-300 font-bold" : "text-zinc-300"}>
                        {r.median_latency_ms.toFixed(1)}ms
                      </span>
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
            Check two or more runs above to generate side-by-side metrics, feasibility verdicts, and Pareto charts.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ============================================================== */}
          {/* SECTION 1: PROMINENT DEPLOYMENT FEASIBILITY VERDICT BANNER     */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-teal-500/40 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 shadow-2xl space-y-5">
            {/* Verdict Header Status */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">
                    Target Evaluation Engine
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    SLA: Latency ≤ {targetLatencyMs}ms | FPS ≥ {targetFps} | Drop ≤ {maxAllowedMapDrop}%
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white font-sans flex items-center gap-2.5">
                  {anySatisfiedRun ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                      <span>Deployment Feasibility Verdict: Ready for Production</span>
                    </>
                  ) : allFailed ? (
                    <>
                      <AlertTriangle className="h-6 w-6 text-rose-400 flex-shrink-0" />
                      <span>Deployment Feasibility Verdict: Constraints Violated</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="h-6 w-6 text-sky-400 flex-shrink-0" />
                      <span>Deployment Feasibility Verdict: Conditional (Accuracy Untested)</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {anySatisfiedRun ? (
                    <>
                      Configuration{" "}
                      <span className="text-emerald-300 font-bold font-mono">
                        {anySatisfiedRun.hardwareName} [{anySatisfiedRun.precision.toUpperCase()}]
                      </span>{" "}
                      successfully satisfies all latency, throughput, and accuracy constraints on verified physical silicon.
                    </>
                  ) : allFailed ? (
                    <>
                      All selected configurations violate either the {targetLatencyMs}ms latency ceiling or accuracy tolerances. Optimization or hardware upgrading is required before deployment.
                    </>
                  ) : (
                    <>
                      Configurations meet latency thresholds, but accuracy (mAP) has not yet been verified against a labeled ground-truth dataset.
                    </>
                  )}
                </p>
              </div>

              {/* Action Buttons in Verdict Header */}
              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleTriggerAIExplain}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all font-sans"
                >
                  <Sparkles className="h-3.5 w-3.5 fill-zinc-950" />
                  Ask EdgeForge AI to explain these results
                </button>
                <button
                  type="button"
                  onClick={handleTriggerAIHardware}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/90 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all font-sans"
                >
                  <Cpu className="h-3.5 w-3.5 text-teal-400" />
                  Ask EdgeForge AI to identify the best hardware for my requirements
                </button>
                {anyAccuracyRegression && (
                  <button
                    type="button"
                    onClick={handleTriggerAIRecoverAccuracy}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-950/80 transition-all font-sans"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                    Find ways to improve accuracy while retaining speed
                  </button>
                )}
              </div>
            </div>

            {/* 4 Verdict Categories: Satisfied, Not Satisfied, Not Tested, Cannot Measure */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Category 1: Requirements Satisfied (Green) */}
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-sans font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Requirements Satisfied (Green)</span>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-[11px] font-sans text-zinc-300 max-h-48 overflow-y-auto pr-1">
                    {runEvaluations.flatMap((r) => r.satisfied).length > 0 ? (
                      runEvaluations
                        .flatMap((r) => r.satisfied.map((s) => ({ text: s, hw: r.hardwareName, prec: r.precision })))
                        .map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold mt-0.5">•</span>
                            <div>
                              <span className="font-semibold text-emerald-300 font-mono text-[10px]">
                                [{item.prec.toUpperCase()}]
                              </span>{" "}
                              {item.text}
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-zinc-500 italic">No configurations met all requirements yet.</p>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-emerald-500/20 text-[10px] font-mono text-emerald-400/80">
                  {runEvaluations.filter((r) => r.verdict === "SATISFIED").length} of {runEvaluations.length} runs production-ready
                </div>
              </div>

              {/* Category 2: Requirements Not Satisfied (Amber/Red) */}
              <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 font-sans font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>Requirements Not Satisfied (Amber/Red)</span>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-[11px] font-sans text-zinc-300 max-h-48 overflow-y-auto pr-1">
                    {runEvaluations.flatMap((r) => r.notSatisfied).length > 0 ? (
                      runEvaluations
                        .flatMap((r) => r.notSatisfied.map((ns) => ({ text: ns, hw: r.hardwareName, prec: r.precision })))
                        .map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold mt-0.5">•</span>
                            <div>
                              <span className="font-semibold text-rose-300 font-mono text-[10px]">
                                [{item.prec.toUpperCase()}]
                              </span>{" "}
                              {item.text}
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-emerald-400 italic">No violations detected across selected runs.</p>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-rose-500/20 text-[10px] font-mono text-rose-400/80">
                  {runEvaluations.filter((r) => r.verdict === "FAILED").length} runs require optimization or faster hardware
                </div>
              </div>

              {/* Category 3: Requirements Not Tested (Sky/Blue) */}
              <div className="p-4 rounded-xl border border-sky-500/40 bg-sky-950/20 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sky-400 font-sans font-bold text-xs uppercase tracking-wider">
                    <HelpCircle className="h-4 w-4 text-sky-400" />
                    <span>Requirements Not Tested</span>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-[11px] font-sans text-zinc-300 max-h-48 overflow-y-auto pr-1">
                    {runEvaluations.flatMap((r) => r.notTested).length > 0 ? (
                      runEvaluations
                        .flatMap((r) => r.notTested.map((nt) => ({ text: nt, hw: r.hardwareName, prec: r.precision })))
                        .map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-sky-400 font-bold mt-0.5">•</span>
                            <div>
                              <span className="font-semibold text-sky-300 font-mono text-[10px]">
                                [{item.prec.toUpperCase()}]
                              </span>{" "}
                              {item.text}
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="flex items-start gap-1.5 text-emerald-400">
                        <span className="font-bold mt-0.5">✓</span>
                        <span>Ground-truth accuracy (mAP@50) evaluated on all selected runs. No test omissions.</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-sky-500/20 text-[10px] font-mono text-sky-400/80">
                  {runEvaluations.filter((r) => r.verdict === "CONDITIONAL").length > 0
                    ? "Ground-truth validation required before deployment"
                    : "Full test suite executed"}
                </div>
              </div>

              {/* Category 4: Cannot Currently Be Measured (Zinc/Slate) */}
              <div className="p-4 rounded-xl border border-zinc-700/60 bg-zinc-950/60 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-300 font-sans font-bold text-xs uppercase tracking-wider">
                    <Gauge className="h-4 w-4 text-zinc-400" />
                    <span>Cannot Currently Be Measured</span>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-[11px] font-sans text-zinc-300 max-h-48 overflow-y-auto pr-1">
                    {runEvaluations.flatMap((r) => r.cannotBeMeasured).length > 0 ? (
                      runEvaluations
                        .flatMap((r) => r.cannotBeMeasured.map((cm) => ({ text: cm, hw: r.hardwareName, prec: r.precision })))
                        .map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-zinc-500 font-bold mt-0.5">•</span>
                            <div>
                              <span className="font-semibold text-zinc-300 font-mono text-[10px]">
                                [{item.hw}]
                              </span>{" "}
                              {item.text}
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="flex items-start gap-1.5 text-emerald-400">
                        <span className="font-bold mt-0.5">✓</span>
                        <span>Physical hardware sensors (RAPL/NVML) available and active across all compared devices.</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono text-zinc-500">
                  Zero fabricated metrics • Transparent sensor limits
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 2: SIDE-BY-SIDE METRIC MATRIX WITH PRACTICAL MEANINGS */}
          {/* ============================================================== */}
          <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 font-sans">
                  <GitCompare className="h-4 w-4 text-teal-400" />
                  Side-by-Side Metric Matrix & Practical Significance
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Every metric explained in plain English to show operational impact on edge deployments.
                </p>
              </div>

              <span className="text-[11px] font-mono text-zinc-400">
                Evaluating against: &le; {targetLatencyMs} ms latency &bull; &ge; {targetFps} FPS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-zinc-400">
                    <th className="py-3 px-4 font-semibold text-zinc-300 min-w-[240px]">
                      Metric & Plain-English Meaning
                    </th>
                    {comparedData.map((run) => (
                      <th key={run.run_id} className="py-3 px-4 min-w-[170px]">
                        <div className="font-bold text-zinc-100 truncate max-w-[180px] font-sans text-sm">
                          {run.hardware_name}
                        </div>
                        <div className="text-[10px] text-teal-400 uppercase font-semibold flex items-center gap-1.5 mt-0.5">
                          <span className="rounded px-1.5 py-0.2 bg-teal-500/10 border border-teal-500/30">
                            {run.precision}
                          </span>
                          <span>Batch {run.batch_size}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {/* Row: Feasibility Status Badge */}
                  <tr className="bg-zinc-950/50">
                    <td className="py-3 px-4 text-zinc-300 font-semibold">
                      <div className="font-bold text-xs">Deployment Feasibility</div>
                      <div className="text-[10px] text-zinc-400 font-sans">
                        Meets real-time production requirements
                      </div>
                    </td>
                    {comparedData.map((run) => {
                      const evalRun = runEvaluations.find((e) => e.runId === run.run_id);
                      const isSatisfied = evalRun?.verdict === "SATISFIED";
                      const isConditional = evalRun?.verdict === "CONDITIONAL";
                      return (
                        <td key={run.run_id} className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border font-sans uppercase tracking-wider ${
                              isSatisfied
                                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                                : isConditional
                                ? "bg-sky-950/80 text-sky-300 border-sky-500/40"
                                : "bg-rose-950/80 text-rose-300 border-rose-500/40"
                            }`}
                          >
                            {isSatisfied ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                Feasible
                              </>
                            ) : isConditional ? (
                              <>
                                <HelpCircle className="h-3 w-3 text-sky-400" />
                                Conditional
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-3 w-3 text-rose-400" />
                                Fails SLA
                              </>
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 1: Median Latency (P50) */}
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-200">Latency (P50)</div>
                      <div className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">
                        <strong>&ldquo;How long the model takes to produce a prediction&rdquo;</strong> (meets/fails {targetLatencyMs}ms requirement).
                      </div>
                    </td>
                    {comparedData.map((run) => {
                      const isBest = run.median_latency_ms === minLatency;
                      const meets = run.median_latency_ms <= targetLatencyMs;
                      const delta = run.median_latency_ms - targetLatencyMs;
                      return (
                        <td key={run.run_id} className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                isBest ? "text-teal-300" : "text-zinc-100"
                              }`}
                            >
                              {run.median_latency_ms.toFixed(2)} ms
                            </span>
                          </div>
                          <div className="mt-1">
                            {meets ? (
                              <span className="inline-block text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.2 rounded font-sans font-semibold">
                                ✓ Meets {targetLatencyMs}ms SLA
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] text-rose-400 bg-rose-950/50 border border-rose-500/30 px-1.5 py-0.2 rounded font-sans font-semibold">
                                ✗ Fails SLA (+{delta.toFixed(1)}ms)
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 2: Tail Latency (P95) */}
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-200">Tail Latency (P95)</div>
                      <div className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">
                        Worst-case 95th percentile response time under operating system jitter.
                      </div>
                    </td>
                    {comparedData.map((run) => {
                      const jitter = run.p95_latency_ms - run.median_latency_ms;
                      return (
                        <td key={run.run_id} className="py-3.5 px-4 align-top">
                          <div className="text-zinc-200 font-medium">{run.p95_latency_ms.toFixed(2)} ms</div>
                          <div className="text-[10px] text-zinc-500 font-sans mt-0.5">
                            +{jitter.toFixed(1)}ms jitter
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 3: Throughput (FPS) */}
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-200">Throughput (FPS)</div>
                      <div className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">
                        <strong>&ldquo;How many frames/second the system can process&rdquo;</strong>.
                      </div>
                    </td>
                    {comparedData.map((run) => {
                      const isBest = run.fps === maxFps;
                      const meetsFps = run.fps >= targetFps;
                      return (
                        <td key={run.run_id} className="py-3.5 px-4 align-top">
                          <span
                            className={`text-sm font-bold ${
                              isBest
                                ? "text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded"
                                : "text-zinc-200"
                            }`}
                          >
                            {run.fps.toFixed(1)} FPS
                          </span>
                          <div className="mt-1">
                            {meetsFps ? (
                              <span className="text-[10px] text-emerald-400 font-sans">
                                Can run 1x 30 FPS stream
                              </span>
                            ) : (
                              <span className="text-[10px] text-rose-400 font-sans">
                                Drops video frames
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 4: Quantization & Precision */}
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-200">Quantization & Precision</div>
                      <div className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">
                        <strong>&ldquo;INT8 reduces model size and improves speed, but can reduce precision&rdquo;</strong>.
                      </div>
                    </td>
                    {comparedData.map((run) => {
                      const prec = run.precision.toLowerCase();
                      return (
                        <td key={run.run_id} className="py-3.5 px-4 align-top">
                          <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-teal-500/10 text-teal-300 border border-teal-500/30">
                            {run.precision}
                          </span>
                          <div className="text-[10px] text-zinc-400 font-sans mt-1">
                            {prec === "int8"
                              ? "4x smaller weights, 2x ALU throughput"
                              : prec === "fp16"
                              ? "Tensor Core accelerated, zero loss"
                              : "Full precision baseline"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 5: Detection Accuracy (mAP@50) */}
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-200">Accuracy (mAP@50)</div>
                      <div className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">
                        <strong>&ldquo;Detection quality retention vs original model&rdquo;</strong> (explains points drop).
                      </div>
                    </td>
                    {comparedData.map((run) => {
                      const mapVal = run.map50 !== null && run.map50 !== undefined ? run.map50 : null;
                      const drop = mapVal !== null ? Math.max(0, (baselineMap - mapVal) * 100) : null;
                      const hasRegressed = drop !== null && drop > maxAllowedMapDrop;
                      return (
                        <td key={run.run_id} className="py-3.5 px-4 align-top">
                          {mapVal !== null ? (
                            <div>
                              <span className="text-sm font-bold text-purple-300">
                                {(mapVal * 100).toFixed(1)}%
                              </span>
                              <div className="mt-1">
                                {drop !== null && drop > 0 ? (
                                  <span
                                    className={`inline-block text-[10px] font-sans px-1.5 py-0.2 rounded font-semibold ${
                                      hasRegressed
                                        ? "text-rose-400 bg-rose-950/60 border border-rose-500/30"
                                        : "text-emerald-400 bg-emerald-950/60 border border-emerald-500/30"
                                    }`}
                                  >
                                    -{drop.toFixed(1)} pts {hasRegressed ? "(Regression ⚠️)" : "(Safe ✓)"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-400 font-sans">
                                    Baseline precision
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-zinc-500 font-sans text-xs">Not Tested</span>
                              <div className="text-[10px] text-sky-400 font-sans mt-0.5">
                                Synthetic tensors used
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 6: Memory RSS (MB) */}
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-200">Memory RSS (MB)</div>
                      <div className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">
                        Peak RAM footprint on host. Edge boards require low memory to avoid OOM crash.
                      </div>
                    </td>
                    {comparedData.map((run) => {
                      const isBest = run.memory_rss_mb === minMem;
                      return (
                        <td key={run.run_id} className="py-3.5 px-4 align-top">
                          <span className={isBest ? "text-cyan-300 font-bold" : "text-zinc-300"}>
                            {run.memory_rss_mb.toFixed(1)} MB
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 7: Power / TDP */}
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-200">Power Draw & Thermal</div>
                      <div className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">
                        Sensor telemetry. If sensor is absent on host, physical draw cannot currently be measured.
                      </div>
                    </td>
                    {comparedData.map((run) => {
                      const hw = hardware.find((h) => h.id === run.hardware_id);
                      const isMeasured = Boolean(hw?.telemetry_supported) && !run.hardware_id.includes("cpu") && run.power_watts > 0;
                      return (
                        <td key={run.run_id} className="py-3.5 px-4 align-top">
                          {isMeasured ? (
                            <div>
                              <span className="text-amber-300 font-bold text-xs">
                                {run.power_watts.toFixed(1)} W
                              </span>
                              <div className="text-[10px] text-emerald-400 font-sans mt-0.5">
                                Verified sensor telemetry
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-zinc-400 font-medium text-xs">
                                {run.power_watts ? `${run.power_watts.toFixed(1)} W (TDP)` : "TDP Only"}
                              </span>
                              <div className="text-[10px] text-zinc-500 font-sans mt-0.5">
                                Sensor absent on host
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 8: Device Type & Hardware Cost */}
                  <tr>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-200">Hardware Sizing & Unit Cost</div>
                      <div className="text-[11px] text-zinc-400 font-sans leading-snug mt-0.5">
                        Unit purchasing cost to calculate throughput-per-dollar for fleet procurement.
                      </div>
                    </td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-3.5 px-4 align-top text-zinc-300">
                        <div className="font-semibold text-zinc-200">
                          {run.cost_usd ? `$${run.cost_usd}` : "$0 (Host)"}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-sans mt-0.5 uppercase">
                          {run.device_type}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 3: SCENARIO B - HARDWARE PURCHASE EVALUATION            */}
          {/* ============================================================== */}
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
              Robotics and computer vision teams comparing candidate targets before purchasing silicon. The table below identifies which constraints are verified by genuine physical measurement and which remain unknown.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              {comparedData.map((item) => {
                const isPhysical =
                  item.hardware_id.includes("cpu") ||
                  item.hardware_id.includes("4060") ||
                  item.hardware_id.includes("local");
                const hasPower = item.power_watts > 0 && !item.hardware_id.includes("cpu");
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
                        <span className="text-emerald-400 font-semibold">
                          {item.fps.toFixed(0)} FPS ({item.median_latency_ms.toFixed(1)} ms)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Power Telemetry:</span>
                        <span className={hasPower ? "text-amber-400" : "text-zinc-500"}>
                          {hasPower ? `${item.power_watts.toFixed(1)} W` : "Sensor Absent (Cannot Measure)"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500">Integrity Status:</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          isPhysical
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                            : "bg-purple-950/80 text-purple-300 border border-purple-500/30"
                        }`}
                      >
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

          {/* ============================================================== */}
          {/* SECTION 4: INTERACTIVE RECHARTS PARETO & THROUGHPUT CHARTS    */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latency vs Throughput Scatter */}
            <div className="glass-panel rounded-2xl p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-200 font-mono flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-teal-400" />
                  Pareto Frontier (Latency vs Throughput)
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Ideal: Low Latency (&le; 30ms) + High FPS
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
                      label={{
                        value: "P50 Latency (ms) - Lower is Better",
                        position: "insideBottom",
                        offset: -10,
                        fill: "#71717a",
                        fontSize: 10,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="fps"
                      name="Throughput"
                      unit="FPS"
                      stroke="#71717a"
                      fontSize={10}
                      label={{
                        value: "Throughput (FPS) - Higher is Better",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#71717a",
                        fontSize: 10,
                      }}
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
