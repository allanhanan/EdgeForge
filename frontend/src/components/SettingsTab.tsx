"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Bot,
  Database,
  Activity,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  Cpu,
  Layers,
  Folder,
  Shield,
  Server,
  Zap,
  Briefcase,
  Users,
  Building,
  Terminal,
  Globe,
} from "lucide-react";
import {
  MetaStatus,
  ModelRecord,
  DatasetRecord,
  HardwareDevice,
  Experiment,
  BenchmarkRun,
  fetchHealth,
  fetchMetaStatus,
} from "@/lib/api";

interface SettingsTabProps {
  metaStatus?: MetaStatus | null;
  models: ModelRecord[];
  datasets: DatasetRecord[];
  hardware: HardwareDevice[];
  experiments: Experiment[];
  runs: BenchmarkRun[];
  onRefreshAll?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  metaStatus,
  models,
  datasets,
  hardware,
  experiments,
  runs,
  onRefreshAll,
}) => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthPingMs, setHealthPingMs] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [activeMeta, setActiveMeta] = useState<MetaStatus | null>(metaStatus || null);

  const checkHealth = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const data = await fetchHealth();
      const elapsed = performance.now() - start;
      setHealthStatus(data);
      setHealthPingMs(Math.round(elapsed));
    } catch (err: any) {
      setHealthStatus({ status: "error", error: err.message });
      setHealthPingMs(null);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchMetaStatus().then(setActiveMeta).catch(console.error);
  }, []);

  const isOnlineMode = activeMeta?.mode === "META_API_ONLINE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <Settings className="h-5 w-5 text-teal-400" />
            System Architecture & Diagnostics
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Meta AI Provider configuration, SQLite database statistics, and runtime health diagnostics.
          </p>
        </div>

        <button
          onClick={() => {
            checkHealth();
            if (onRefreshAll) onRefreshAll();
          }}
          disabled={isPinging}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 px-4 py-2 text-xs font-mono text-zinc-200 hover:bg-zinc-700 transition-all disabled:opacity-50 font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? "animate-spin" : ""}`} />
          Run Health Diagnostic
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meta AI Provider Configuration */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-zinc-200">
                Meta AI Model Provider
              </h3>
            </div>
            <span
              className={`rounded-md px-2.5 py-0.5 text-[10px] font-mono uppercase font-semibold ${
                isOnlineMode
                  ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                  : "bg-purple-950/80 border border-purple-500/40 text-purple-300"
              }`}
            >
              {isOnlineMode ? "Meta API Online" : "Offline Deterministic Mode"}
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800 space-y-2 text-zinc-300 shadow-inner">
              <div className="flex justify-between">
                <span className="text-zinc-400">Target Model:</span>
                <span className="text-teal-400 font-semibold">{activeMeta?.model || "Meta Muse Spark"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Provider Endpoint:</span>
                <span className="text-zinc-300 truncate max-w-[200px]">{activeMeta?.base_url || "Local Engine"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">API Key Configured:</span>
                <span className={activeMeta?.configured ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                  {activeMeta?.configured ? "Configured" : "Unset (Graceful Offline Fallback)"}
                </span>
              </div>
            </div>

            {/* Philosophy Box */}
            <div className="rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <span className="text-zinc-200 font-semibold block flex items-center gap-1.5 font-sans">
                <Shield className="h-3.5 w-3.5 text-teal-400" />
                Dual-Mode Reliability Guarantee
              </span>
              <p className="leading-relaxed">
                When valid Meta API credentials are present, queries leverage Meta Muse Spark directly.
                If offline or credentials are unset, EdgeForge seamlessly falls back to a deterministic,
                mathematically verified local solver, ensuring 100% reproducible hackathon evaluation.
              </p>
            </div>
          </div>
        </div>

        {/* Backend Diagnostic & Health */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-200">
                Backend Service Health
              </h3>
            </div>
            {healthPingMs !== null && (
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 rounded px-2 py-0.5">
                Ping: {healthPingMs}ms
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800 space-y-2 text-zinc-300 shadow-inner">
              <div className="flex justify-between">
                <span className="text-zinc-400">Service Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {healthStatus?.status?.toUpperCase() || "ONLINE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Service Name:</span>
                <span className="text-zinc-200 font-medium">{healthStatus?.service || "EdgeForge Backend"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Engine Version:</span>
                <span className="text-teal-400 font-semibold">{healthStatus?.version || "1.0.0"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Local Proxy Route:</span>
                <span className="text-zinc-300">/api/v1/ -&gt; 127.0.0.1:8000</span>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <span className="text-zinc-200 font-semibold block flex items-center gap-1.5 font-sans">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                High-Performance Microservice
              </span>
              <p className="leading-relaxed">
                Powered by FastAPI async ASGI worker, SQLite with async SQLAlchemy 2.0, ONNX Runtime with CUDA EP, and NVML hardware monitoring.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Database & Storage Statistics */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-zinc-200">
              Storage Topology & Database Inventory
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            SQLite Database: backend/storage/edgeforge.db
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
          <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block font-semibold">MODELS</span>
            <span className="text-2xl font-extrabold text-zinc-100">{models.length}</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">ONNX records</span>
          </div>

          <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block font-semibold">DATASETS</span>
            <span className="text-2xl font-extrabold text-zinc-100">{datasets.length}</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Test sets</span>
          </div>

          <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block font-semibold">HARDWARE</span>
            <span className="text-2xl font-extrabold text-zinc-100">{hardware.length}</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5 font-medium">
              {hardware.filter((h) => h.status === "ONLINE").length} Online Physical
            </span>
          </div>

          <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block font-semibold">EXPERIMENTS</span>
            <span className="text-2xl font-extrabold text-zinc-100">{experiments.length}</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Total jobs</span>
          </div>

          <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block font-semibold">BENCHMARK RUNS</span>
            <span className="text-2xl font-extrabold text-teal-300">{runs.length}</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Verified metrics</span>
          </div>
        </div>

        {/* System Paths */}
        <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800 text-xs font-mono space-y-1.5 text-zinc-400">
          <div className="flex justify-between">
            <span className="text-zinc-400">Storage Root:</span>
            <span className="text-zinc-200">/home/allan/project/metaHackathon/backend/storage</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Model Storage:</span>
            <span className="text-zinc-200">/home/allan/project/metaHackathon/backend/storage/models</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Dataset Storage:</span>
            <span className="text-zinc-200">/home/allan/project/metaHackathon/backend/storage/datasets</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Deployment Exports:</span>
            <span className="text-zinc-200">/home/allan/project/metaHackathon/backend/storage/exports</span>
          </div>
        </div>
      </div>

      {/* Target Personas & Commercial Deployment Scenarios (Section 7) */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-200">
              Target Personas & Commercial Deployment Editions (Platform Roadmap)
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            Hackathon MVP + Production SaaS Architecture
          </span>
        </div>

        {/* 5 Supported Personas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
              <Cpu className="h-3.5 w-3.5 text-teal-400" />
              Robotics & Embedded
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Require low latency, thermal stability, power bounds, and ready-to-run export packages.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              ML Engineers
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Demand reproducible metrics, runtime comparisons, quantization experiments, and regression audits.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              CV & Manufacturing
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Focus on predictable multi-camera inference, hardware cost control, and zero deployment regressions.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Server className="h-3.5 w-3.5 text-amber-400" />
              Hardware Vendors
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Test customer model compatibility and publish independently verified benchmarks without bias.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
              <Building className="h-3.5 w-3.5 text-purple-400" />
              Enterprise Platform
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Deploy private device laboratories, RBAC access controls, model governance, and CI/CD automation.
            </p>
          </div>
        </div>

        {/* Commercial Offerings Table */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] font-mono uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-2.5">Product Offering</th>
                <th className="px-4 py-2.5">Target Customer</th>
                <th className="px-4 py-2.5">Usage & Capability</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px] text-zinc-300">
              <tr>
                <td className="px-4 py-2 font-semibold text-teal-300">Local Developer Edition</td>
                <td className="px-4 py-2 text-zinc-400">Students, independent engineers</td>
                <td className="px-4 py-2">Runs local CPU/GPU benchmarks, ONNX inspector, and offline agent</td>
                <td className="px-4 py-2"><span className="text-emerald-400 font-bold">● Active (Hackathon)</span></td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-semibold text-teal-300">Hosted Benchmark Lab</td>
                <td className="px-4 py-2 text-zinc-400">Robotics & computer vision startups</td>
                <td className="px-4 py-2">Dispatches experiments to remotely connected physical edge fleet</td>
                <td className="px-4 py-2"><span className="text-teal-400 font-medium">Ready (Worker Protocol)</span></td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-semibold text-teal-300">Team Workspace</td>
                <td className="px-4 py-2 text-zinc-400">Engineering teams & labs</td>
                <td className="px-4 py-2">Shared models, team experiment lineage, and cross-hardware comparison</td>
                <td className="px-4 py-2"><span className="text-zinc-400">Roadmap</span></td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-semibold text-teal-300">Private Enterprise Lab</td>
                <td className="px-4 py-2 text-zinc-400">Automotive, aerospace, defense</td>
                <td className="px-4 py-2">On-premise hardware farm with air-gapped deterministic Meta agent</td>
                <td className="px-4 py-2"><span className="text-zinc-400">Roadmap</span></td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-semibold text-teal-300">CI Benchmark Automation</td>
                <td className="px-4 py-2 text-zinc-400">MLOps & platform teams</td>
                <td className="px-4 py-2">Automated performance regression gates on GitHub Actions PRs</td>
                <td className="px-4 py-2"><span className="text-zinc-400">Roadmap</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
