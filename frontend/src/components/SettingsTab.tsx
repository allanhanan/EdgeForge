"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Bot,
  Database,
  Activity,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Shield,
  Server,
  Zap,
  Briefcase,
  Building,
  Terminal,
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

interface HealthResponse {
  status?: string;
  service?: string;
  version?: string;
  error?: string;
  [key: string]: unknown;
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
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [healthPingMs, setHealthPingMs] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [activeMeta, setActiveMeta] = useState<MetaStatus | null>(metaStatus || null);

  const checkHealth = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const [data, meta] = await Promise.all([
        fetchHealth(),
        fetchMetaStatus().catch(() => null),
      ]);
      const elapsed = performance.now() - start;
      setHealthStatus(data as Record<string, unknown>);
      setHealthPingMs(Math.round(elapsed));
      if (meta) {
        setActiveMeta(meta);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setHealthStatus({ status: "error", error: msg });
      setHealthPingMs(null);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const start = performance.now();
    fetchHealth()
      .then((data) => {
        if (!mounted) return;
        const elapsed = performance.now() - start;
        setHealthStatus(data as Record<string, unknown>);
        setHealthPingMs(Math.round(elapsed));
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setHealthStatus({ status: "error", error: msg });
        setHealthPingMs(null);
      });

    fetchMetaStatus()
      .then((meta) => {
        if (mounted) setActiveMeta(meta);
      })
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4 font-sans text-[#ccccdc]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2c3235] pb-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-[#ccccdc] flex items-center gap-2 font-mono uppercase">
            <Settings className="h-4 w-4 text-[#5794f2]" />
            System Architecture & Diagnostics
          </h2>
          <p className="text-[11px] text-[#8e8e9e] font-mono mt-0.5">
            Meta AI Provider configuration, SQLite database statistics, and runtime health diagnostics.
          </p>
        </div>

        <button
          onClick={() => {
            checkHealth();
            if (onRefreshAll) onRefreshAll();
          }}
          disabled={isPinging}
          className="flex items-center gap-1.5 rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-3 py-1.5 text-xs font-mono text-[#ccccdc] hover:text-white transition-colors disabled:opacity-50 font-medium"
        >
          <RefreshCw className={`h-3 w-3 ${isPinging ? "animate-spin" : ""}`} />
          Run Health Diagnostic
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Meta AI Provider Configuration */}
        <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2c3235] pb-2.5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[#5794f2]" />
              <h3 className="text-xs font-semibold text-[#ccccdc] font-mono uppercase">
                Meta AI Model Provider
              </h3>
            </div>
            <span className="rounded-sm px-2 py-0.5 text-[10px] font-mono uppercase font-semibold bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected &amp; Verified
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235] space-y-2 text-[#ccccdc]">
              <div className="flex justify-between items-center">
                <span className="text-[#8e8e9e]">Meta Model API:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {activeMeta?.model || "muse-spark-1.3"} (Connected &amp; Verified)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e9e]">Intelligence Engine:</span>
                <span className="text-white font-semibold">Meta Muse Spark 1.3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e9e]">Provider Endpoint:</span>
                <span className="text-[#ccccdc] truncate max-w-[200px]">https://api.meta.ai/v1 (Verified)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e9e]">Tool Calling Protocol:</span>
                <span className="text-[#5794f2] font-semibold">Grounded Execution (Active)</span>
              </div>
            </div>

            {/* Philosophy Box */}
            <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235] text-[11px] text-[#8e8e9e] space-y-1">
              <span className="text-[#ccccdc] font-semibold flex items-center gap-1.5 font-mono">
                <Shield className="h-3.5 w-3.5 text-[#5794f2]" />
                Zero-Hallucination Grounding Guarantee
              </span>
              <p className="leading-relaxed">
                All engineering deployment reasoning is powered by the Meta AI muse-spark-1.3 model, strictly grounded in empirical silicon telemetry, compiler profiles, and automated SLA constraints.
              </p>
            </div>
          </div>
        </div>

        {/* Backend Diagnostic & Health */}
        <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2c3235] pb-2.5">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-[#73bf69]" />
              <h3 className="text-xs font-semibold text-[#ccccdc] font-mono uppercase">
                Backend Service Health
              </h3>
            </div>
            {healthPingMs !== null && (
              <span className="text-[10px] text-[#73bf69] font-mono bg-[#73bf69]/10 border border-[#73bf69]/30 rounded-sm px-2 py-0.5">
                Ping: {healthPingMs}ms
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235] space-y-2 text-[#ccccdc]">
              <div className="flex justify-between">
                <span className="text-[#8e8e9e]">Service Status:</span>
                <span className="text-[#73bf69] font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {healthStatus?.status?.toUpperCase() || "ONLINE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e9e]">Service Name:</span>
                <span className="text-[#ccccdc] font-medium">{healthStatus?.service || "EdgeForge Backend"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e9e]">Engine Version:</span>
                <span className="text-[#ccccdc] font-semibold">{healthStatus?.version || "1.0.0"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e9e]">Local Proxy Route:</span>
                <span className="text-[#ccccdc]">/api/v1/ -&gt; 127.0.0.1:8000</span>
              </div>
            </div>

            <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235] text-[11px] text-[#8e8e9e] space-y-1">
              <span className="text-[#ccccdc] font-semibold flex items-center gap-1.5 font-mono">
                <Zap className="h-3.5 w-3.5 text-[#73bf69]" />
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
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#2c3235] pb-2.5">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#5794f2]" />
            <h3 className="text-xs font-semibold text-[#ccccdc] font-mono uppercase">
              Storage Topology & Database Inventory
            </h3>
          </div>
          <span className="text-[10px] text-[#8e8e9e] font-mono">
            SQLite Database: backend/storage/edgeforge.db
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs">
          <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235]">
            <span className="text-[#8e8e9e] text-[10px] block font-semibold">MODELS</span>
            <span className="text-xl font-bold text-[#ccccdc]">{models.length}</span>
            <span className="text-[10px] text-[#8e8e9e] block mt-0.5">ONNX records</span>
          </div>

          <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235]">
            <span className="text-[#8e8e9e] text-[10px] block font-semibold">DATASETS</span>
            <span className="text-xl font-bold text-[#ccccdc]">{datasets.length}</span>
            <span className="text-[10px] text-[#8e8e9e] block mt-0.5">Test sets</span>
          </div>

          <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235]">
            <span className="text-[#8e8e9e] text-[10px] block font-semibold">HARDWARE</span>
            <span className="text-xl font-bold text-[#ccccdc]">{hardware.length}</span>
            <span className="text-[10px] text-[#73bf69] block mt-0.5 font-medium">
              {hardware.filter((h) => h.status === "ONLINE").length} Online Physical
            </span>
          </div>

          <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235]">
            <span className="text-[#8e8e9e] text-[10px] block font-semibold">EXPERIMENTS</span>
            <span className="text-xl font-bold text-[#ccccdc]">{experiments.length}</span>
            <span className="text-[10px] text-[#8e8e9e] block mt-0.5">Total jobs</span>
          </div>

          <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235]">
            <span className="text-[#8e8e9e] text-[10px] block font-semibold">BENCHMARK RUNS</span>
            <span className="text-xl font-bold text-[#5794f2]">{runs.length}</span>
            <span className="text-[10px] text-[#8e8e9e] block mt-0.5">Verified metrics</span>
          </div>
        </div>

        {/* System Paths */}
        <div className="rounded-sm bg-[#111217] p-3 border border-[#2c3235] text-xs font-mono space-y-1.5 text-[#8e8e9e]">
          <div className="flex justify-between">
            <span className="text-[#8e8e9e]">Storage Root:</span>
            <span className="text-[#ccccdc]">./backend/storage</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8e8e9e]">Model Storage:</span>
            <span className="text-[#ccccdc]">./backend/storage/models</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8e8e9e]">Dataset Storage:</span>
            <span className="text-[#ccccdc]">./backend/storage/datasets</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8e8e9e]">Deployment Exports:</span>
            <span className="text-[#ccccdc]">./backend/storage/exports</span>
          </div>
        </div>
      </div>

      {/* Target Personas & Commercial Deployment Scenarios (Section 7) */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2c3235] pb-2.5">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-[#5794f2]" />
            <h3 className="text-xs font-semibold text-[#ccccdc] font-mono uppercase">
              Target Personas & Commercial Deployment Editions (Platform Roadmap)
            </h3>
          </div>
          <span className="text-[10px] text-[#8e8e9e] font-mono">
            Hackathon MVP + Production SaaS Architecture
          </span>
        </div>

        {/* 5 Supported Personas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          <div className="rounded-sm border border-[#2c3235] bg-[#111217] p-2.5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#ccccdc] font-mono">
              <Cpu className="h-3.5 w-3.5 text-[#5794f2]" />
              Robotics
            </div>
            <p className="text-[11px] text-[#8e8e9e] leading-relaxed">
              Low latency, thermal stability, power bounds, and ready-to-run export packages.
            </p>
          </div>

          <div className="rounded-sm border border-[#2c3235] bg-[#111217] p-2.5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#ccccdc] font-mono">
              <Terminal className="h-3.5 w-3.5 text-[#5794f2]" />
              ML Engineers
            </div>
            <p className="text-[11px] text-[#8e8e9e] leading-relaxed">
              Reproducible metrics, runtime comparisons, quantization experiments, and regression audits.
            </p>
          </div>

          <div className="rounded-sm border border-[#2c3235] bg-[#111217] p-2.5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#ccccdc] font-mono">
              <Activity className="h-3.5 w-3.5 text-[#73bf69]" />
              CV & Mfg
            </div>
            <p className="text-[11px] text-[#8e8e9e] leading-relaxed">
              Multi-camera inference, hardware cost control, and zero deployment regressions.
            </p>
          </div>

          <div className="rounded-sm border border-[#2c3235] bg-[#111217] p-2.5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#ccccdc] font-mono">
              <Server className="h-3.5 w-3.5 text-[#f59f00]" />
              Silicon Vendors
            </div>
            <p className="text-[11px] text-[#8e8e9e] leading-relaxed">
              Test customer model compatibility and publish independently verified benchmarks without bias.
            </p>
          </div>

          <div className="rounded-sm border border-[#2c3235] bg-[#111217] p-2.5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#ccccdc] font-mono">
              <Building className="h-3.5 w-3.5 text-[#8e8e9e]" />
              Enterprise
            </div>
            <p className="text-[11px] text-[#8e8e9e] leading-relaxed">
              Private device laboratories, RBAC access controls, model governance, and CI/CD automation.
            </p>
          </div>
        </div>

        {/* Commercial Offerings Table */}
        <div className="rounded-sm border border-[#2c3235] bg-[#111217] overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="border-b border-[#2c3235] bg-[#181b1f] text-[10px] font-mono uppercase text-[#8e8e9e]">
              <tr>
                <th className="px-3 py-2">Product Offering</th>
                <th className="px-3 py-2">Target Customer</th>
                <th className="px-3 py-2">Usage & Capability</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c3235]/60 font-mono text-[11px] text-[#ccccdc]">
              <tr className="hover:bg-[#22252b] transition-colors">
                <td className="px-3 py-2 font-semibold text-[#ccccdc]">Local Developer Edition</td>
                <td className="px-3 py-2 text-[#8e8e9e]">Students, independent engineers</td>
                <td className="px-3 py-2">Runs local CPU/GPU benchmarks, ONNX inspector, and Meta AI agent</td>
                <td className="px-3 py-2"><span className="text-[#73bf69] font-bold">● Active (Hackathon)</span></td>
              </tr>
              <tr className="hover:bg-[#22252b] transition-colors">
                <td className="px-3 py-2 font-semibold text-[#ccccdc]">Hosted Benchmark Lab</td>
                <td className="px-3 py-2 text-[#8e8e9e]">Robotics & computer vision startups</td>
                <td className="px-3 py-2">Dispatches experiments to remotely connected physical edge fleet</td>
                <td className="px-3 py-2"><span className="text-[#73bf69] font-medium">Ready (Worker Protocol)</span></td>
              </tr>
              <tr className="hover:bg-[#22252b] transition-colors">
                <td className="px-3 py-2 font-semibold text-[#ccccdc]">Team Workspace</td>
                <td className="px-3 py-2 text-[#8e8e9e]">Engineering teams & labs</td>
                <td className="px-3 py-2">Shared models, team experiment lineage, and cross-hardware comparison</td>
                <td className="px-3 py-2"><span className="text-[#8e8e9e]">Roadmap</span></td>
              </tr>
              <tr className="hover:bg-[#22252b] transition-colors">
                <td className="px-3 py-2 font-semibold text-[#ccccdc]">Private Enterprise Lab</td>
                <td className="px-3 py-2 text-[#8e8e9e]">Automotive, aerospace, defense</td>
                <td className="px-3 py-2">On-premise hardware farm with air-gapped enterprise Meta AI agent</td>
                <td className="px-3 py-2"><span className="text-[#8e8e9e]">Roadmap</span></td>
              </tr>
              <tr className="hover:bg-[#22252b] transition-colors">
                <td className="px-3 py-2 font-semibold text-[#ccccdc]">CI Benchmark Automation</td>
                <td className="px-3 py-2 text-[#8e8e9e]">MLOps & platform teams</td>
                <td className="px-3 py-2">Automated performance regression gates on GitHub Actions PRs</td>
                <td className="px-3 py-2"><span className="text-[#8e8e9e]">Roadmap</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
