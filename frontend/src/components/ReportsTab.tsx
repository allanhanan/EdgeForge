"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Copy,
  Check,
  Layers,
  Sparkles,
  TrendingUp,
  Cpu,
  Info,
} from "lucide-react";
import { ModelRecord, fetchModelReport } from "@/lib/api";

interface ReportsTabProps {
  models: ModelRecord[];
}

interface ReportData {
  model_id: string;
  model_name: string;
  runs_count: number;
  markdown_report: string;
  html_report?: string;
  runs: Array<{
    id: string;
    hardware_name: string;
    precision: string;
    median_latency_ms: number;
    fps: number;
    memory_mb: number;
    map50?: number;
  }>;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ models }) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.id || ""
  );
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  useEffect(() => {
    if (!selectedModelId) {
      setReportData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    fetchModelReport(selectedModelId)
      .then((data) => {
        if (isMounted) setReportData(data);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(err.message || "Failed to generate report for model.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedModelId]);

  const handleCopyMarkdown = () => {
    if (!reportData?.markdown_report) return;
    navigator.clipboard.writeText(reportData.markdown_report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!reportData?.markdown_report) return;
    const blob = new Blob([reportData.markdown_report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edgeforge-report-${reportData.model_name.toLowerCase().replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    if (!reportData) return;
    const content = reportData.html_report || reportData.markdown_report;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edgeforge-report-${reportData.model_name.toLowerCase().replace(/\s+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edgeforge-report-${reportData.model_name.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-400" />
            Executive Performance & Compliance Reports
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Auto-generate comprehensive markdown, HTML, and JSON benchmark summaries with SLA metrics and reproducibility tables.
          </p>
        </div>

        {/* Model Selector & Export Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs font-mono">
            <Layers className="h-4 w-4 text-teal-400" />
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-teal-500 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {reportData && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-200 hover:bg-zinc-700 transition-all"
                title="Copy Markdown to Clipboard"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>

              <button
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-mono text-teal-300 hover:bg-teal-500/20 transition-all"
                title="Download HTML Report"
              >
                <Download className="h-3.5 w-3.5" />
                HTML
              </button>

              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-200 hover:bg-zinc-700 transition-all"
                title="Download JSON Report"
              >
                <Download className="h-3.5 w-3.5" />
                JSON
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-teal-400 transition-all"
                title="Download Markdown Report"
              >
                <Download className="h-3.5 w-3.5" />
                Markdown (.md)
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300 font-mono">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-zinc-800 p-16 text-center text-zinc-400 space-y-2">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <p className="text-xs font-mono">Compiling benchmark audit logs and generating report...</p>
        </div>
      ) : !reportData ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center text-zinc-400 space-y-2">
          <Info className="h-8 w-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-medium text-zinc-300">No report available</p>
          <p className="text-xs font-mono">Select a model to preview generated performance documentation.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <span className="text-[10px] text-zinc-400 font-mono block">EVALUATED RUNS</span>
              <span className="text-2xl font-bold text-teal-400 font-mono mt-1 block">
                {reportData.runs_count}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">Hardware configurations</span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <span className="text-[10px] text-zinc-400 font-mono block">FASTEST LATENCY</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
                {reportData.runs.length > 0
                  ? `${Math.min(...reportData.runs.map((r) => r.median_latency_ms)).toFixed(2)} ms`
                  : "--"}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">Median P50</span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <span className="text-[10px] text-zinc-400 font-mono block">MAX THROUGHPUT</span>
              <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">
                {reportData.runs.length > 0
                  ? `${Math.max(...reportData.runs.map((r) => r.fps)).toFixed(0)} FPS`
                  : "--"}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">Edge streaming rate</span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <span className="text-[10px] text-zinc-400 font-mono block">ACCURACY EVALUATED</span>
              <span className="text-2xl font-bold text-purple-400 font-mono mt-1 block">
                {reportData.runs.some((r) => r.map50 !== null && r.map50 !== undefined) ? "mAP@50" : "Synthetic"}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">COCO-style evaluator</span>
            </div>
          </div>

          {/* Rendered Markdown View */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-zinc-200 font-mono">
                Markdown Document Preview
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono">
                Format: GitHub Flavored Markdown (GFM)
              </span>
            </div>

            <div className="rounded-lg bg-zinc-950 p-6 border border-zinc-800/80 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {reportData.markdown_report}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
