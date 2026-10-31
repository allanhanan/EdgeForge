"use client";

import React from "react";
import {
  Cpu,
  Layers,
  Database,
  Sliders,
  FlaskConical,
  BarChart3,
  GitCompare,
  Bot,
  Package,
  FileText,
  Settings,
  Activity,
  Zap,
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

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  metaStatus?: { mode: string; configured: boolean; model: string };
  isOnline: boolean;
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
}) => {
  const tabs: TabItem[] = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "models", label: "Models", icon: Layers },
    { id: "datasets", label: "Datasets", icon: Database },
    { id: "hardware", label: "Hardware Lab", icon: Cpu },
    { id: "workbench", label: "Workbench", icon: Sliders },
    { id: "experiments", label: "Experiments", icon: FlaskConical },
    { id: "compare", label: "Compare", icon: GitCompare },
    { id: "agent", label: "Meta AI Engineer", icon: Bot, highlight: true },
    { id: "deployments", label: "Deployments", icon: Package },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 tracking-tight text-sm">
                EdgeForge
              </span>
              <span className="rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[10px] font-mono text-teal-400">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono hidden md:block">
              Vendor-Neutral Edge AI Benchmarking & Deployment
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          {/* Backend Status */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-1">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span className="text-zinc-300">
              {isOnline ? "Backend Live" : "Offline"}
            </span>
          </div>

          {/* Meta AI Provider Mode */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-1">
            <Bot className="h-3.5 w-3.5 text-teal-400" />
            <span className="text-zinc-300">
              {metaStatus?.mode === "META_API_ONLINE"
                ? "Meta Muse Spark (Online)"
                : "Meta AI (Offline Dev Mode)"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <nav className="flex space-x-1 overflow-x-auto px-4 sm:px-6 border-t border-zinc-800/60 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "border-teal-400 text-teal-300 bg-teal-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              } ${tab.highlight ? "text-teal-400 font-semibold" : ""}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.highlight && (
                <span className="ml-1 rounded-sm bg-teal-500/20 px-1 text-[9px] text-teal-300">
                  AI
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
