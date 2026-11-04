"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sidebar,
  TopBar,
  TabType,
  WorkflowGoal,
  WORKFLOW_GOALS,
} from "@/components/Navigation";
import { DashboardTab } from "@/components/DashboardTab";
import { ModelsTab } from "@/components/ModelsTab";
import { DatasetsTab } from "@/components/DatasetsTab";
import { HardwareLabTab } from "@/components/HardwareLabTab";
import { WorkbenchTab } from "@/components/WorkbenchTab";
import { ExperimentsTab } from "@/components/ExperimentsTab";
import { CompareTab } from "@/components/CompareTab";
import { AIEngineerTab } from "@/components/AIEngineerTab";
import { DeploymentsTab } from "@/components/DeploymentsTab";
import { ReportsTab } from "@/components/ReportsTab";
import { SettingsTab } from "@/components/SettingsTab";

import {
  ModelRecord,
  HardwareDevice,
  DatasetRecord,
  Experiment,
  BenchmarkRun,
  MetaStatus,
  fetchHealth,
  fetchHardware,
  fetchModels,
  fetchDatasets,
  fetchExperiments,
  fetchBenchmarkRuns,
  fetchMetaStatus,
} from "@/lib/api";

import {
  ReplayProvider,
  useReplay,
  ReplayToolbar,
  ScenarioSelectorModal,
} from "@/components/replay";
import { Sparkles, Play, Layers, X } from "lucide-react";

function MainContent() {
  const {
    isReplayActive,
    isReplayMode,
    activeTab,
    setReplayActiveTab,
    currentStage,
    startScenario,
    openScenarioModal,
    closeScenarioModal,
    isModalOpen,
    isMinimized,
  } = useReplay();

  const [showReplayBanner, setShowReplayBanner] = useState<boolean>(true);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [activeGoal, setActiveGoal] = useState<WorkflowGoal>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [metaStatus, setMetaStatus] = useState<MetaStatus | undefined>(undefined);

  const [models, setModels] = useState<ModelRecord[]>([]);
  const [hardware, setHardware] = useState<HardwareDevice[]>([]);
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);

  // Navigation state passed to workbench & compare
  const [preselectedModelId, setPreselectedModelId] = useState<string | null>(null);
  const [preselectedDatasetId, setPreselectedDatasetId] = useState<string | null>(null);
  const [preselectedRunId, setPreselectedRunId] = useState<string | null>(null);
  const [agentInitialQuery, setAgentInitialQuery] = useState<string | null>(null);

  const handleSelectGoal = (goal: WorkflowGoal) => {
    setActiveGoal(goal);
    if (!goal) return;
    const target = WORKFLOW_GOALS.find((g) => g.id === goal);
    if (target) {
      setReplayActiveTab(target.targetTab);
    }
  };

  const handleClearGoal = () => {
    setActiveGoal(null);
  };

  const handleAskAI = (query: string) => {
    setAgentInitialQuery(`${query}__${Date.now()}`);
    setReplayActiveTab("agent");
  };

  const loadData = useCallback(async () => {
    try {
      const [hRes, hwRes, mRes, dRes, eRes, rRes, msRes] = await Promise.allSettled([
        fetchHealth(),
        fetchHardware(),
        fetchModels(),
        fetchDatasets(),
        fetchExperiments(),
        fetchBenchmarkRuns(),
        fetchMetaStatus(),
      ]);

      if (hRes.status === "fulfilled" && hRes.value?.status === "online") {
        setIsOnline(true);
      } else {
        setIsOnline(isReplayMode);
      }

      if (hwRes.status === "fulfilled") setHardware(hwRes.value);
      if (mRes.status === "fulfilled") setModels(mRes.value);
      if (dRes.status === "fulfilled") setDatasets(dRes.value);
      if (eRes.status === "fulfilled") setExperiments(eRes.value);
      if (rRes.status === "fulfilled") setRuns(rRes.value);
      if (msRes.status === "fulfilled") setMetaStatus(msRes.value);
    } catch {
      setIsOnline(isReplayMode);
    }
  }, [isReplayMode]);

  useEffect(() => {
    let mounted = true;
    const run = () => {
      if (mounted) {
        void loadData();
      }
    };
    run();
    const interval = setInterval(run, 6000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [loadData]);

  // Feed active replay data when in replay mode
  const effectiveModels = isReplayMode && currentStage ? (currentStage?.data?.models || currentStage?.snapshot?.models || models) : models;
  const effectiveHardware = isReplayMode && currentStage ? (currentStage?.data?.hardware || currentStage?.snapshot?.hardware || hardware) : hardware;
  const effectiveDatasets = isReplayMode && currentStage ? (currentStage?.data?.datasets || currentStage?.snapshot?.datasets || datasets) : datasets;
  const effectiveExperiments = isReplayMode && currentStage ? (currentStage?.data?.experiments || currentStage?.snapshot?.experiments || experiments) : experiments;
  const effectiveRuns = isReplayMode && currentStage ? (currentStage?.data?.runs || currentStage?.snapshot?.runs || runs) : runs;
  const effectiveMetaStatus = isReplayMode && currentStage ? (currentStage?.data?.metaStatus || currentStage?.snapshot?.metaStatus || metaStatus) : metaStatus;
  const effectiveModelId = isReplayMode && currentStage
    ? (currentStage?.selectedModelId ?? currentStage?.data?.selectedModelId ?? preselectedModelId)
    : preselectedModelId;
  const effectiveRunId = isReplayMode && currentStage
    ? (currentStage?.selectedRunId ?? currentStage?.data?.selectedRunId ?? preselectedRunId)
    : preselectedRunId;

  const handleSelectModelForBenchmark = (modelId: string) => {
    setPreselectedModelId(modelId);
    setReplayActiveTab("workbench");
  };

  const handleSelectDatasetForBenchmark = (datasetId: string) => {
    setPreselectedDatasetId(datasetId);
    setReplayActiveTab("workbench");
  };

  const handleSelectForCompare = (runId: string) => {
    setPreselectedRunId(runId);
    setReplayActiveTab("compare");
  };

  return (
    <div
      className={`min-h-screen bg-[#111217] text-[#ccccdc] flex font-sans ${
        isReplayActive && !isMinimized ? "pb-28" : "pb-14"
      }`}
    >
      {/* Persistent Vertical Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setReplayActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Compact Top Bar */}
        <TopBar
          activeTab={activeTab}
          setActiveTab={setReplayActiveTab}
          isOnline={isOnline}
          metaStatus={effectiveMetaStatus}
          onRefresh={loadData}
          activeGoal={activeGoal}
          onClearGoal={handleClearGoal}
          onSelectGoal={handleSelectGoal}
          isReplayActive={isReplayActive}
          onOpenReplay={openScenarioModal}
        />

        {/* Replay Mode Fast Entry Bar for Judges & Visitors */}
        {!isReplayActive && showReplayBanner && (
          <div className="bg-[#181b1f] border-b border-[#f59f00]/40 px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-sans select-none animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#22252b] border border-[#f59f00]/40 text-[#f59f00] shrink-0">
                <Sparkles className="h-4 w-4 fill-[#f59f00]/20 text-[#f59f00]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white tracking-wide">
                    EXPLORE EDGEFORGE IN REPLAY MODE
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded-sm bg-[#f59f00]/15 text-[#f59f00] border border-[#f59f00]/40 uppercase">
                    NO SETUP REQUIRED
                  </span>
                  <span className="text-[11px] text-[#8e8e9e] hidden lg:inline">
                    • Zero hardware or cloud credentials needed
                  </span>
                </div>
                <p className="text-[11px] text-[#8e8e9e] line-clamp-1 mt-0.5">
                  Experience full platform capabilities: YOLOv8 model inspection, Jetson & Hailo-8 physical benchmarking, INT8 entropy quantization, multi-device Pareto frontier analysis, and autonomous AI recommendations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                id="btn-launch-featured-demo"
                onClick={() => startScenario("featured-e2e")}
                className="h-7 px-3 rounded-sm bg-[#f59f00] hover:bg-[#e08e00] text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Play className="h-3 w-3 fill-black text-black" />
                <span>Launch Featured Demo (4m)</span>
              </button>
              <button
                id="btn-browse-scenarios"
                onClick={openScenarioModal}
                className="h-7 px-2.5 rounded-sm bg-[#22252b] hover:bg-[#2c3235] border border-[#2c3235] text-xs font-sans text-[#ccccdc] flex items-center gap-1 transition-colors"
              >
                <Layers className="h-3 w-3 text-[#5794f2]" />
                <span>Browse 7 Scenarios ▾</span>
              </button>
              <button
                onClick={() => setShowReplayBanner(false)}
                className="h-7 w-7 rounded-sm text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#22252b] flex items-center justify-center transition-colors"
                title="Dismiss banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Content area: full-bleed viewport layout */}
        <main className="flex-1 w-full p-4 sm:p-5">
          {activeTab === "dashboard" && (
            <DashboardTab
              models={effectiveModels}
              hardware={effectiveHardware}
              experiments={effectiveExperiments}
              runs={effectiveRuns}
              setActiveTab={setReplayActiveTab}
              onSelectTab={setReplayActiveTab}
              onSelectModel={setPreselectedModelId}
              onQuickBenchmark={() => setReplayActiveTab("workbench")}
              activeGoal={activeGoal}
              onSelectGoal={handleSelectGoal}
              onClearGoal={handleClearGoal}
              onRefreshData={loadData}
              onSelectForCompare={handleSelectForCompare}
            />
          )}

          {activeTab === "models" && (
            <ModelsTab
              models={effectiveModels}
              onRefresh={loadData}
              onSelectForBenchmark={handleSelectModelForBenchmark}
              initialModelId={effectiveModelId}
            />
          )}

          {activeTab === "datasets" && (
            <DatasetsTab
              datasets={effectiveDatasets}
              onRefresh={loadData}
              onSelectForBenchmark={handleSelectDatasetForBenchmark}
            />
          )}

          {activeTab === "hardware" && (
            <HardwareLabTab
              hardware={effectiveHardware}
              onRefresh={loadData}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
              setActiveTab={(tab: string) => setReplayActiveTab(tab as TabType)}
              onSelectGoal={(goal: string) => handleSelectGoal(goal as WorkflowGoal)}
            />
          )}

          {activeTab === "workbench" && (
            <WorkbenchTab
              models={effectiveModels}
              hardware={effectiveHardware}
              datasets={effectiveDatasets}
              initialModelId={effectiveModelId}
              initialDatasetId={preselectedDatasetId}
              onBenchmarkComplete={loadData}
              setActiveTab={setReplayActiveTab}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
              onAskAI={handleAskAI}
              onRefresh={loadData}
            />
          )}

          {activeTab === "experiments" && (
            <ExperimentsTab
              experiments={effectiveExperiments}
              runs={effectiveRuns}
              models={effectiveModels}
              hardware={effectiveHardware}
              onRefresh={loadData}
              setActiveTab={setReplayActiveTab}
              onSelectForCompare={handleSelectForCompare}
            />
          )}

          {activeTab === "compare" && (
            <CompareTab
              runs={effectiveRuns}
              models={effectiveModels}
              hardware={effectiveHardware}
              preselectedRunId={effectiveRunId}
              setActiveTab={setReplayActiveTab}
              onAskAI={handleAskAI}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
              onSelectGoal={handleSelectGoal}
            />
          )}

          {activeTab === "agent" && (
            <AIEngineerTab
              models={effectiveModels}
              hardware={effectiveHardware}
              datasets={effectiveDatasets}
              runs={effectiveRuns}
              metaStatus={effectiveMetaStatus}
              onRefreshRuns={loadData}
              setActiveTab={setReplayActiveTab}
              initialQuery={agentInitialQuery}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
            />
          )}

          {activeTab === "deployments" && (
            <DeploymentsTab
              models={effectiveModels}
              runs={effectiveRuns}
              hardware={effectiveHardware}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
              onRefresh={loadData}
              setActiveTab={setReplayActiveTab}
              onSelectGoal={handleSelectGoal}
            />
          )}

          {activeTab === "reports" && (
            <ReportsTab
              models={effectiveModels}
              setActiveTab={setReplayActiveTab}
              onRefresh={loadData}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              metaStatus={effectiveMetaStatus}
              models={effectiveModels}
              datasets={effectiveDatasets}
              hardware={effectiveHardware}
              experiments={effectiveExperiments}
              runs={effectiveRuns}
              onRefreshAll={loadData}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#2c3235] bg-[#181b1f] py-3 px-5 text-xs text-[#8e8e9e] font-mono">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#ccccdc]">
              <span className="font-semibold">EdgeForge v1.0</span>
              <span className="text-[#8e8e9e]">/</span>
              <span className="text-[#8e8e9e]">Vendor-Neutral Edge AI Intelligence Engine</span>
            </div>
            <p className="text-[11px] text-[#8e8e9e]">
              Meta Global AI Developer Hackathon 2026 • Verified Physical & In-Memory Profiling
            </p>
          </div>
        </footer>
      </div>

      {/* Floating Replay Controller Bar */}
      <ReplayToolbar />

      {/* Scenario Selector Modal */}
      <ScenarioSelectorModal isOpen={isModalOpen} onClose={closeScenarioModal} />
    </div>
  );
}

export default function Home() {
  return (
    <ReplayProvider>
      <MainContent />
    </ReplayProvider>
  );
}
