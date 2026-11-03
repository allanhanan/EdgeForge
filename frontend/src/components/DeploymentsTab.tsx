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
  Info,
  Box,
  CheckSquare,
  ArrowRight,
  Code,
  Sparkles,
  Gauge,
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
  activeGoal?: string | null;
  onClearGoal?: () => void;
  setActiveTab?: (tab: any) => void;
  onSelectGoal?: (goal: any) => void;
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

// Robust cross-browser clipboard copy with execCommand fallback
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to fallback
  }
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    textArea.remove();
    return successful;
  } catch (err) {
    console.warn("Clipboard copy failed", err);
    return false;
  }
};

// Inline Snippet Copy Button
const CopySnippetButton: React.FC<{ text: string; label?: string }> = ({ text, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:bg-zinc-800 hover:text-teal-300 transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400 font-semibold">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 text-zinc-400" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export const DeploymentsTab: React.FC<DeploymentsTabProps> = ({
  models,
  runs,
  hardware,
  onRefresh,
  activeGoal,
  onClearGoal,
  setActiveTab,
  onSelectGoal,
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
      if (onRefresh) onRefresh();
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
  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <Package className="h-5 w-5 text-teal-400" />
            Deployment Packaging &amp; Zero-Defect Local Verification
          </h2>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            Package your validated model into a standalone, ready-to-deploy bundle for edge devices and verify execution before transferring.
          </p>
        </div>
      </div>

      {/* Guided 4-Step Deployment Pipeline Banner */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 font-bold text-[11px] border border-teal-500/40">
              1
            </span>
            <span className="font-sans font-medium text-zinc-200">Select Tested Model &amp; Run</span>
          </div>
          <ArrowRight className="hidden md:block h-3.5 w-3.5 text-zinc-600" />

          <div className="flex items-center gap-2 text-zinc-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 font-bold text-[11px] border border-teal-500/40">
              2
            </span>
            <span className="font-sans font-medium text-zinc-200">Export Deployment Bundle</span>
          </div>
          <ArrowRight className="hidden md:block h-3.5 w-3.5 text-zinc-600" />

          <div className="flex items-center gap-2 text-zinc-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/40">
              3
            </span>
            <span className="font-sans font-semibold text-emerald-300">Verify Locally in Sandbox</span>
          </div>
          <ArrowRight className="hidden md:block h-3.5 w-3.5 text-zinc-600" />

          <div className="flex items-center gap-2 text-zinc-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[11px] border border-cyan-500/40">
              4
            </span>
            <span className="font-sans font-medium text-zinc-200">Deploy to Edge Hardware</span>
          </div>
        </div>
      </div>

      {/* Active Goal Callout */}
      {activeGoal === "prepare-deployment" && (
        <div className="rounded-2xl border border-teal-500/40 bg-gradient-to-r from-teal-950/60 via-zinc-900/90 to-zinc-950 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">
                  Active Goal: Prepare for deployment
                </span>
                <span className="rounded bg-teal-500/20 text-teal-200 text-[10px] px-2 py-0.2 font-mono">
                  Packaging
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-sans mt-0.5">
                I want a working deployment package for my target device.
              </h3>
              <p className="text-xs text-zinc-300 font-sans">
                Export your validated model bundle into a standalone ZIP package with infer.py, requirements.txt, and manifest.json, then run local sandbox verification before transferring to edge hardware.
              </p>
            </div>
          </div>
          {onClearGoal && (
            <button
              onClick={onClearGoal}
              className="rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white transition-all font-mono self-end sm:self-center"
            >
              Exit Goal
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-zinc-200 text-base leading-none">
            &times;
          </button>
        </div>
      )}

      {/* Friendly Empty State if no runs available */}
      {runs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-teal-500/40 bg-teal-950/20 p-6 sm:p-8 text-center space-y-4 shadow-xl animate-fadeIn">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-md">
            <Package className="h-7 w-7" />
          </div>
          <div className="max-w-xl mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-white font-sans">
              No verified benchmark runs to package yet
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Unlike raw model weights, an EdgeForge deployment package includes hardware-verified inference scripts, optimal batch/precision configuration, systemd units, and Docker containers tuned to your specific tested device.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onSelectGoal) onSelectGoal("test-model");
                else if (setActiveTab) setActiveTab("workbench");
              }}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-lg shadow-teal-500/20 transition-all font-sans flex items-center gap-1.5"
            >
              <Gauge className="h-4 w-4" />
              <span>Run Model Benchmark First</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (setActiveTab) setActiveTab("models");
              }}
              className="rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-all font-sans"
            >
              Inspect Models Catalog
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Package Configuration & Plain English Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
              <Package className="h-4 w-4 text-teal-400" />
              <span>Package Configuration</span>
            </div>

            <form onSubmit={handleExport} className="space-y-4 text-xs font-mono">
              {/* Model Selection */}
              <div>
                <label className="text-zinc-300 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                  <Layers className="h-3.5 w-3.5 text-teal-400" />
                  Select Model
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
                <label className="text-zinc-300 block mb-1.5 flex items-center gap-1.5 font-sans font-medium">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  Select Tested Benchmark Run
                </label>
                <select
                  value={selectedRunId}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none"
                >
                  {filteredRuns.length === 0 ? (
                    <option value="">No verified runs available for this model</option>
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

              {/* Guidance if no runs exist */}
              {filteredRuns.length === 0 && (
                <div className="rounded-xl bg-amber-950/20 border border-amber-500/30 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold font-sans">
                    <AlertCircle className="h-4 w-4" />
                    <span>No Verified Benchmark Runs Found</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    To ensure zero-defect deployments, EdgeForge packages models paired with verified benchmark runs. Benchmark this model in the Workbench to capture verified latency and precision metrics.
                  </p>
                  {setActiveTab && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("workbench")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-[11px] font-sans font-semibold text-amber-200 hover:bg-amber-500/30 transition-all"
                    >
                      Open Workbench &rarr;
                    </button>
                  )}
                </div>
              )}

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

              {/* "What is inside this package?" Breakdown Card (Left) */}
              <div className="rounded-2xl border border-teal-500/30 bg-zinc-950/80 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-teal-400" />
                  <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                    What is inside this package?
                  </h4>
                </div>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Every EdgeForge deployment package is a zero-dependency, self-contained ZIP archive with everything needed to execute on edge devices:
                </p>

                <div className="space-y-2 pt-1 font-sans">
                  {/* model.onnx */}
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <Box className="h-4 w-4 text-teal-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-mono text-xs font-bold text-teal-300">model.onnx</div>
                      <div className="text-[11px] text-zinc-300">
                        Your optimized, validated model weights and graph.
                      </div>
                    </div>
                  </div>

                  {/* infer.py */}
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <FileCode className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-mono text-xs font-bold text-emerald-300">infer.py</div>
                      <div className="text-[11px] text-zinc-300">
                        Ready-to-run standalone Python script for edge cameras.
                      </div>
                    </div>
                  </div>

                  {/* requirements.txt */}
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <Terminal className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-mono text-xs font-bold text-cyan-300">requirements.txt</div>
                      <div className="text-[11px] text-zinc-300">
                        Minimal Python dependencies.
                      </div>
                    </div>
                  </div>

                  {/* manifest.json */}
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <ShieldCheck className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-mono text-xs font-bold text-purple-300">manifest.json</div>
                      <div className="text-[11px] text-zinc-300">
                        Checksums and reproducibility audit trail.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isExporting || !selectedRunId}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 py-3 text-xs font-bold text-zinc-950 transition-all hover:brightness-110 disabled:opacity-50 active:scale-98 shadow-lg shadow-teal-500/20 font-sans"
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
        </div>

        {/* Right Column: Export Result, Verify Locally, Snippets (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {!exportResult ? (
            <div className="glass-panel rounded-2xl border border-dashed border-zinc-800 p-8 space-y-6 bg-zinc-950/40 shadow-xl">
              <div className="text-center space-y-3 max-w-md mx-auto">
                <div className="p-4 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 w-fit mx-auto">
                  <Package className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-200 font-sans">
                    No Deployment Bundle Exported Yet
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans mt-1">
                    Select a validated benchmark run on the left and click <strong className="text-teal-300">&quot;Export Deployment Bundle&quot;</strong> to generate your self-contained edge package.
                  </p>
                </div>
              </div>

              {/* Pre-export Quickstart Preview: 1-line bash snippet */}
              <div className="rounded-xl border border-teal-500/30 bg-zinc-900/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-teal-400" />
                    <span className="text-xs font-bold text-zinc-200 font-sans uppercase tracking-wider">
                      Quickstart Preview: How You Will Run on Edge Hardware
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">1-Line CLI</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans">
                  Once exported, copy your package to edge hardware (Jetson, Raspberry Pi, or edge camera) and run this 1-line command:
                </p>
                <div className="flex items-center justify-between rounded-xl border border-teal-500/40 bg-black/80 p-3 font-mono text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-teal-400 select-none">$</span>
                    <code className="text-zinc-100 font-semibold truncate">
                      python infer.py --image input.jpg
                    </code>
                  </div>
                  <CopySnippetButton text="python infer.py --image input.jpg" label="Copy Command" />
                </div>
              </div>

              {/* Pre-export Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-teal-400 font-bold text-xs font-sans">
                    <CheckSquare className="h-3.5 w-3.5" /> Self-Contained
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Weights, script, and dependencies in a single portable ZIP archive.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs font-sans">
                    <Play className="h-3.5 w-3.5 fill-emerald-400" /> Verify Locally
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Test runs your packaged script in an isolated sandbox before copying to edge hardware.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs font-sans">
                    <ShieldCheck className="h-3.5 w-3.5" /> Manifest Audit
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Cryptographic SHA-256 signatures and reproducibility audit trail.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Bundle Header Card */}
              <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-teal-500/40 bg-zinc-900/70">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-teal-400 uppercase font-semibold">
                      Deployment Package Ready
                    </span>
                    <h3 className="text-base font-bold text-zinc-100 font-mono mt-0.5">
                      {exportResult.bundle_id}
                    </h3>
                  </div>

                  <a
                    href={exportResult.download_url || `/api/v1/deployments/download/${exportResult.bundle_id}`}
                    download
                    className="flex items-center justify-center gap-2 rounded-xl bg-teal-500/20 border border-teal-500/40 px-4 py-2 text-xs font-mono font-bold text-teal-300 hover:bg-teal-500/30 transition-all shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download ZIP ({exportResult.size_bytes ? `${(exportResult.size_bytes / (1024 * 1024)).toFixed(1)} MB` : "Ready"})
                  </a>
                </div>

                {/* Archive Location & Target Runtime */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="sm:col-span-2 rounded-xl bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase">ARCHIVE ON DISK</span>
                      <CopySnippetButton text={exportResult.zip_path} label="Copy Path" />
                    </div>
                    <span className="text-zinc-200 truncate block text-[11px]" title={exportResult.zip_path}>
                      {exportResult.zip_path}
                    </span>
                  </div>

                  <div className="rounded-xl bg-zinc-950/80 p-3 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase block">TARGET RUNTIME</span>
                    <span className="text-teal-400 font-bold block text-[11px]">
                      {selectedRun ? `${selectedRun.runtime} • ${selectedRun.precision.toUpperCase()}` : (exportResult.manifest?.runtime || "onnxruntime")}
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* PROMINENT "VERIFY LOCALLY" FEATURE CARD */}
              {/* ========================================================================= */}
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-zinc-900/90 to-teal-950/30 p-5 space-y-3 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                        Pre-Deployment Quality Assurance
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-zinc-100 font-sans flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      Verify Locally
                    </h4>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      <strong className="text-emerald-300">Test runs your packaged script in an isolated sandbox before copying to edge hardware.</strong>
                      <br />
                      <span className="text-zinc-400">
                        Ensures your ONNX weights load, dependencies are satisfied, and inference executes with zero errors.
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-teal-500 px-6 py-3.5 text-xs font-bold text-zinc-950 hover:brightness-110 disabled:opacity-50 shadow-lg shadow-emerald-500/25 transition-all font-sans active:scale-98"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-zinc-950" />
                        <span>Running Sandbox Smoke Test...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-zinc-950 text-zinc-950" />
                        <span>Verify Locally</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status Callout if verified */}
                {verifyResult && (
                  <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                    verifyResult.verification_status === "PASSED"
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                  }`}>
                    <span className="flex items-center gap-2 font-bold font-sans">
                      {verifyResult.verification_status === "PASSED" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          Zero-Defect Sandbox Verification Passed: Script is verified and ready for edge deployment.
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                          Verification Failed (Exit code {verifyResult.returncode}): Review terminal output below.
                        </>
                      )}
                    </span>
                    <span className="text-[10px] font-mono opacity-80">Exit Code: {verifyResult.returncode}</span>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* COPYABLE 1-LINE BASH SNIPPET */}
              {/* ========================================================================= */}
              <div className="rounded-2xl border border-teal-500/30 bg-zinc-950/90 p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-teal-400" />
                    <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                      Quickstart: Run on Edge Hardware
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">1-Line CLI</span>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Once unpacked on your target device (Jetson, Raspberry Pi, or edge camera), run this 1-line command to execute inference on an image:
                </p>

                {/* Primary 1-line bash snippet */}
                <div className="flex items-center justify-between rounded-xl border border-teal-500/40 bg-black/80 p-3 font-mono text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-teal-400 select-none">$</span>
                    <code className="text-zinc-100 font-semibold truncate">
                      python infer.py --image input.jpg
                    </code>
                  </div>
                  <CopySnippetButton text="python infer.py --image input.jpg" label="Copy Command" />
                </div>

                {/* Supplementary commands */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                    <span className="truncate">pip install -r requirements.txt</span>
                    <CopySnippetButton text="pip install -r requirements.txt" />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                    <span className="truncate">python infer.py --iterations 10</span>
                    <CopySnippetButton text="python infer.py --iterations 10" />
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* WHAT IS INSIDE THIS PACKAGE? (PLAIN ENGLISH BREAKDOWN) */}
              {/* ========================================================================= */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-teal-400" />
                    <h4 className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-wider">
                      What is inside this package?
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-teal-400">
                    {exportResult.files?.length || 4} Files Included
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans text-xs">
                  {/* model.onnx */}
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-teal-400 font-mono font-bold">
                      <Box className="h-3.5 w-3.5" />
                      <span>model.onnx</span>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      Your optimized, validated model weights and graph.
                    </p>
                  </div>

                  {/* infer.py */}
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold">
                      <FileCode className="h-3.5 w-3.5" />
                      <span>infer.py</span>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      Ready-to-run standalone Python script for edge cameras.
                    </p>
                  </div>

                  {/* requirements.txt */}
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold">
                      <Terminal className="h-3.5 w-3.5" />
                      <span>requirements.txt</span>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      Minimal Python dependencies.
                    </p>
                  </div>

                  {/* manifest.json */}
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-purple-400 font-mono font-bold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>manifest.json</span>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      Checksums and reproducibility audit trail.
                    </p>
                  </div>
                </div>

                {/* All archive files listing */}
                {exportResult.files && exportResult.files.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1.5">
                      All ZIP Archive Files ({exportResult.files.length}):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                      {exportResult.files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-2.5 py-1.5 text-[11px] text-zinc-300"
                        >
                          <FileCode className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Local Verification Sandbox Console (Terminal) */}
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
