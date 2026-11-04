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

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [activeGoal, setActiveGoal] = useState<WorkflowGoal>(null);
  const [isOnline, setIsOnline] = useState(false);
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
      setActiveTab(target.targetTab);
    }
  };

  const handleClearGoal = () => {
    setActiveGoal(null);
  };

  const handleAskAI = (query: string) => {
    setAgentInitialQuery(`${query}__${Date.now()}`);
    setActiveTab("agent");
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
        setIsOnline(false);
      }

      if (hwRes.status === "fulfilled") setHardware(hwRes.value);
      if (mRes.status === "fulfilled") setModels(mRes.value);
      if (dRes.status === "fulfilled") setDatasets(dRes.value);
      if (eRes.status === "fulfilled") setExperiments(eRes.value);
      if (rRes.status === "fulfilled") setRuns(rRes.value);
      if (msRes.status === "fulfilled") setMetaStatus(msRes.value);
    } catch {
      setIsOnline(false);
    }
  }, []);

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

  const handleSelectModelForBenchmark = (modelId: string) => {
    setPreselectedModelId(modelId);
    setActiveTab("workbench");
  };

  const handleSelectDatasetForBenchmark = (datasetId: string) => {
    setPreselectedDatasetId(datasetId);
    setActiveTab("workbench");
  };

  const handleSelectForCompare = (runId: string) => {
    setPreselectedRunId(runId);
    setActiveTab("compare");
  };

  return (
    <div className="min-h-screen bg-[#111217] text-[#ccccdc] flex font-sans">
      {/* Persistent Vertical Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Compact Top Bar */}
        <TopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOnline={isOnline}
          metaStatus={metaStatus}
          onRefresh={loadData}
          activeGoal={activeGoal}
          onClearGoal={handleClearGoal}
          onSelectGoal={handleSelectGoal}
        />

        {/* Content area: full-bleed viewport layout */}
        <main className="flex-1 w-full p-4 sm:p-5">
          {activeTab === "dashboard" && (
            <DashboardTab
              models={models}
              hardware={hardware}
              experiments={experiments}
              runs={runs}
              setActiveTab={setActiveTab}
              onSelectTab={setActiveTab}
              onSelectModel={setPreselectedModelId}
              onQuickBenchmark={() => setActiveTab("workbench")}
              activeGoal={activeGoal}
              onSelectGoal={handleSelectGoal}
              onClearGoal={handleClearGoal}
              onRefreshData={loadData}
              onSelectForCompare={handleSelectForCompare}
            />
          )}

          {activeTab === "models" && (
            <ModelsTab
              models={models}
              onRefresh={loadData}
              onSelectForBenchmark={handleSelectModelForBenchmark}
              initialModelId={preselectedModelId}
            />
          )}

          {activeTab === "datasets" && (
            <DatasetsTab
              datasets={datasets}
              onRefresh={loadData}
              onSelectForBenchmark={handleSelectDatasetForBenchmark}
            />
          )}

          {activeTab === "hardware" && (
            <HardwareLabTab
              hardware={hardware}
              onRefresh={loadData}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
              setActiveTab={(tab: string) => setActiveTab(tab as TabType)}
              onSelectGoal={(goal: string) => handleSelectGoal(goal as WorkflowGoal)}
            />
          )}

          {activeTab === "workbench" && (
            <WorkbenchTab
              models={models}
              hardware={hardware}
              datasets={datasets}
              initialModelId={preselectedModelId}
              initialDatasetId={preselectedDatasetId}
              onBenchmarkComplete={loadData}
              setActiveTab={setActiveTab}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
              onAskAI={handleAskAI}
              onRefresh={loadData}
            />
          )}

          {activeTab === "experiments" && (
            <ExperimentsTab
              experiments={experiments}
              runs={runs}
              models={models}
              hardware={hardware}
              onRefresh={loadData}
              setActiveTab={setActiveTab}
              onSelectForCompare={handleSelectForCompare}
            />
          )}

          {activeTab === "compare" && (
            <CompareTab
              runs={runs}
              models={models}
              hardware={hardware}
              preselectedRunId={preselectedRunId}
              setActiveTab={setActiveTab}
              onAskAI={handleAskAI}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
              onSelectGoal={handleSelectGoal}
            />
          )}

          {activeTab === "agent" && (
            <AIEngineerTab
              models={models}
              hardware={hardware}
              datasets={datasets}
              runs={runs}
              metaStatus={metaStatus}
              onRefreshRuns={loadData}
              setActiveTab={setActiveTab}
              initialQuery={agentInitialQuery}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
            />
          )}

          {activeTab === "deployments" && (
            <DeploymentsTab
              models={models}
              runs={runs}
              hardware={hardware}
              activeGoal={activeGoal}
              onClearGoal={handleClearGoal}
              onRefresh={loadData}
              setActiveTab={setActiveTab}
              onSelectGoal={handleSelectGoal}
            />
          )}

          {activeTab === "reports" && (
            <ReportsTab
              models={models}
              setActiveTab={setActiveTab}
              onRefresh={loadData}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              metaStatus={metaStatus}
              models={models}
              datasets={datasets}
              hardware={hardware}
              experiments={experiments}
              runs={runs}
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
    </div>
  );
}
