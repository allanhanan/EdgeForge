"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  GitCompare,
  BarChart3,
  TrendingUp,
  Cpu,
  CheckSquare,
  Square,
  Bot,
  Info,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Gauge,
  Sliders,
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
import { TabType, WorkflowGoal } from "./Navigation";

interface CompareTabProps {
  runs: BenchmarkRun[];
  models: ModelRecord[];
  hardware: HardwareDevice[];
  preselectedRunId?: string | null;
  setActiveTab: (tab: TabType) => void;
  onAskAI?: (prompt: string) => void;
  activeGoal?: WorkflowGoal;
  onClearGoal?: () => void;
  onSelectGoal?: (goal: WorkflowGoal) => void;
}

interface ComparedRunItem {
  run_id: string;
  model_id: string;
  model_name: string;
  hardware_id: string;
  hardware_name: string;
  device_type: string;
  runtime: string;
  precision: string;
  batch_size: number;
  median_latency_ms: number;
  mean_latency_ms: number;
  p95_latency_ms: number;
  fps: number;
  memory_rss_mb: number;
  power_watts: number;
  map50: number | null;
  cost_usd: number;
  telemetry_supported: boolean;
}

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      precision: string;
      latency: number;
      accuracy: number;
      fps: number;
    };
  }>;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      fullName: string;
      precision: string;
      fps: number;
      latency: number;
    };
  }>;
}

const CustomScatterTooltip: React.FC<ScatterTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 text-xs font-mono shadow-md space-y-1 z-50 rounded-sm">
        <div className="font-bold text-[#f4f5f8] border-b border-[#2c3235] pb-1 flex items-center justify-between gap-2">
          <span className="truncate max-w-[180px]">{data.name}</span>
          <span className="px-1 py-0.2 text-[9px] bg-[#1f2328] text-[#5794f2] border border-[#2c3235]">
            {data.precision}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-[#8e8e9e]">
          <span>Latency (X):</span>
          <span className="text-[#f4f5f8] font-bold">{data.latency} ms</span>
        </div>
        <div className="flex justify-between gap-4 text-[#8e8e9e]">
          <span>Accuracy (Y):</span>
          <span className="text-[#b877d9] font-bold">{data.accuracy}% mAP@50</span>
        </div>
        <div className="flex justify-between gap-4 text-[#8e8e9e]">
          <span>Throughput:</span>
          <span className="text-[#73bf69] font-bold">{data.fps} FPS</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip: React.FC<BarTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 text-xs font-mono shadow-xl space-y-1 z-50 rounded-sm">
        <div className="font-bold text-[#f4f5f8] border-b border-[#2c3235] pb-1">
          {data.fullName} [{data.precision}]
        </div>
        <div className="flex justify-between gap-4 text-[#8e8e9e] pt-0.5">
          <span>Throughput:</span>
          <span className="text-[#73bf69] font-bold">{data.fps} FPS</span>
        </div>
        <div className="flex justify-between gap-4 text-[#8e8e9e]">
          <span>Latency:</span>
          <span className="text-[#ccccdc] font-bold">{data.latency} ms</span>
        </div>
      </div>
    );
  }
  return null;
};

export const CompareTab: React.FC<CompareTabProps> = ({
  runs,
  models,
  hardware,
  preselectedRunId,
  setActiveTab,
  onAskAI,
  activeGoal,
  onClearGoal,
}) => {
  // Target SLA Constraint Settings
  const [targetLatencyMs, setTargetLatencyMs] = useState<number>(30.0);
  const [targetFps, setTargetFps] = useState<number>(30.0);
  const [maxAllowedMapDrop, setMaxAllowedMapDrop] = useState<number>(1.0);
  const [targetMaxPowerWatts, setTargetMaxPowerWatts] = useState<number>(15.0);
  const [showConstraintSettings, setShowConstraintSettings] = useState<boolean>(false);
  const [showPlainEnglishGuide, setShowPlainEnglishGuide] = useState<boolean>(false);
  const [comparisonView, setComparisonView] = useState<"table" | "matrix">("table");

  // User-selected run IDs or default selection
  const [userSelectedRunIds, setUserSelectedRunIds] = useState<string[] | null>(null);

  const selectedRunIds = useMemo(() => {
    if (userSelectedRunIds !== null) return userSelectedRunIds;
    if (preselectedRunId && runs.some((r) => r.id === preselectedRunId)) {
      const rest = runs.filter((r) => r.id !== preselectedRunId).slice(0, 2).map((r) => r.id);
      return [preselectedRunId, ...rest];
    }
    return runs.slice(0, 3).map((r) => r.id);
  }, [userSelectedRunIds, preselectedRunId, runs]);

  const [rawComparedData, setRawComparedData] = useState<ComparedRunItem[]>([]);

  // Fetch comparison from backend or local fallback
  useEffect(() => {
    if (selectedRunIds.length === 0) {
      return;
    }

    let isMounted = true;

    compareRuns(selectedRunIds)
      .then((res) => {
        if (isMounted && res.runs) {
          setRawComparedData(res.runs as ComparedRunItem[]);
        }
      })
      .catch((err) => {
        console.error("Comparison fetch failed, using fallback:", err);
        const fallback: ComparedRunItem[] = runs
          .filter((r) => selectedRunIds.includes(r.id))
          .map((r) => {
            const hw = hardware.find((h) => h.id === r.hardware_id);
            const model = models.find((m) => m.id === r.model_id);
            return {
              run_id: r.id,
              model_id: r.model_id,
              model_name: model?.name || "YOLOv8n",
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
              map50: r.map50 ?? null,
              cost_usd: hw?.cost_usd || 0,
              telemetry_supported: hw?.telemetry_supported ?? false,
            };
          });
        if (isMounted) setRawComparedData(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRunIds, runs, hardware, models]);

  const comparedData: ComparedRunItem[] = useMemo(() => {
    if (selectedRunIds.length === 0) return [];
    if (rawComparedData.length > 0) return rawComparedData;
    return runs
      .filter((r) => selectedRunIds.includes(r.id))
      .map((r) => {
        const hw = hardware.find((h) => h.id === r.hardware_id);
        const model = models.find((m) => m.id === r.model_id);
        return {
          run_id: r.id,
          model_id: r.model_id,
          model_name: model?.name || "YOLOv8n",
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
          map50: r.map50 ?? null,
          cost_usd: hw?.cost_usd || 0,
          telemetry_supported: hw?.telemetry_supported ?? false,
        };
      });
  }, [selectedRunIds, rawComparedData, runs, hardware, models]);

  const toggleRun = (runId: string) => {
    setUserSelectedRunIds(
      selectedRunIds.includes(runId)
        ? selectedRunIds.filter((id) => id !== runId)
        : [...selectedRunIds, runId]
    );
  };

  const selectAll = () => {
    setUserSelectedRunIds(runs.slice(0, 6).map((r) => r.id));
  };

  const clearAll = () => {
    setUserSelectedRunIds([]);
  };

  // Find baseline mAP across compared runs (e.g. from FP32 or maximum measured)
  const fp32Run = comparedData.find(
    (d) => d.precision?.toLowerCase() === "fp32" && d.map50 !== null && d.map50 !== undefined
  );
  const baselineMap: number = (fp32Run && fp32Run.map50 !== null ? fp32Run.map50 : null)
    ?? (Math.max(0, ...comparedData.map((d) => (d.map50 !== null && d.map50 !== undefined ? d.map50 : 0))) || 0.82);

  // Find optimal metrics for highlights
  const minLatency = comparedData.length > 0 ? Math.min(...comparedData.map((d) => d.median_latency_ms)) : 0;
  const maxFps = comparedData.length > 0 ? Math.max(...comparedData.map((d) => d.fps)) : 0;
  const minMem = comparedData.length > 0 ? Math.min(...comparedData.map((d) => d.memory_rss_mb)) : 0;

  // Evaluate Deployment Feasibility for each run
  const runEvaluations = comparedData.map((item) => {
    const hw = hardware.find((h) => h.id === item.hardware_id);
    const latencyMet = item.median_latency_ms <= targetLatencyMs;
    const fpsMet = item.fps >= targetFps;

    const hasAccuracy = item.map50 !== null && item.map50 !== undefined && item.map50 > 0;
    const itemMap = item.map50 ?? 0;
    const accuracyDropPts = hasAccuracy ? Math.max(0, (baselineMap - itemMap) * 100) : null;
    const accuracyMet = hasAccuracy && accuracyDropPts !== null ? accuracyDropPts <= maxAllowedMapDrop : null;

    // Power sensor availability: true sensor if telemetry supported and not pure cpu
    const isPowerSensorPresent =
      Boolean(hw?.telemetry_supported) &&
      !item.hardware_id.includes("cpu") &&
      item.power_watts > 0;

    const powerMet = isPowerSensorPresent ? item.power_watts <= targetMaxPowerWatts : null;

    // Categorizations
    const satisfied: string[] = [];
    const notSatisfied: string[] = [];
    const notTested: string[] = [];
    const cannotBeMeasured: string[] = [];

    if (latencyMet) {
      satisfied.push(
        `Latency ${item.median_latency_ms.toFixed(1)} ms satisfies the <= ${targetLatencyMs} ms requirement.`
      );
    } else {
      notSatisfied.push(
        `Latency ${item.median_latency_ms.toFixed(1)} ms fails SLA by +${(item.median_latency_ms - targetLatencyMs).toFixed(1)} ms.`
      );
    }

    if (fpsMet) {
      satisfied.push(
        `Throughput ${item.fps.toFixed(0)} FPS satisfies the >= ${targetFps} FPS requirement.`
      );
    } else {
      notSatisfied.push(
        `Throughput ${item.fps.toFixed(0)} FPS is below the ${targetFps} FPS target.`
      );
    }

    if (hasAccuracy && accuracyDropPts !== null) {
      if (accuracyMet) {
        satisfied.push(
          `Accuracy ${(itemMap * 100).toFixed(1)}% mAP retained (only -${accuracyDropPts.toFixed(1)} pt drop <= ${maxAllowedMapDrop} pt limit).`
        );
      } else {
        notSatisfied.push(
          `Accuracy ${(itemMap * 100).toFixed(1)}% mAP suffered -${accuracyDropPts.toFixed(1)} pt regression (exceeds ${maxAllowedMapDrop} pt limit).`
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
        `Power draw cannot currently be measured: ${item.hardware_name} host lacks physical RAPL/NVML power sensors. Sensor is absent (no synthetic TDP wattage reported).`
      );
    }

    // Overall verdict
    let verdict: "SATISFIED" | "FAILED" | "CONDITIONAL" = "SATISFIED";
    if (!latencyMet || !fpsMet || accuracyMet === false || powerMet === false) {
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

  // Global verdict across compared runs
  const anySatisfiedRun = runEvaluations.find((r) => r.verdict === "SATISFIED");
  const allFailed = runEvaluations.length > 0 && runEvaluations.every((r) => r.verdict === "FAILED");
  const anyAccuracyRegression = runEvaluations.some((r) => r.accuracyMet === false);

  // Dispatch helpers for AI triggers
  const handleTriggerAIExplain = () => {
    const runSummaries = comparedData
      .map(
        (r) =>
          `- ${r.hardware_name} [${r.precision.toUpperCase()}]: ${r.median_latency_ms.toFixed(1)} ms latency, ${r.fps.toFixed(0)} FPS, mAP: ${r.map50 ? (r.map50 * 100).toFixed(1) + "%" : "Synthetic/Untested"}`
      )
      .join("\n");
    const query = `Explain these benchmark comparison results in plain English:
${runSummaries}

Deployment SLA Constraints:
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
    const truncated = clean.length > 16 ? `${clean.slice(0, 14)}...` : clean;
    return `${truncated} [${(precision || "fp32").toUpperCase()}]`;
  };

  // Accuracy-evaluated runs vs speed-only/synthetic runs
  const accuracyEvaluatedRuns = comparedData.filter(
    (item) => item.map50 !== null && item.map50 !== undefined && item.map50 > 0
  );
  const syntheticRunsCount = comparedData.length - accuracyEvaluatedRuns.length;

  // Compute dynamic domain for Pareto Y-axis to prevent clipping
  const minMeasuredAccuracy =
    accuracyEvaluatedRuns.length > 0
      ? Math.min(...accuracyEvaluatedRuns.map((r) => (r.map50 ?? 0) * 100))
      : 0;
  const paretoYMin = Math.max(0, Math.floor(minMeasuredAccuracy / 10) * 10 - 10);

  // Prepare Chart Data: 2D Pareto Frontier (Latency ms on X-axis vs Accuracy % on Y-axis)
  // Only ground-truth validated runs are plotted on the accuracy Pareto frontier
  const scatterData = accuracyEvaluatedRuns.map((item) => ({
    name: item.hardware_name,
    latency: Number(item.median_latency_ms.toFixed(2)),
    accuracy: Number(((item.map50 ?? 0) * 100).toFixed(1)),
    fps: Number(item.fps.toFixed(1)),
    precision: (item.precision || "fp32").toUpperCase(),
    power: item.power_watts,
  }));

  // Prepare Bar Chart Data: Throughput (FPS) comparison across hardware targets
  const barData = comparedData.map((item) => ({
    fullName: item.hardware_name,
    name: formatDeviceShort(item.hardware_name, item.precision),
    fps: Number(item.fps.toFixed(1)),
    latency: Number(item.median_latency_ms.toFixed(2)),
    precision: (item.precision || "fp32").toUpperCase(),
  }));

  // Grafana Palette for Charts
  const grafanaColors = ["#5794f2", "#73bf69", "#f59f00", "#b877d9", "#37b6bd", "#f2495c"];

  return (
    <div className="space-y-3 font-sans text-[#ccccdc]">
      {/* Header Bar */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-sm bg-[#1f2328] border border-[#2c3235] text-[#5794f2]">
            <GitCompare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#f4f5f8] uppercase tracking-wider font-mono">
                Cross-Hardware Benchmark Comparison & Feasibility
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm border border-[#2c3235] bg-[#111217] text-[#8e8e9e]">
                {selectedRunIds.length} Runs Selected
              </span>
            </div>
            <p className="text-[11px] text-[#8e8e9e] font-mono">
              Evaluate latency-accuracy trade-offs, Pareto efficiency frontiers, and verify real-time deployment constraints.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setShowPlainEnglishGuide((prev) => !prev)}
            className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] px-2.5 py-1 rounded-sm text-[11px] transition-colors flex items-center gap-1.5"
          >
            <Info className="h-3 w-3 text-[#5794f2]" />
            <span>{showPlainEnglishGuide ? "Hide Guide" : "Plain-English Guide"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowConstraintSettings((prev) => !prev)}
            className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] px-2.5 py-1 rounded-sm text-[11px] transition-colors flex items-center gap-1.5"
          >
            <Sliders className="h-3 w-3 text-[#f59f00]" />
            <span>SLA: {targetLatencyMs}ms / {targetFps} FPS</span>
          </button>
          <button
            type="button"
            onClick={selectAll}
            className="bg-[#1f2328] hover:bg-[#2c3235] text-[#ccccdc] border border-[#2c3235] px-2.5 py-1 rounded-sm text-[11px] transition-colors"
          >
            Select Top Runs
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="bg-[#111217] hover:bg-[#1f2328] text-[#8e8e9e] hover:text-[#ccccdc] border border-[#2c3235] px-2.5 py-1 rounded-sm text-[11px] transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Active Goal Banner */}
      {activeGoal === "compare-results" && (
        <div className="border border-[#5794f2]/40 bg-[#181b1f] rounded-sm p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono uppercase bg-[#5794f2]/20 text-[#5794f2] border border-[#5794f2]/40 px-1.5 py-0.5 rounded-sm font-bold">
              Active Goal
            </span>
            <div>
              <span className="text-xs text-[#f4f5f8] font-bold block">
                Compare results: Evaluate differences between previous benchmark experiments.
              </span>
              <span className="text-[11px] text-[#8e8e9e] font-sans">
                Compare latency, throughput, memory footprint, and detection accuracy (mAP@50). The Pareto frontier chart highlights optimal configurations.
              </span>
            </div>
          </div>
          {onClearGoal && (
            <button
              onClick={onClearGoal}
              className="text-xs text-[#8e8e9e] hover:text-[#ccccdc] font-mono underline self-end sm:self-center"
            >
              Exit Goal
            </button>
          )}
        </div>
      )}

      {/* Target SLA Constraints Drawer */}
      {showConstraintSettings && (
        <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-3 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
            <div className="flex items-center gap-2 text-[#f4f5f8] text-xs font-bold uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5 text-[#f59f00]" />
              <span>Deployment SLA Constraints Configurator</span>
            </div>
            <span className="text-[10px] text-[#8e8e9e]">
              Updates the Deployment Feasibility Verdict in real time
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div className="p-2 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1">
              <label className="text-[10px] text-[#8e8e9e] block font-semibold">
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
                  className="w-20 bg-[#181b1f] border border-[#2c3235] px-2 py-1 text-[#f4f5f8] font-bold rounded-sm focus:border-[#5794f2] focus:outline-none"
                />
                <span className="text-[11px] text-[#8e8e9e]">ms per frame</span>
              </div>
              <p className="text-[9px] text-[#8e8e9e]">30ms = 33 FPS real-time robotics SLA</p>
            </div>

            <div className="p-2 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1">
              <label className="text-[10px] text-[#8e8e9e] block font-semibold">
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
                  className="w-20 bg-[#181b1f] border border-[#2c3235] px-2 py-1 text-[#73bf69] font-bold rounded-sm focus:border-[#5794f2] focus:outline-none"
                />
                <span className="text-[11px] text-[#8e8e9e]">FPS</span>
              </div>
              <p className="text-[9px] text-[#8e8e9e]">Minimum framerate required</p>
            </div>

            <div className="p-2 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1">
              <label className="text-[10px] text-[#8e8e9e] block font-semibold">
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
                  className="w-20 bg-[#181b1f] border border-[#2c3235] px-2 py-1 text-[#b877d9] font-bold rounded-sm focus:border-[#5794f2] focus:outline-none"
                />
                <span className="text-[11px] text-[#8e8e9e]">pts (percentage points)</span>
              </div>
              <p className="text-[9px] text-[#8e8e9e]">Default &le; 1.0 pt accuracy drop</p>
            </div>

            <div className="p-2 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1">
              <label className="text-[10px] text-[#8e8e9e] block font-semibold">
                Max Power Budget:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={targetMaxPowerWatts}
                  onChange={(e) => setTargetMaxPowerWatts(Number(e.target.value) || 15)}
                  className="w-20 bg-[#181b1f] border border-[#2c3235] px-2 py-1 text-[#f59f00] font-bold rounded-sm focus:border-[#5794f2] focus:outline-none"
                />
                <span className="text-[11px] text-[#8e8e9e]">Watts</span>
              </div>
              <p className="text-[9px] text-[#8e8e9e]">Thermal or battery limit</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#2c3235]">
            <span className="text-[10px] text-[#8e8e9e] uppercase font-bold">Standard Presets:</span>
            <button
              type="button"
              onClick={() => {
                setTargetLatencyMs(30);
                setTargetFps(30);
                setMaxAllowedMapDrop(1.0);
                setTargetMaxPowerWatts(25);
              }}
              className="bg-[#111217] hover:bg-[#1f2328] text-[#ccccdc] border border-[#2c3235] px-2 py-0.5 rounded-sm text-[10px]"
            >
              Real-Time Camera (30ms / 30 FPS / &le; 1.0 pt drop)
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetLatencyMs(16.6);
                setTargetFps(60);
                setMaxAllowedMapDrop(1.5);
                setTargetMaxPowerWatts(50);
              }}
              className="bg-[#111217] hover:bg-[#1f2328] text-[#ccccdc] border border-[#2c3235] px-2 py-0.5 rounded-sm text-[10px]"
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
              className="bg-[#111217] hover:bg-[#1f2328] text-[#ccccdc] border border-[#2c3235] px-2 py-0.5 rounded-sm text-[10px]"
            >
              Battery Drone / Mobile Robot (&le; 10W / 50ms)
            </button>
          </div>
        </div>
      )}

      {/* Plain-English Metric Interpretation Guide */}
      {showPlainEnglishGuide && (
        <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#f4f5f8] uppercase tracking-wider font-mono">
              <Info className="h-3.5 w-3.5 text-[#5794f2]" />
              <span>Plain-English Guide: How to Interpret Edge AI Metrics</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPlainEnglishGuide(false)}
              className="text-[10px] text-[#8e8e9e] hover:text-[#ccccdc] font-mono"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-sans">
            <div className="p-2.5 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1">
              <span className="font-bold text-[#5794f2] text-xs font-mono block">Latency (P50 & P95)</span>
              <p className="text-[11px] text-[#ccccdc] leading-relaxed">
                How long the model takes to produce a prediction. For 30 FPS video, frames arrive every 33ms. Latency over 30ms causes frame drops and system lag.
              </p>
            </div>

            <div className="p-2.5 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1">
              <span className="font-bold text-[#73bf69] text-xs font-mono block">Throughput (FPS)</span>
              <p className="text-[11px] text-[#ccccdc] leading-relaxed">
                Frames processed per second. Higher throughput enables multi-camera streams on a single edge chip or inspecting rapid factory conveyor lines.
              </p>
            </div>

            <div className="p-2.5 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1">
              <span className="font-bold text-[#b877d9] text-xs font-mono block">Accuracy (mAP@50)</span>
              <p className="text-[11px] text-[#ccccdc] leading-relaxed">
                Detection quality retention vs the original FP32 model. A drop over 1.0 percentage point may cause missed defect detections or false alarms.
              </p>
            </div>

            <div className="p-2.5 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1">
              <span className="font-bold text-[#f59f00] text-xs font-mono block">Quantization (INT8 vs FP16)</span>
              <p className="text-[11px] text-[#ccccdc] leading-relaxed">
                INT8 shrinks weights by 4x and doubles compute speed, but can reduce precision. FP16 preserves precision on Tensor Cores with zero loss.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Run Selector Strip */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8e8e9e] uppercase font-semibold">
          <span>Select Runs to Compare ({selectedRunIds.length} Selected)</span>
          <span>{runs.length} Verified Runs Available</span>
        </div>

        {runs.length === 0 ? (
          <div className="p-6 text-center text-[#8e8e9e] font-mono text-xs space-y-2">
            <Info className="h-6 w-6 text-[#8e8e9e] mx-auto" />
            <p className="font-semibold text-[#ccccdc]">No benchmark runs recorded yet</p>
            <p className="text-[11px]">Execute benchmarks in the Workbench tab to populate comparison runs.</p>
            <button
              type="button"
              onClick={() => setActiveTab("workbench")}
              className="bg-[#f59f00] text-[#111217] font-bold px-3 py-1.5 rounded-sm text-xs transition-colors"
            >
              Run First Benchmark
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
            {runs.map((r) => {
              const isChecked = selectedRunIds.includes(r.id);
              const hw = hardware.find((h) => h.id === r.hardware_id);
              return (
                <div
                  key={r.id}
                  onClick={() => toggleRun(r.id)}
                  className={`flex items-start gap-2 border p-2 text-xs font-mono cursor-pointer rounded-sm transition-colors ${
                    isChecked
                      ? "border-[#5794f2] bg-[#1f2328] text-[#f4f5f8]"
                      : "border-[#2c3235] bg-[#111217] text-[#8e8e9e] hover:border-[#2c3235]/80"
                  }`}
                >
                  <button type="button" className="mt-0.5 text-[#5794f2]">
                    {isChecked ? (
                      <CheckSquare className="h-3.5 w-3.5" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-[#8e8e9e]" />
                    )}
                  </button>
                  <div className="truncate flex-1">
                    <div className="font-semibold truncate text-[#ccccdc]">
                      {hw?.name || r.hardware_id}
                    </div>
                    <div className="text-[10px] text-[#8e8e9e] flex items-center gap-1.5 mt-0.5">
                      <span className="uppercase text-[#5794f2] font-semibold">{r.precision}</span>
                      <span>•</span>
                      <span className={r.median_latency_ms <= targetLatencyMs ? "text-[#73bf69] font-bold" : "text-[#ccccdc]"}>
                        {r.median_latency_ms.toFixed(1)}ms
                      </span>
                      <span>•</span>
                      <span className="text-[#73bf69]">{r.fps.toFixed(0)} FPS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRunIds.length === 0 ? (
        <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-12 text-center text-[#8e8e9e] space-y-1.5 font-mono text-xs">
          <Info className="h-8 w-8 text-[#8e8e9e]/60 mx-auto" />
          <p className="text-sm font-semibold text-[#ccccdc]">No runs selected for comparison</p>
          <p>Check two or more runs above to generate side-by-side metric tables and Pareto charts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* SECTION 1: PROMINENT DEPLOYMENT FEASIBILITY VERDICT PANEL */}
          <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-3.5 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#2c3235] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#5794f2] font-bold">
                    Target Evaluation Engine
                  </span>
                  <span className="text-[#8e8e9e]">•</span>
                  <span className="text-[10px] font-mono text-[#8e8e9e]">
                    SLA: Latency &le; {targetLatencyMs}ms | FPS &ge; {targetFps} | Drop &le; {maxAllowedMapDrop} pts
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#f4f5f8] font-mono flex items-center gap-2">
                  {anySatisfiedRun ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-[#73bf69]" />
                      <span>Deployment Feasibility Verdict: Ready for Production</span>
                    </>
                  ) : allFailed ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-[#f2495c]" />
                      <span>Deployment Feasibility Verdict: Constraints Violated</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="h-4 w-4 text-[#5794f2]" />
                      <span>Deployment Feasibility Verdict: Conditional (Accuracy Untested)</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-[#ccccdc] font-sans">
                  {anySatisfiedRun ? (
                    <>
                      Configuration{" "}
                      <span className="text-[#73bf69] font-bold font-mono">
                        {anySatisfiedRun.hardwareName} [{anySatisfiedRun.precision.toUpperCase()}]
                      </span>{" "}
                      satisfies all latency, throughput, and accuracy constraints on verified physical silicon.
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
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={handleTriggerAIExplain}
                  className="bg-[#1f2328] hover:bg-[#2c3235] text-[#f59f00] border border-[#f59f00]/40 px-2.5 py-1 rounded-sm text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <Bot className="h-3 w-3" />
                  <span>Explain with AI</span>
                </button>
                <button
                  type="button"
                  onClick={handleTriggerAIHardware}
                  className="bg-[#1f2328] hover:bg-[#2c3235] text-[#5794f2] border border-[#5794f2]/40 px-2.5 py-1 rounded-sm text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <Cpu className="h-3 w-3" />
                  <span>Identify Best Hardware</span>
                </button>
                {anyAccuracyRegression && (
                  <button
                    type="button"
                    onClick={handleTriggerAIRecoverAccuracy}
                    className="bg-[#1f2328] hover:bg-[#2c3235] text-[#b877d9] border border-[#b877d9]/40 px-2.5 py-1 rounded-sm text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <TrendingUp className="h-3 w-3" />
                    <span>Recover Accuracy</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4 Verdict Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-xs">
              {/* Category 1: Satisfied */}
              <div className="p-2.5 border border-[#73bf69]/30 bg-[#111217] rounded-sm space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#73bf69] text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Requirements Satisfied</span>
                </div>
                <div className="space-y-1 text-[11px] text-[#ccccdc] max-h-36 overflow-y-auto">
                  {runEvaluations.flatMap((r) => r.satisfied).length > 0 ? (
                    runEvaluations
                      .flatMap((r) => r.satisfied.map((s) => ({ text: s, prec: r.precision })))
                      .map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="text-[#73bf69]">•</span>
                          <span>
                            <strong className="text-[#73bf69]">[{item.prec.toUpperCase()}]</strong> {item.text}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-[#8e8e9e] italic text-[10px]">No configurations met all criteria yet.</p>
                  )}
                </div>
              </div>

              {/* Category 2: Not Satisfied */}
              <div className="p-2.5 border border-[#f2495c]/30 bg-[#111217] rounded-sm space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#f2495c] text-[10px] font-bold uppercase tracking-wider">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Requirements Not Satisfied</span>
                </div>
                <div className="space-y-1 text-[11px] text-[#ccccdc] max-h-36 overflow-y-auto">
                  {runEvaluations.flatMap((r) => r.notSatisfied).length > 0 ? (
                    runEvaluations
                      .flatMap((r) => r.notSatisfied.map((ns) => ({ text: ns, prec: r.precision })))
                      .map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="text-[#f2495c]">•</span>
                          <span>
                            <strong className="text-[#f2495c]">[{item.prec.toUpperCase()}]</strong> {item.text}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-[#73bf69] italic text-[10px]">No violations detected across selected runs.</p>
                  )}
                </div>
              </div>

              {/* Category 3: Not Tested */}
              <div className="p-2.5 border border-[#5794f2]/30 bg-[#111217] rounded-sm space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#5794f2] text-[10px] font-bold uppercase tracking-wider">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Requirements Not Tested</span>
                </div>
                <div className="space-y-1 text-[11px] text-[#ccccdc] max-h-36 overflow-y-auto">
                  {runEvaluations.flatMap((r) => r.notTested).length > 0 ? (
                    runEvaluations
                      .flatMap((r) => r.notTested.map((nt) => ({ text: nt, prec: r.precision })))
                      .map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="text-[#5794f2]">•</span>
                          <span>
                            <strong className="text-[#5794f2]">[{item.prec.toUpperCase()}]</strong> {item.text}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-[#73bf69] text-[10px]">✓ All runs evaluated with ground-truth accuracy.</p>
                  )}
                </div>
              </div>

              {/* Category 4: Cannot Be Measured */}
              <div className="p-2.5 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#8e8e9e] text-[10px] font-bold uppercase tracking-wider">
                  <Gauge className="h-3.5 w-3.5" />
                  <span>Cannot Be Measured</span>
                </div>
                <div className="space-y-1 text-[11px] text-[#ccccdc] max-h-36 overflow-y-auto">
                  {runEvaluations.flatMap((r) => r.cannotBeMeasured).length > 0 ? (
                    runEvaluations
                      .flatMap((r) => r.cannotBeMeasured.map((cm) => ({ text: cm, hw: r.hardwareName })))
                      .map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="text-[#8e8e9e]">•</span>
                          <span className="text-[#8e8e9e]">{item.text}</span>
                        </div>
                      ))
                  ) : (
                    <p className="text-[#73bf69] text-[10px]">✓ Physical telemetry available across all targets.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: SIDE-BY-SIDE METRIC COMPARISON TABLE */}
          <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 border-b border-[#2c3235] bg-[#1f2328] gap-2">
              <div className="flex items-center gap-2">
                <GitCompare className="h-3.5 w-3.5 text-[#5794f2]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#f4f5f8] font-mono">
                  Side-by-Side Metric Comparison Table
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#8e8e9e] hidden md:inline">
                  SLA: &le; {targetLatencyMs} ms &bull; &ge; {targetFps} FPS &bull; &le; {maxAllowedMapDrop} pt drop
                </span>
                <div className="inline-flex rounded-sm border border-[#2c3235] bg-[#111217] p-0.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setComparisonView("table")}
                    className={`px-2 py-0.5 rounded-sm text-[10px] transition-colors ${
                      comparisonView === "table"
                        ? "bg-[#1f2328] text-[#5794f2] font-semibold border border-[#2c3235]"
                        : "text-[#8e8e9e] hover:text-[#ccccdc]"
                    }`}
                  >
                    Table View (Runs as Rows)
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonView("matrix")}
                    className={`px-2 py-0.5 rounded-sm text-[10px] transition-colors ${
                      comparisonView === "matrix"
                        ? "bg-[#1f2328] text-[#5794f2] font-semibold border border-[#2c3235]"
                        : "text-[#8e8e9e] hover:text-[#ccccdc]"
                    }`}
                  >
                    Matrix View (Runs as Cols)
                  </button>
                </div>
              </div>
            </div>

            {comparisonView === "table" ? (
              /* High-Density Grafana Table View (Model, Hardware, Runtime, Precision, P50 Latency ms, FPS, Peak Memory MB, Power W, mAP@50 %, Cost $, Feasibility vs SLA) */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#2c3235] bg-[#1f2328] text-[#8e8e9e] font-sans font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-sans">Model</th>
                      <th className="py-2.5 px-3 font-sans">Target Hardware</th>
                      <th className="py-2.5 px-3 font-sans">Runtime</th>
                      <th className="py-2.5 px-3 font-sans">Precision</th>
                      <th className="py-2.5 px-3 font-sans">P50 Latency</th>
                      <th className="py-2.5 px-3 font-sans">FPS</th>
                      <th className="py-2.5 px-3 font-sans">Peak Memory</th>
                      <th className="py-2.5 px-3 font-sans">Power Draw</th>
                      <th className="py-2.5 px-3 font-sans">mAP@50 (%)</th>
                      <th className="py-2.5 px-3 font-sans">Cost ($)</th>
                      <th className="py-2.5 px-3 text-right font-sans">Feasibility vs SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2c3235]/60 bg-[#181b1f]">
                    {comparedData.map((run) => {
                      const evalRun = runEvaluations.find((e) => e.runId === run.run_id);
                      const isSatisfied = evalRun?.verdict === "SATISFIED";
                      const isConditional = evalRun?.verdict === "CONDITIONAL";
                      const isBestLatency = run.median_latency_ms === minLatency;
                      const meetsLatency = run.median_latency_ms <= targetLatencyMs;
                      const latencyDelta = run.median_latency_ms - targetLatencyMs;
                      const isBestFps = run.fps === maxFps;
                      const meetsFps = run.fps >= targetFps;
                      const isBestMem = run.memory_rss_mb === minMem;
                      const hw = hardware.find((h) => h.id === run.hardware_id);
                      const isPowerMeasured =
                        Boolean(hw?.telemetry_supported) &&
                        !run.hardware_id.includes("cpu") &&
                        run.power_watts > 0;
                      const mapVal = run.map50 !== null && run.map50 !== undefined ? run.map50 : null;
                      const mapDrop = mapVal !== null ? Math.max(0, (baselineMap - mapVal) * 100) : null;
                      const hasAccuracyRegression = mapDrop !== null && mapDrop > maxAllowedMapDrop;

                      return (
                        <tr key={run.run_id} className="hover:bg-[#1f2328]/70 transition-colors">
                          {/* Model */}
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[#f4f5f8] truncate max-w-[150px]">
                              {run.model_name || "YOLOv8n"}
                            </div>
                            <div className="text-[10px] text-[#8e8e9e]">Batch {run.batch_size}</div>
                          </td>

                          {/* Target Hardware */}
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-[#ccccdc] truncate max-w-[150px]">
                              {run.hardware_name}
                            </div>
                            <div className="text-[10px] text-[#8e8e9e] uppercase">{run.device_type}</div>
                          </td>

                          {/* Runtime */}
                          <td className="py-2.5 px-3 text-[#8e8e9e] text-[11px]">
                            {run.runtime}
                          </td>

                          {/* Precision */}
                          <td className="py-2.5 px-3">
                            <span className="uppercase text-[#5794f2] font-bold border border-[#2c3235] bg-[#111217] px-1.5 py-0.5 rounded-sm text-[10px]">
                              {run.precision}
                            </span>
                          </td>

                          {/* P50 Latency ms */}
                          <td className="py-2.5 px-3">
                            <div className={`font-bold ${isBestLatency ? "text-[#5794f2]" : "text-[#f4f5f8]"}`}>
                              {run.median_latency_ms.toFixed(2)} ms
                            </div>
                            <div className="text-[10px]">
                              {meetsLatency ? (
                                <span className="text-[#73bf69]">✓ &le; {targetLatencyMs}ms</span>
                              ) : (
                                <span className="text-[#f2495c]">✕ (+{latencyDelta.toFixed(1)}ms)</span>
                              )}
                            </div>
                          </td>

                          {/* FPS */}
                          <td className="py-2.5 px-3">
                            <div className={`font-bold ${isBestFps ? "text-[#73bf69]" : "text-[#ccccdc]"}`}>
                              {run.fps.toFixed(1)} FPS
                            </div>
                            <div className="text-[10px]">
                              {meetsFps ? (
                                <span className="text-[#73bf69]">✓ &ge; {targetFps}</span>
                              ) : (
                                <span className="text-[#f2495c]">✕ Under target</span>
                              )}
                            </div>
                          </td>

                          {/* Peak Memory MB */}
                          <td className="py-2.5 px-3">
                            <span className={isBestMem ? "text-[#5794f2] font-bold" : "text-[#ccccdc]"}>
                              {run.memory_rss_mb.toFixed(1)} MB
                            </span>
                          </td>

                          {/* Power W */}
                          <td className="py-2.5 px-3">
                            {isPowerMeasured ? (
                              <div>
                                <span className="text-[#f59f00] font-bold">{run.power_watts.toFixed(1)} W</span>
                                <div className="text-[9px] text-[#73bf69]">Live NVML</div>
                              </div>
                            ) : (
                              <div>
                                <span className="text-[#8e8e9e]">[Not measured]</span>
                                <div className="text-[9px] text-[#8e8e9e]">Sensor absent</div>
                              </div>
                            )}
                          </td>

                          {/* mAP@50 % */}
                          <td className="py-2.5 px-3">
                            {mapVal !== null ? (
                              <div>
                                <span className="font-bold text-[#b877d9]">{(mapVal * 100).toFixed(1)}%</span>
                                {mapDrop !== null && mapDrop > 0 && (
                                  <div className={`text-[10px] ${hasAccuracyRegression ? "text-[#f2495c]" : "text-[#73bf69]"}`}>
                                    -{mapDrop.toFixed(1)} pts
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#8e8e9e] text-[10px]">Synthetic (Untested)</span>
                            )}
                          </td>

                          {/* Cost $ */}
                          <td className="py-2.5 px-3 font-bold text-[#73bf69]">
                            {run.cost_usd ? `$${run.cost_usd}` : "$0 (Host)"}
                          </td>

                          {/* Feasibility vs SLA */}
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-bold border uppercase font-sans ${
                                isSatisfied
                                  ? "bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/40"
                                  : isConditional
                                  ? "bg-[#5794f2]/10 text-[#5794f2] border-[#5794f2]/40"
                                  : "bg-[#f2495c]/10 text-[#f2495c] border-[#f2495c]/40"
                              }`}
                            >
                              {isSatisfied ? "Satisfied" : isConditional ? "Not Tested" : "Not Satisfied"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Transposed Matrix View: Metrics as rows, runs as columns */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#2c3235] bg-[#1f2328] text-[#8e8e9e] font-sans">
                      <th className="py-2.5 px-3 font-sans font-semibold text-[#f4f5f8] min-w-[220px] text-[11px] uppercase tracking-wider">
                        Metric &amp; Operational Meaning
                      </th>
                      {comparedData.map((run) => (
                        <th key={run.run_id} className="py-2.5 px-3 min-w-[170px] border-l border-[#2c3235]/60 font-sans">
                          <div className="font-sans font-bold text-[#f4f5f8] truncate max-w-[170px] text-xs">
                            {run.hardware_name}
                          </div>
                          <div className="text-[10px] text-[#5794f2] uppercase font-semibold flex items-center gap-1 mt-0.5 font-sans">
                            <span className="border border-[#2c3235] bg-[#111217] px-1 py-0.2 rounded-sm font-mono">
                              {run.precision}
                            </span>
                            <span className="font-sans font-normal text-[#8e8e9e]">Batch {run.batch_size}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2c3235]/60 bg-[#181b1f]">
                    {/* Row: Overall Feasibility vs SLA */}
                    <tr className="bg-[#111217]">
                      <td className="py-2 px-3 font-sans">
                        <div className="font-sans font-semibold text-[#f4f5f8]">Feasibility vs SLA (Overall)</div>
                        <div className="font-sans text-[10px] text-[#8e8e9e]">Overall production feasibility</div>
                      </td>
                      {comparedData.map((run) => {
                        const evalRun = runEvaluations.find((e) => e.runId === run.run_id);
                        const isSatisfied = evalRun?.verdict === "SATISFIED";
                        const isConditional = evalRun?.verdict === "CONDITIONAL";
                        return (
                          <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60">
                            <span
                              className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-bold border uppercase font-sans ${
                                isSatisfied
                                  ? "bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/40"
                                  : isConditional
                                  ? "bg-[#5794f2]/10 text-[#5794f2] border-[#5794f2]/40"
                                  : "bg-[#f2495c]/10 text-[#f2495c] border-[#f2495c]/40"
                              }`}
                            >
                              {isSatisfied ? "Satisfied" : isConditional ? "Not Tested" : "Not Satisfied"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row: Latency SLA Category */}
                    <tr>
                      <td className="py-2 px-3 font-sans text-[#ccccdc]">
                        <div className="font-sans font-semibold">Latency SLA (&le; {targetLatencyMs} ms)</div>
                        <div className="font-sans text-[10px] text-[#8e8e9e]">Real-time deadline enforcement</div>
                      </td>
                      {comparedData.map((run) => {
                        const evalRun = runEvaluations.find((e) => e.runId === run.run_id);
                        const meets = evalRun?.latencyMet;
                        return (
                          <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60 font-sans">
                            <span
                              className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold border uppercase font-sans ${
                                meets
                                  ? "bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/30"
                                  : "bg-[#f2495c]/10 text-[#f2495c] border-[#f2495c]/30"
                              }`}
                            >
                              {meets ? "Satisfied" : "Not Satisfied"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row: Throughput SLA Category */}
                    <tr>
                      <td className="py-2 px-3 font-sans text-[#ccccdc]">
                        <div className="font-sans font-semibold">Throughput SLA (&ge; {targetFps} FPS)</div>
                        <div className="font-sans text-[10px] text-[#8e8e9e]">Frame rate requirement</div>
                      </td>
                      {comparedData.map((run) => {
                        const evalRun = runEvaluations.find((e) => e.runId === run.run_id);
                        const meets = evalRun?.fpsMet;
                        return (
                          <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60 font-sans">
                            <span
                              className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold border uppercase font-sans ${
                                meets
                                  ? "bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/30"
                                  : "bg-[#f2495c]/10 text-[#f2495c] border-[#f2495c]/30"
                              }`}
                            >
                              {meets ? "Satisfied" : "Not Satisfied"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row: Accuracy SLA Category */}
                    <tr>
                      <td className="py-2 px-3 font-sans text-[#ccccdc]">
                        <div className="font-sans font-semibold">Accuracy SLA (Drop &le; {maxAllowedMapDrop} pt)</div>
                        <div className="font-sans text-[10px] text-[#8e8e9e]">Ground-truth retention fidelity</div>
                      </td>
                      {comparedData.map((run) => {
                        const evalRun = runEvaluations.find((e) => e.runId === run.run_id);
                        const hasAcc = evalRun?.accuracyMet !== null && evalRun?.accuracyMet !== undefined;
                        const meets = evalRun?.accuracyMet === true;
                        return (
                          <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60 font-sans">
                            <span
                              className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold border uppercase font-sans ${
                                !hasAcc
                                  ? "bg-[#5794f2]/10 text-[#5794f2] border-[#5794f2]/30"
                                  : meets
                                  ? "bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/30"
                                  : "bg-[#f2495c]/10 text-[#f2495c] border-[#f2495c]/30"
                              }`}
                            >
                              {!hasAcc ? "Not Tested" : meets ? "Satisfied" : "Not Satisfied"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                  {/* Row: Model */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">Model Graph</div>
                      <div className="text-[10px] text-[#8e8e9e]">Architecture tested</div>
                    </td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60 text-[#ccccdc]">
                        <div>{run.model_name || "YOLOv8n"}</div>
                        <div className="text-[10px] text-[#8e8e9e]">ONNX Runtime</div>
                      </td>
                    ))}
                  </tr>

                  {/* Row: Target Hardware */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">Target Hardware</div>
                      <div className="text-[10px] text-[#8e8e9e]">Silicon Device Type</div>
                    </td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60 text-[#ccccdc]">
                        <div className="truncate max-w-[160px]">{run.hardware_name}</div>
                        <div className="text-[10px] text-[#8e8e9e] uppercase">{run.device_type}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Row: Runtime */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">Runtime Backend</div>
                      <div className="text-[10px] text-[#8e8e9e]">Inference Execution Provider</div>
                    </td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60 text-[#ccccdc]">
                        <div>{run.runtime}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Row: Precision */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">Precision</div>
                      <div className="text-[10px] text-[#8e8e9e]">Quantization level</div>
                    </td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60">
                        <span className="uppercase text-[#5794f2] font-bold border border-[#2c3235] bg-[#111217] px-1.5 py-0.2 rounded-sm text-[10px]">
                          {run.precision}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Row: P50 Latency */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">P50 Latency (ms)</div>
                      <div className="text-[10px] text-[#8e8e9e]">Median inference time per frame</div>
                    </td>
                    {comparedData.map((run) => {
                      const isBest = run.median_latency_ms === minLatency;
                      const meets = run.median_latency_ms <= targetLatencyMs;
                      const delta = run.median_latency_ms - targetLatencyMs;
                      return (
                        <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60">
                          <div className={`font-bold ${isBest ? "text-[#5794f2]" : "text-[#f4f5f8]"}`}>
                            {run.median_latency_ms.toFixed(2)} ms
                          </div>
                          <div className="mt-0.5">
                            {meets ? (
                              <span className="text-[10px] text-[#73bf69]">✓ Meets SLA</span>
                            ) : (
                              <span className="text-[10px] text-[#f2495c]">✕ Exceeds (+{delta.toFixed(1)}ms)</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: FPS Throughput */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">Throughput (FPS)</div>
                      <div className="text-[10px] text-[#8e8e9e]">Frames processed per second</div>
                    </td>
                    {comparedData.map((run) => {
                      const isBest = run.fps === maxFps;
                      const meets = run.fps >= targetFps;
                      return (
                        <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60">
                          <div className={`font-bold ${isBest ? "text-[#73bf69]" : "text-[#ccccdc]"}`}>
                            {run.fps.toFixed(1)} FPS
                          </div>
                          <div className="mt-0.5">
                            {meets ? (
                              <span className="text-[10px] text-[#73bf69]">✓ &ge; {targetFps} FPS</span>
                            ) : (
                              <span className="text-[10px] text-[#f2495c]">✕ Below target</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Peak Memory RSS */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">Peak Memory RSS (MB)</div>
                      <div className="text-[10px] text-[#8e8e9e]">Host RAM footprint</div>
                    </td>
                    {comparedData.map((run) => {
                      const isBest = run.memory_rss_mb === minMem;
                      return (
                        <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60">
                          <span className={isBest ? "text-[#5794f2] font-bold" : "text-[#ccccdc]"}>
                            {run.memory_rss_mb.toFixed(1)} MB
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Power Draw */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">Power Draw (W)</div>
                      <div className="text-[10px] text-[#8e8e9e]">Physical sensor reading</div>
                    </td>
                    {comparedData.map((run) => {
                      const hw = hardware.find((h) => h.id === run.hardware_id);
                      const isMeasured = Boolean(hw?.telemetry_supported) && !run.hardware_id.includes("cpu") && run.power_watts > 0;
                      return (
                        <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60">
                          {isMeasured ? (
                            <div>
                              <span className="text-[#f59f00] font-bold">{run.power_watts.toFixed(1)} W</span>
                              <div className="text-[10px] text-[#73bf69]">Live telemetry</div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[#8e8e9e]">[Not measured]</span>
                              <div className="text-[10px] text-[#8e8e9e]">Sensor absent</div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Accuracy mAP@50 */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">Accuracy: mAP@50 (%)</div>
                      <div className="text-[10px] text-[#8e8e9e]">Object detection quality retention</div>
                    </td>
                    {comparedData.map((run) => {
                      const mapVal = run.map50 !== null && run.map50 !== undefined ? run.map50 : null;
                      const drop = mapVal !== null ? Math.max(0, (baselineMap - mapVal) * 100) : null;
                      const hasRegressed = drop !== null && drop > maxAllowedMapDrop;
                      return (
                        <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60">
                          {mapVal !== null ? (
                            <div>
                              <span className="font-bold text-[#b877d9]">{(mapVal * 100).toFixed(1)}%</span>
                              <div className="mt-0.5">
                                {drop !== null && drop > 0 ? (
                                  <span className={`text-[10px] ${hasRegressed ? "text-[#f2495c]" : "text-[#73bf69]"}`}>
                                    -{drop.toFixed(1)} pts drop
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#73bf69]">Baseline precision</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#8e8e9e] text-[11px]">Synthetic (Untested)</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Hardware Unit Cost */}
                  <tr>
                    <td className="py-2 px-3 text-[#ccccdc]">
                      <div className="font-semibold">Silicon Cost ($)</div>
                      <div className="text-[10px] text-[#8e8e9e]">Unit procurement cost</div>
                    </td>
                    {comparedData.map((run) => (
                      <td key={run.run_id} className="py-2 px-3 border-l border-[#2c3235]/60 text-[#ccccdc]">
                        <div className="font-bold text-[#73bf69]">
                          {run.cost_usd ? `$${run.cost_usd}` : "$0 (Host)"}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

          {/* SECTION 3: SCENARIO B - PRE-PURCHASE EVALUATION */}
          <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2c3235] pb-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#5794f2] font-bold">
                  Scenario B: Pre-Purchase Evaluation
                </span>
                <h3 className="text-xs font-bold text-[#f4f5f8] font-mono mt-0.5">
                  Hardware Purchase Recommendation & Constraint Verification
                </h3>
              </div>
              <span className="border border-[#2c3235] bg-[#111217] px-2 py-0.5 text-[10px] font-mono text-[#8e8e9e] rounded-sm">
                Physical Silicon vs Lab Spec
              </span>
            </div>

            <p className="text-xs text-[#ccccdc] font-sans leading-relaxed">
              Robotics and computer vision teams comparing candidate targets before purchasing silicon. The table below identifies which constraints are verified by genuine physical measurement and which remain unknown.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-xs">
              {comparedData.map((item) => {
                const isPhysical =
                  item.hardware_id.includes("cpu") ||
                  item.hardware_id.includes("4060") ||
                  item.hardware_id.includes("local");
                const hasPower = item.power_watts > 0 && !item.hardware_id.includes("cpu");
                return (
                  <div key={item.run_id} className="p-2.5 border border-[#2c3235] bg-[#111217] rounded-sm space-y-1.5">
                    <div className="flex items-center justify-between border-b border-[#2c3235]/60 pb-1">
                      <span className="font-bold text-[#f4f5f8] truncate max-w-[160px]">{item.hardware_name}</span>
                      <span className="text-[10px] text-[#5794f2] uppercase font-bold">{item.precision}</span>
                    </div>

                    <div className="space-y-0.5 text-[11px] text-[#8e8e9e]">
                      <div className="flex justify-between">
                        <span>Unit Purchasing Cost:</span>
                        <span className="text-[#73bf69] font-bold">{item.cost_usd ? `$${item.cost_usd}` : "$0 (Host)"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Latency & Throughput:</span>
                        <span className="text-[#ccccdc]">
                          {item.median_latency_ms.toFixed(1)} ms • {item.fps.toFixed(0)} FPS
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Power Telemetry:</span>
                        <span className={hasPower ? "text-[#f59f00]" : "text-[#8e8e9e]"}>
                          {hasPower ? `${item.power_watts.toFixed(1)} W` : "[Not measured]"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-[#2c3235]/60 flex items-center justify-between text-[10px]">
                      <span className="text-[#8e8e9e]">Silicon State:</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-sm font-semibold ${
                          isPhysical
                            ? "bg-[#73bf69]/10 text-[#73bf69] border border-[#73bf69]/30"
                            : "bg-[#5794f2]/10 text-[#5794f2] border border-[#5794f2]/30"
                        }`}
                      >
                        {isPhysical ? "Verified on Physical Host" : "Hardware Lab Model"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 border border-[#5794f2]/30 bg-[#111217] text-xs font-sans text-[#ccccdc] space-y-1 rounded-sm">
              <div className="flex items-center gap-1.5 text-[#5794f2] font-semibold text-xs font-sans">
                <Bot className="h-3.5 w-3.5" />
                <span>Pre-Purchase Recommendation Analysis:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#ccccdc]">
                For a robotics deployment targeting under 30 ms latency and a $300 budget: The highest throughput per dollar is achieved on the edge accelerator configuration. Devices with unmeasured power are explicitly labeled rather than reporting speculative TDP.
              </p>
            </div>
          </div>

          {/* SECTION 4: ALIGNED RECHARTS SCATTER (PARETO) & BAR CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* 1. 2D Pareto Frontier (Latency ms on X-axis vs Accuracy % on Y-axis) */}
            <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-[#5794f2]" />
                  <span className="text-xs font-semibold text-[#f4f5f8] uppercase tracking-wider font-mono">
                    2D Pareto Frontier: Latency vs Accuracy
                  </span>
                </div>
                <span className="text-[10px] text-[#8e8e9e] font-mono">
                  Ideal: Lower Left/Top Left (Low Latency + High Accuracy)
                </span>
              </div>

              {accuracyEvaluatedRuns.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="h-60 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid stroke="#2c3235" strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="latency"
                          name="Latency"
                          unit="ms"
                          stroke="#8e8e9e"
                          fontSize={10}
                          label={{
                            value: "P50 Latency (ms) - Lower is Better",
                            position: "insideBottom",
                            offset: -10,
                            fill: "#8e8e9e",
                            fontSize: 10,
                          }}
                        />
                        <YAxis
                          type="number"
                          dataKey="accuracy"
                          name="Accuracy"
                          unit="%"
                          domain={[paretoYMin, 100]}
                          stroke="#8e8e9e"
                          fontSize={10}
                          label={{
                            value: "Accuracy mAP@50 (%) - Higher is Better",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#8e8e9e",
                            fontSize: 10,
                          }}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3", stroke: "#2c3235" }}
                          content={<CustomScatterTooltip />}
                        />
                        <Scatter name="Runs" data={scatterData} isAnimationActive={false}>
                          {scatterData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={grafanaColors[index % grafanaColors.length]} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  {syntheticRunsCount > 0 && (
                    <p className="text-[10px] text-[#8e8e9e] font-mono">
                      * Note: {syntheticRunsCount} speed-only run(s) with synthetic tensors excluded from Accuracy Pareto (no annotations). See Throughput chart.
                    </p>
                  )}
                </div>
              ) : (
                <div className="h-60 w-full pt-1 flex flex-col items-center justify-center text-center p-6 space-y-2 font-mono text-xs text-[#8e8e9e]">
                  <TrendingUp className="h-8 w-8 text-[#5794f2]/60" />
                  <p className="text-[#ccccdc] font-semibold">
                    No Ground-Truth Accuracy Measurements Available
                  </p>
                  <p className="text-[11px] max-w-sm text-[#8e8e9e] leading-relaxed">
                    Selected runs were executed with synthetic random tensors. Ground-truth dataset evaluation (COCO) is required to compute mAP@50 and plot accuracy trade-offs.
                  </p>
                  <span className="text-[10px] text-[#73bf69] border border-[#2c3235] bg-[#111217] px-2 py-0.5 rounded-sm">
                    Throughput comparison across all targets is displayed in adjacent panel &rarr;
                  </span>
                </div>
              )}
            </div>

            {/* 2. Throughput FPS Comparison Bar Chart */}
            <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-[#73bf69]" />
                  <span className="text-xs font-semibold text-[#f4f5f8] uppercase tracking-wider font-mono">
                    Throughput Comparison (FPS)
                  </span>
                </div>
                <span className="text-[10px] text-[#8e8e9e] font-mono">
                  Frames Processed per Second
                </span>
              </div>

              <div className="h-60 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid stroke="#2c3235" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#8e8e9e" fontSize={10} tickLine={false} />
                    <YAxis stroke="#8e8e9e" fontSize={10} unit=" FPS" />
                    <Tooltip
                      content={<CustomBarTooltip />}
                      cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                    />
                    <Bar dataKey="fps" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                      {barData.map((_, index) => (
                        <Cell key={`bar-${index}`} fill={grafanaColors[index % grafanaColors.length]} />
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
