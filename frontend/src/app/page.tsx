"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navigation, TabType } from "@/components/Navigation";
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
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metaStatus={metaStatus}
        isOnline={isOnline}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "dashboard" && (
          <DashboardTab
            models={models}
            hardware={hardware}
            experiments={experiments}
            runs={runs}
            setActiveTab={setActiveTab}
            onQuickBenchmark={() => setActiveTab("workbench")}
          />
        )}

        {activeTab === "models" && (
          <ModelsTab
            models={models}
            onRefresh={loadData}
            onSelectForBenchmark={handleSelectModelForBenchmark}
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
          />
        )}

        {activeTab === "agent" && (
          <AIEngineerTab
            models={models}
            metaStatus={metaStatus}
            onRefreshRuns={loadData}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "deployments" && (
          <DeploymentsTab
            models={models}
            runs={runs}
            hardware={hardware}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            models={models}
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
      <footer className="border-t border-zinc-800/60 bg-zinc-950/70 py-6 px-6 text-center text-xs text-zinc-500 font-mono backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="font-semibold text-zinc-300">EdgeForge v1.0</span>
            <span>•</span>
            <span>Vendor-Neutral Edge AI Intelligence Engine</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Meta Global AI Developer Hackathon 2026 • Verified Physical & In-Memory Profiling
          </p>
        </div>
      </footer>
    </div>
  );
}
