"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Download,
  CheckCircle2,
  AlertCircle,
  Play,
  Terminal,
  FileCode,
  ShieldCheck,
  FolderArchive,
  Cpu,
  Layers,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  File,
} from "lucide-react";
import {
  ModelRecord,
  BenchmarkRun,
  HardwareDevice,
  exportDeployment,
  verifyDeployment,
} from "@/lib/api";

interface DeploymentsTabProps {
  models: ModelRecord[];
  runs: BenchmarkRun[];
  hardware: HardwareDevice[];
  onRefresh?: () => void;
}

interface ExportResult {
  bundle_id: string;
  bundle_dir?: string;
  zip_path: string;
  zip_filename: string;
  size_bytes?: number;
  files?: string[];
  download_url?: string;
  manifest?: Record<string, any>;
}

interface VerificationResult {
  bundle_id: string;
  verification_status: "PASSED" | "FAILED";
  returncode: number;
  stdout: string;
  stderr: string;
}

export const DeploymentsTab: React.FC<DeploymentsTabProps> = ({
  models,
  runs,
  hardware,
  onRefresh,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.id || ""
  );
  const [selectedRunId, setSelectedRunId] = useState<string>(
    runs[0]?.id || ""
  );

  const [isExporting, setIsExporting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  // Available runs for the chosen model or all runs
  const filteredRuns = selectedModelId
    ? runs.filter((r) => r.model_id === selectedModelId)
    : runs;

  // Auto-sync model selection when models arrive
  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  // Auto-sync run selection when filtered runs change
  useEffect(() => {
    const currentValid = filteredRuns.some((r) => r.id === selectedRunId);
    if (!currentValid && filteredRuns.length > 0) {
      setSelectedRunId(filteredRuns[0].id);
    }
  }, [filteredRuns, selectedRunId]);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId || !selectedRunId) {
      setErrorMsg("Please select both a model and a verified benchmark run.");
      return;
    }

    setIsExporting(true);
    setErrorMsg(null);
    setVerifyResult(null);

    try {
      const res = await exportDeployment(selectedModelId, selectedRunId);
      setExportResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to export deployment package.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleVerify = async () => {
    if (!exportResult) return;
    setIsVerifying(true);
    setErrorMsg(null);
    setVerifyResult(null);

    try {
      const res = await verifyDeployment(exportResult.bundle_id);
      setVerifyResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Verification smoke test failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const selectedHw = selectedRun
    ? hardware.find((h) => h.id === selectedRun.hardware_id)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <Package className="h-5 w-5 text-teal-400" />
            Deployment Bundling & Zero-Defect Local Verification
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Generate self-contained deployment packages with inference wrappers and physically verify them on-host.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 font-mono flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-zinc-200">
            &times;
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Package Configuration (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
            <Package className="h-4 w-4 text-teal-400" />
            <span>Package Configuration</span>
          </div>

          <form onSubmit={handleExport} className="space-y-4 text-xs font-mono">
            {/* Model Selection */}
            <div>
              <label className="text-zinc-400 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                <Layers className="h-3.5 w-3.5 text-teal-400" />
                Select ONNX Model
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => {
                  setSelectedModelId(e.target.value);
                  const firstMatching = runs.find((r) => r.model_id === e.target.value);
                  if (firstMatching) setSelectedRunId(firstMatching.id);
                }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({(m.file_size_bytes / (1024 * 1024)).toFixed(1)} MB)
                  </option>
                ))}
              </select>
            </div>

            {/* Run Selection */}
            <div>
              <label className="text-zinc-400 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                Select Verified Benchmark Run
              </label>
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none"
              >
                {filteredRuns.length === 0 ? (
                  <option value="">No runs available for this model</option>
                ) : (
                  filteredRuns.map((r) => {
                    const hw = hardware.find((h) => h.id === r.hardware_id);
                    return (
                      <option key={r.id} value={r.id}>
                        {hw?.name || r.hardware_id} • {r.precision.toUpperCase()} • {r.median_latency_ms.toFixed(1)}ms ({r.fps.toFixed(0)} FPS)
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Selected Run Details Card */}
            {selectedRun && (
              <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800 text-[11px] space-y-2 text-zinc-300 shadow-inner">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Target Device:</span>
                  <span className="text-zinc-100 font-semibold">{selectedHw?.name || selectedRun.hardware_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Precision / Batch:</span>
                  <span className="text-teal-400 uppercase font-semibold">
                    {selectedRun.precision} • Batch {selectedRun.batch_size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Median Latency:</span>
                  <span className="text-teal-300 font-bold">{selectedRun.median_latency_ms.toFixed(2)} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Throughput:</span>
                  <span className="text-emerald-400 font-bold">{selectedRun.fps.toFixed(1)} FPS</span>
                </div>
              </div>
            )}

            {/* Bundle Contents Preview */}
            <div className="rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <span className="text-teal-400 font-semibold block">Bundle Components Generated:</span>
              <p>• `model.onnx` optimized tensor graph</p>
              <p>• `infer.py` zero-dependency CLI runtime harness</p>
              <p>• `manifest.json` hardware SLA signature & sha256 checksums</p>
              <p>• `requirements.txt` pinned edge runtime dependencies</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isExporting || !selectedRunId}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 py-3 text-xs font-bold text-zinc-950 transition-all hover:brightness-110 disabled:opacity-50 active:scale-98 shadow-lg shadow-teal-500/20"
              >
                {isExporting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                    Packaging Bundle...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 fill-zinc-950" />
                    Export Deployment Bundle
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Export Result & Verification Terminal (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {!exportResult ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-16 text-center text-zinc-400 space-y-3 bg-zinc-950/40">
              <Package className="h-10 w-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">No bundle exported yet</p>
              <p className="text-xs font-mono max-w-sm mx-auto">
                Select a verified benchmark run and click &quot;Export Deployment Bundle&quot; to compile the deployment ZIP and verify local runtime execution.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bundle Card */}
              <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl border-teal-500/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-teal-400 uppercase font-semibold">
                      Deployment Bundle Created
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100 font-mono mt-0.5">
                      {exportResult.bundle_id}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={exportResult.download_url || `/api/v1/deployments/download/${exportResult.bundle_id}`}
                      download
                      className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3.5 py-2 text-xs font-mono font-semibold text-teal-300 hover:bg-teal-500/20 transition-all shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download ZIP
                    </a>

                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={isVerifying}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 disabled:opacity-50 shadow-md shadow-teal-500/20 transition-all"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Verifying Sandbox...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-zinc-950" />
                          Verify Locally
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Manifest Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="sm:col-span-2 rounded-xl bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-semibold">ARCHIVE LOCATION</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(exportResult.zip_path);
                          setCopiedPath(true);
                          setTimeout(() => setCopiedPath(false), 2000);
                        }}
                        className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                      >
                        {copiedPath ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Path</span>
                          </>
                        )}
                      </button>
                    </div>
                    <span className="text-zinc-200 truncate block text-[11px]" title={exportResult.zip_path}>
                      {exportResult.zip_path}
                    </span>
                  </div>

                  <div className="rounded-xl bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-500 font-semibold block">TARGET RUNTIME</span>
                    <span className="text-teal-400 font-bold block text-[11px]">
                      {selectedRun ? `${selectedRun.runtime} • ${selectedRun.precision.toUpperCase()}` : (exportResult.manifest?.runtime || "onnxruntime")}
                    </span>
                  </div>
                </div>

                {/* Package Files List */}
                {exportResult.files && exportResult.files.length > 0 && (
                  <div className="rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span className="text-[10px] uppercase font-semibold text-zinc-500">
                        Package Contents ({exportResult.files.length} Files)
                      </span>
                      {exportResult.size_bytes && (
                        <span className="text-[11px] text-teal-400">
                          {(exportResult.size_bytes / 1024).toFixed(1)} KB archive
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                      {exportResult.files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-1.5 text-[11px] text-zinc-300"
                        >
                          <FileCode className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Local Verification Sandbox Console */}
              {verifyResult && (
                <div className="rounded-2xl border border-zinc-800 bg-[#090a0f] p-4 space-y-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-teal-400" />
                      <span className="text-xs font-mono font-semibold text-zinc-200">
                        Physical Sandbox Verification Output
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase font-bold ${
                        verifyResult.verification_status === "PASSED"
                          ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                          : "bg-rose-950/80 border border-rose-500/40 text-rose-300"
                      }`}
                    >
                      {verifyResult.verification_status === "PASSED" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      Status: {verifyResult.verification_status} (Exit Code: {verifyResult.returncode})
                    </span>
                  </div>

                  {/* Terminal stdout / stderr */}
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-zinc-900 bg-black/60 p-3.5 text-xs font-mono text-zinc-300 space-y-1">
                    {verifyResult.stdout && (
                      <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
                        {verifyResult.stdout}
                      </pre>
                    )}
                    {verifyResult.stderr && (
                      <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed">
                        {verifyResult.stderr}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
