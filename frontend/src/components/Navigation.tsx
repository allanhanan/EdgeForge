"use client";

import React from "react";
import {
  Cpu,
  Layers,
  Database,
  Sliders,
  FlaskConical,
  GitCompare,
  Bot,
  Package,
  FileText,
  Settings,
  Activity,
  Zap,
  X,
} from "lucide-react";

export type TabType =
  | "dashboard"
  | "models"
  | "datasets"
  | "hardware"
  | "workbench"
  | "experiments"
  | "compare"
  | "agent"
  | "deployments"
  | "reports"
  | "settings";

export type WorkflowGoal =
  | "find-hardware"
  | "test-model"
  | "optimize-model"
  | "troubleshoot-deployment"
  | "prepare-deployment"
  | "compare-results"
  | null;

export interface WorkflowGoalItem {
  id: NonNullable<WorkflowGoal>;
  title: string;
  tagline: string;
  description: string;
  targetTab: TabType;
  badge: string;
  category: string;
  iconName: "Cpu" | "Gauge" | "Sparkles" | "Wrench" | "Package" | "GitCompare";
}

export const WORKFLOW_GOALS: WorkflowGoalItem[] = [
  {
    id: "find-hardware",
    title: "Hardware Sizing",
    tagline: "Evaluate edge silicon candidates against latency and budget constraints.",
    description: "Compare Raspberry Pi 5 + Hailo-8, NVIDIA Jetson, and Intel NPU/CPU against latency and budget targets.",
    targetTab: "hardware",
    badge: "Hardware",
    category: "Hardware",
    iconName: "Cpu",
  },
  {
    id: "test-model",
    title: "Model Benchmarking",
    tagline: "Profile latency, throughput, memory, and power on physical silicon.",
    description: "Measure real-world latency (P50/P95), throughput (FPS), memory footprint, and power draw across available hardware.",
    targetTab: "workbench",
    badge: "Profiling",
    category: "Benchmarking",
    iconName: "Gauge",
  },
  {
    id: "optimize-model",
    title: "Model Optimization",
    tagline: "Automate precision quantization and compression.",
    description: "INT8/FP16 quantization, TensorRT optimization, and accuracy-recovery search guided by Meta AI.",
    targetTab: "agent",
    badge: "Optimization",
    category: "Optimization",
    iconName: "Sparkles",
  },
  {
    id: "troubleshoot-deployment",
    title: "Deployment Diagnostics",
    tagline: "Debug unsupported operators, runtime crashes, and memory constraints.",
    description: "Diagnose unsupported ONNX operators, dynamic shape mismatches, out-of-memory errors, and quantization drift.",
    targetTab: "workbench",
    badge: "Diagnostics",
    category: "Troubleshooting",
    iconName: "Wrench",
  },
  {
    id: "prepare-deployment",
    title: "Deployment Packaging",
    tagline: "Export standalone runtime packages with verification scripts.",
    description: "Generate a standalone deployment bundle with verified Python/C++ inference code, config, and system dependencies.",
    targetTab: "deployments",
    badge: "Package",
    category: "Deployment",
    iconName: "Package",
  },
  {
    id: "compare-results",
    title: "Benchmark Comparison",
    tagline: "Compare multi-device runs on Pareto frontier and trade-off matrices.",
    description: "Analyze Pareto efficiency (Latency vs Accuracy vs Power) and side-by-side metric delta tables.",
    targetTab: "compare",
    badge: "Comparison",
    category: "Evaluation",
    iconName: "GitCompare",
  },
];

export interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  metaStatus?: { mode: string; configured: boolean; model: string };
  isOnline: boolean;
  activeGoal?: WorkflowGoal;
  setActiveGoal?: (goal: WorkflowGoal) => void;
  onSelectGoal?: (goal: WorkflowGoal) => void;
  onClearGoal?: () => void;
}

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  metaStatus,
  isOnline,
  activeGoal,
  onClearGoal,
}) => {
  const tabs: TabItem[] = [
    { id: "dashboard", label: "Overview", icon: Activity },
    { id: "models", label: "Models", icon: Layers },
    { id: "datasets", label: "Datasets", icon: Database },
    { id: "hardware", label: "Hardware Lab", icon: Cpu },
    { id: "workbench", label: "Benchmarks", icon: Sliders },
    { id: "experiments", label: "Experiments", icon: FlaskConical },
    { id: "compare", label: "Compare", icon: GitCompare },
    { id: "agent", label: "AI Engineer", icon: Bot, highlight: true },
    { id: "deployments", label: "Deployments", icon: Package },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const currentGoalConfig = activeGoal
    ? WORKFLOW_GOALS.find((g) => g.id === activeGoal)
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="flex h-13 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("dashboard")}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.2)] group-hover:scale-105 transition-transform">
              <Zap className="h-3.5 w-3.5 fill-teal-400/20" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm text-zinc-100 font-sans group-hover:text-teal-300 transition-colors">
                EdgeForge
              </span>
              <span className="rounded bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                v1.0
              </span>
            </div>
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          {/* Active Goal Pill (if active) */}
          {currentGoalConfig && (
            <div
              onClick={() => setActiveTab(currentGoalConfig.targetTab)}
              className="flex items-center gap-1.5 rounded-full border border-teal-500/40 bg-teal-950/60 pl-2.5 pr-1.5 py-0.5 text-teal-300 shrink-0 cursor-pointer hover:bg-teal-900/60 transition-colors"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-400" />
              </span>
              <span className="text-[11px] font-medium truncate max-w-[150px]">
                {currentGoalConfig.title}
              </span>
              {onClearGoal && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearGoal();
                  }}
                  className="p-0.5 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Lab Connected */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 shadow-inner shrink-0"
            title="Physical lab connected: 2 local workers active (Intel CPU + RTX 4060)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </span>
            <span className="text-[11px] text-emerald-300 font-medium whitespace-nowrap">
              Lab connected
            </span>
          </div>

          {/* Backend Status */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-1 shadow-inner shrink-0"
            title="FastAPI profiling backend engine status"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-rose-500"
                }`}
              />
            </span>
            <span className="text-[11px] text-zinc-300 font-medium whitespace-nowrap">
              {isOnline ? "Live" : "Offline"}
            </span>
          </div>

          {/* Meta AI Provider */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-purple-950/40 px-2.5 py-1 shadow-inner shrink-0"
            title="Meta AI reasoning provider"
          >
            <Bot className="h-3 w-3 text-purple-400 shrink-0" />
            <span className="text-[11px] text-purple-200 font-medium whitespace-nowrap">
              {metaStatus?.mode === "META_API_ONLINE" ? "Meta Online" : "Meta AI"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <nav className="flex items-center gap-2 overflow-x-auto px-4 sm:px-6 py-1.5 border-t border-zinc-800/50 no-scrollbar bg-zinc-950/50" aria-label="Main Navigation">
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 min-w-max shrink-0" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-zinc-800/90 text-zinc-100 shadow-sm border border-zinc-700/60"
                    : tab.highlight
                    ? "text-purple-300 hover:text-purple-100 hover:bg-purple-950/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-teal-400" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
