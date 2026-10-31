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
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.25)]">
            <Zap className="h-4 w-4 fill-teal-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm text-zinc-100 font-sans">
                EdgeForge
              </span>
              <span className="rounded-full bg-teal-500/10 border border-teal-500/25 px-2 py-0.2 text-[10px] font-mono font-medium text-teal-400">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono hidden md:block">
              Vendor-Neutral Edge AI Intelligence Engine
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          {/* Backend Status */}
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-2.5 sm:px-3 py-1 shadow-inner shrink-0">
            <span className="relative flex h-2 w-2">
              {isOnline && (
                <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-rose-500"
                }`}
              />
            </span>
            <span className="text-[11px] text-zinc-300 font-medium whitespace-nowrap">
              <span className="hidden sm:inline">{isOnline ? "Backend Live" : "Offline"}</span>
              <span className="sm:hidden">{isOnline ? "Live" : "Down"}</span>
            </span>
          </div>

          {/* Meta AI Provider Mode */}
          <div className="flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-purple-950/40 px-2.5 sm:px-3 py-1 shadow-inner shrink-0">
            <Bot className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px] text-purple-200 font-medium whitespace-nowrap">
              {metaStatus?.mode === "META_API_ONLINE" ? (
                <>
                  <span className="hidden sm:inline">Meta Muse Spark (Online)</span>
                  <span className="sm:hidden">Meta Online</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Meta AI (Offline Dev Mode)</span>
                  <span className="sm:hidden">Meta AI</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <nav className="flex items-center gap-1 overflow-x-auto px-4 sm:px-6 py-2 border-t border-zinc-800/50 no-scrollbar bg-zinc-950/40" aria-label="Main Navigation">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/40 border border-zinc-800/60 min-w-max shrink-0" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                data-testid={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? "bg-zinc-800/95 text-teal-300 font-semibold shadow-sm border border-zinc-700/70"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                } ${tab.highlight && !isActive ? "text-teal-400/90 font-medium" : ""}`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-teal-400" : "text-zinc-400"}`} />
                <span>{tab.label}</span>
                {tab.highlight && (
                  <span className="ml-1 rounded px-1 py-0.2 text-[9px] font-bold font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
