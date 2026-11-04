"use client";

import React, { useState, useRef, useEffect } from "react";
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
  ChevronDown,
  RotateCw,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Check,
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
  iconName: "Cpu" | "Gauge" | "Sliders" | "Wrench" | "Package" | "GitCompare" | "Bot" | "Layers";
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
    description: "INT8/FP16 quantization, TensorRT optimization, and accuracy-recovery search with automated Pareto analysis.",
    targetTab: "agent",
    badge: "Optimization",
    category: "Optimization",
    iconName: "Sliders",
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

export interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "WORKSPACE",
    items: [
      { id: "dashboard", label: "Overview", icon: Activity },
      { id: "models", label: "Models", icon: Layers },
      { id: "datasets", label: "Datasets", icon: Database },
    ],
  },
  {
    title: "INFRASTRUCTURE",
    items: [
      { id: "hardware", label: "Hardware Lab", icon: Cpu },
    ],
  },
  {
    title: "ANALYSIS",
    items: [
      { id: "workbench", label: "Benchmarks", icon: Sliders },
      { id: "experiments", label: "Experiments", icon: FlaskConical },
      { id: "compare", label: "Compare", icon: GitCompare },
    ],
  },
  {
    title: "DELIVERY",
    items: [
      { id: "deployments", label: "Deployments", icon: Package },
      { id: "reports", label: "Reports", icon: FileText },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { id: "agent", label: "AI Engineer", icon: Bot },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export function getBreadcrumb(tab: TabType): { group: string; label: string } {
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((i) => i.id === tab);
    if (item) {
      return { group: section.title, label: item.label };
    }
  }
  return { group: "WORKSPACE", label: "Overview" };
}

/* =========================================================================
   1. Persistent Vertical Sidebar
   ========================================================================= */

export interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
}) => {
  return (
    <aside
      className={`h-screen sticky top-0 bg-[#181b1f] border-r border-[#2c3235] flex flex-col justify-between shrink-0 select-none z-40 transition-[width] duration-200 ease-in-out font-sans ${
        collapsed ? "w-14" : "w-[220px]"
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Top Brand Header */}
      <div>
        <div className="h-12 border-b border-[#2c3235] px-3.5 flex items-center justify-between">
          <button
            onClick={() => setActiveTab("dashboard")}
            className="flex items-center gap-2.5 text-left focus:outline-none w-full"
            title="EdgeForge v1.0"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#22252b] border border-[#2c3235] text-[#f59f00] shrink-0">
              <Zap className="h-4 w-4 fill-[#f59f00]/20 text-[#f59f00]" />
            </div>
            {!collapsed && (
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="font-semibold tracking-tight text-sm text-[#ccccdc] font-sans truncate">
                  EdgeForge
                </span>
                <span className="rounded-sm bg-[#22252b] border border-[#2c3235] px-1 py-0.5 text-[9px] font-mono text-[#8e8e9e]">
                  v1.0
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="py-2 overflow-y-auto no-scrollbar max-h-[calc(100vh-96px)]" role="tablist">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-2">
              {!collapsed ? (
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-sans font-semibold tracking-wider text-[#8e8e9e] uppercase">
                  {section.title}
                </div>
              ) : (
                <div className="my-1.5 mx-2 border-t border-[#2c3235]/60" />
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      id={`tab-${item.id}`}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center transition-colors text-left border-l-2 font-sans ${
                        collapsed ? "justify-center py-2 px-1" : "gap-2.5 px-3 py-1.5 text-xs font-medium"
                      } ${
                        isActive
                          ? "bg-[#22252b] text-[#ccccdc] border-[#f59f00]"
                          : "border-transparent text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#22252b]/50"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? "text-[#f59f00]" : "text-[#8e8e9e]"
                        }`}
                      />
                      {!collapsed && <span className="truncate text-xs font-sans text-[#ccccdc]">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Collapse Toggle Footer */}
      <div className="h-10 border-t border-[#2c3235] p-1.5 bg-[#181b1f] flex items-center justify-center">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full h-7 flex items-center rounded-sm text-xs font-sans text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#22252b] transition-colors ${
            collapsed ? "justify-center" : "gap-2 px-2"
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" />
          ) : (
            <>
              <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs font-sans">Collapse sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

/* =========================================================================
   2. Compact Top Bar
   ========================================================================= */

export interface TopBarProps {
  activeTab: TabType;
  setActiveTab?: (tab: TabType) => void;
  isOnline?: boolean;
  metaStatus?: { mode: string; configured: boolean; model: string };
  onRefresh?: () => void;
  activeGoal?: WorkflowGoal;
  onClearGoal?: () => void;
  onSelectGoal?: (goal: WorkflowGoal) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onRefresh,
  activeGoal,
  onClearGoal,
}) => {
  const breadcrumb = getBreadcrumb(activeTab);

  const [workspace, setWorkspace] = useState("Default Workspace (Production)");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const [timeRange, setTimeRange] = useState("Last 24 hours");
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);
  const timeRangeRef = useRef<HTMLDivElement>(null);

  const workspaces = [
    "Default Workspace (Production)",
    "Edge Silicon Lab (Staging)",
    "Automotive Cluster (Dev)",
  ];

  const timeRanges = ["Last 1 hour", "Last 6 hours", "Last 24 hours", "Last 7 days"];

  // Click outside listeners for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setWorkspaceOpen(false);
      }
      if (timeRangeRef.current && !timeRangeRef.current.contains(event.target as Node)) {
        setTimeRangeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentGoalConfig = activeGoal
    ? WORKFLOW_GOALS.find((g) => g.id === activeGoal)
    : null;

  return (
    <header className="h-12 bg-[#181b1f] border-b border-[#2c3235] sticky top-0 z-30 select-none font-sans">
      <div className="h-full px-4 sm:px-5 flex items-center justify-between gap-3">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-sans shrink-0">
          <span className="text-[#8e8e9e] font-medium hidden sm:inline">EdgeForge</span>
          <span className="text-[#8e8e9e]/50 hidden sm:inline">/</span>
          <span className="text-[#8e8e9e] uppercase tracking-wider text-[11px] font-semibold">
            {breadcrumb.group}
          </span>
          <span className="text-[#8e8e9e]/50">/</span>
          <span className="text-[#ccccdc] font-semibold">{breadcrumb.label}</span>
        </div>

        {/* Middle: Workspace selector and Guided Demo */}
        <div className="flex items-center gap-2.5">
          <div ref={workspaceRef} className="relative hidden md:block">
            <button
              onClick={() => setWorkspaceOpen((prev) => !prev)}
              className="flex items-center gap-2 h-7 px-2.5 rounded-sm bg-[#181b1f] hover:bg-[#22252b] border border-[#2c3235] text-xs text-[#ccccdc] font-sans font-medium transition-colors"
              title="Select Workspace"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#73bf69]" />
              <span className="truncate max-w-[200px]">{workspace}</span>
              <ChevronDown className="h-3 w-3 text-[#8e8e9e]" />
            </button>
            {workspaceOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-[#181b1f] border border-[#2c3235] rounded-sm shadow-xl z-50 py-1 font-sans text-xs">
                <div className="px-3 py-1.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-[#8e8e9e] border-b border-[#2c3235]">
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws}
                    onClick={() => {
                      setWorkspace(ws);
                      setWorkspaceOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#22252b] flex items-center justify-between text-xs font-sans transition-colors ${
                      ws === workspace ? "text-[#f59f00] font-medium bg-[#22252b]/50" : "text-[#ccccdc]"
                    }`}
                  >
                    <span className="truncate">{ws}</span>
                    {ws === workspace && <Check className="h-3 w-3 text-[#f59f00]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions and Status Indicators */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Goal Pill (if active) */}
          {currentGoalConfig && (
            <div className="flex items-center gap-1.5 h-7 px-2 rounded-sm bg-[#22252b] border border-[#f59f00]/40 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f59f00]" />
              <span className="text-[11px] font-sans text-[#f59f00] font-medium truncate max-w-[130px]">
                {currentGoalConfig.title}
              </span>
              {onClearGoal && (
                <button
                  onClick={onClearGoal}
                  className="text-[#8e8e9e] hover:text-[#ccccdc] ml-0.5"
                  title="Clear goal"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Time range selector button */}
          <div ref={timeRangeRef} className="relative hidden md:block">
            <button
              onClick={() => setTimeRangeOpen((prev) => !prev)}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-sm bg-[#181b1f] hover:bg-[#22252b] border border-[#2c3235] text-xs text-[#ccccdc] font-sans font-medium transition-colors"
              title="Time Range"
            >
              <Clock className="h-3 w-3 text-[#8e8e9e]" />
              <span>{timeRange}</span>
              <ChevronDown className="h-3 w-3 text-[#8e8e9e]" />
            </button>
            {timeRangeOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-[#181b1f] border border-[#2c3235] rounded-sm shadow-xl z-50 py-1 font-sans text-xs">
                {timeRanges.map((tr) => (
                  <button
                    key={tr}
                    onClick={() => {
                      setTimeRange(tr);
                      setTimeRangeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#22252b] text-xs font-sans transition-colors ${
                      tr === timeRange ? "text-[#f59f00] font-medium bg-[#22252b]/50" : "text-[#ccccdc]"
                    }`}
                  >
                    {tr}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            title="Refresh metrics"
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-sm bg-[#181b1f] hover:bg-[#22252b] border border-[#2c3235] text-xs text-[#ccccdc] hover:text-white font-sans font-medium transition-colors"
          >
            <RotateCw className="h-3 w-3 text-[#8e8e9e]" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};

/* =========================================================================
   3. Combined Navigation Wrapper (for backwards compatibility / single import)
   ========================================================================= */

export interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  metaStatus?: { mode: string; configured: boolean; model: string };
  isOnline: boolean;
  activeGoal?: WorkflowGoal;
  setActiveGoal?: (goal: WorkflowGoal) => void;
  onSelectGoal?: (goal: WorkflowGoal) => void;
  onClearGoal?: () => void;
  onRefresh?: () => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  metaStatus,
  isOnline,
  activeGoal,
  onClearGoal,
  onSelectGoal,
  onRefresh,
  collapsed: controlledCollapsed,
  setCollapsed: controlledSetCollapsed,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const handleToggle = controlledSetCollapsed || setInternalCollapsed;

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={isCollapsed}
        setCollapsed={handleToggle}
      />
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        metaStatus={metaStatus}
        activeGoal={activeGoal}
        onClearGoal={onClearGoal}
        onSelectGoal={onSelectGoal}
        onRefresh={onRefresh}
      />
    </>
  );
};
