"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Send,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
  CheckCircle2,
  Package,
  ArrowRight,
  Terminal,
  Shield,
  Activity,
  Zap,
} from "lucide-react";
import {
  ModelRecord,
  AgentResponse,
  AgentTrace,
  MetaStatus,
  chatWithAgent,
} from "@/lib/api";
import { TabType } from "./Navigation";

interface AIEngineerTabProps {
  models: ModelRecord[];
  metaStatus?: MetaStatus | null;
  onRefreshRuns?: () => void;
  setActiveTab: (tab: TabType) => void;
  onSelectRunForExport?: (modelId: string, runId: string) => void;
}

export const AIEngineerTab: React.FC<AIEngineerTabProps> = ({
  models,
  metaStatus,
  onRefreshRuns,
  setActiveTab,
  onSelectRunForExport,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.id || ""
  );

  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);
  const [prompt, setPrompt] = useState<string>(
    "My YOLO model has to stay below 30 ms and lose less than 1% mAP. Find the best available deployment configuration."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedTraceStep, setExpandedTraceStep] = useState<number | null>(null);

  const quickPrompts = [
    "My YOLO model has to stay below 30 ms and lose less than 1% mAP. Find the best available deployment configuration.",
    "Recommend the lowest power hardware target (under 15W TDP) that can achieve at least 30 FPS.",
    "Compare INT8 dynamic quantization trade-off on NVIDIA RTX 4060 vs Jetson Orin Nano.",
    "Find optimal edge device under $500 for real-time edge robotics surveillance.",
  ];

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || prompt;
    if (!textToSend.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setAgentResponse(null);

    try {
      const resp = await chatWithAgent({
        message: textToSend.trim(),
        model_id: selectedModelId || undefined,
      });
      setAgentResponse(resp);
      if (onRefreshRuns) onRefreshRuns();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to communicate with Meta AI Engineer.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTrace = (stepNumber: number) => {
    setExpandedTraceStep((prev) => (prev === stepNumber ? null : stepNumber));
  };

  const isOnline = metaStatus?.mode === "META_API_ONLINE";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-0.5 text-xs text-teal-300 font-mono shadow-sm">
                <Bot className="h-3.5 w-3.5 text-teal-400" />
                Meta Global AI Developer Hackathon 2026
              </span>

              {/* Meta Model Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-mono font-semibold ${
                  isOnline
                    ? "border-emerald-500/40 bg-emerald-950/70 text-emerald-300 shadow-sm shadow-emerald-500/10"
                    : "border-purple-500/40 bg-purple-950/70 text-purple-300 shadow-sm shadow-purple-500/10"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {metaStatus?.model || "Meta Muse Spark"} (
                {isOnline ? "Online API" : "Offline Deterministic Engine"})
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
              Autonomous Edge AI Deployment Engineer
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              Ask natural language deployment constraints. Meta AI autonomously executes tool steps
              to inspect ONNX graphs, verify hardware compatibility, evaluate Pareto frontiers, and
              prescribe optimal deployment packages.
            </p>
          </div>

          <div className="flex-shrink-0">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4 text-xs font-mono text-zinc-400 space-y-1.5 max-w-xs shadow-lg">
              <div className="text-zinc-200 font-bold flex items-center gap-1.5 font-sans">
                <Shield className="h-4 w-4 text-teal-400" /> Zero Hallucination Guarantee
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Grounds all recommendations in physical silicon benchmarks and verified ONNX operator support.
              </p>
            </div>
          </div>
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

      {/* Query Formulation Form */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-400" />
            <span className="text-xs font-mono text-zinc-300 font-medium">Target Model Context:</span>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              disabled={isLoading}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono text-zinc-200 focus:border-teal-500 focus:outline-none"
            >
              <option value="">Any Registered Model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.task_type})
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] font-mono text-zinc-400">
            Meta AI Agent Session: {agentResponse ? agentResponse.session_id.slice(0, 8) : "Ready"}
          </span>
        </div>

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="Specify your SLA constraints (e.g. latency, power, mAP retention, budget)..."
            className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-4 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 focus:outline-none leading-relaxed shadow-inner"
          />

          <div className="absolute right-3.5 bottom-4">
            <button
              onClick={() => handleSendQuery()}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 fill-zinc-950" />
                  Ask Meta AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider font-semibold">
            Quick Prompt Templates:
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(q);
                  handleSendQuery(q);
                }}
                disabled={isLoading}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900 transition-all text-left truncate max-w-md"
              >
                &ldquo;{q.slice(0, 52)}...&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Timeline Skeleton */}
      {isLoading && (
        <div className="rounded-2xl border border-teal-500/30 bg-zinc-900/50 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-mono font-semibold">
            <Activity className="h-4 w-4 animate-spin" />
            Meta AI Agent reasoning loop in progress...
          </div>
          <div className="space-y-2 text-xs font-mono text-zinc-400 pl-4 border-l-2 border-teal-500/30">
            <p className="animate-pulse">Step 1: Calling `inspect_model` to verify ONNX operator tensors...</p>
            <p className="animate-pulse delay-75">Step 2: Calling `list_hardware` to inventory online & simulated accelerators...</p>
            <p className="animate-pulse delay-150">Step 3: Evaluating Pareto frontier with user latency constraints...</p>
          </div>
        </div>
      )}

      {/* Results & Step-by-Step Observable Trace */}
      {agentResponse && (
        <div className="space-y-6">
          {/* Main Agent Reply */}
          <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-2xl border-teal-500/40">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 font-sans">
                    {agentResponse.title || "Meta AI Deployment Recommendation"}
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Mode: {agentResponse.mode} • Session: {agentResponse.session_id.slice(0, 8)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("deployments")}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all"
              >
                <Package className="h-3.5 w-3.5 fill-zinc-950" />
                Go to Export Deployment
              </button>
            </div>

            {/* Markdown Answer */}
            <div className="rounded-xl bg-zinc-950/80 p-4 text-xs font-mono text-zinc-200 leading-relaxed space-y-2 whitespace-pre-wrap border border-zinc-800/80 shadow-inner">
              {agentResponse.reply}
            </div>
          </div>

          {/* Observable Step-by-Step Execution Trace Timeline */}
          {agentResponse.traces && agentResponse.traces.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-teal-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Observable Step-by-Step Reasoning Trace ({agentResponse.traces.length} Steps)
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Full Tool Call Audit Log
                </span>
              </div>

              <div className="space-y-3">
                {agentResponse.traces.map((trace, idx) => {
                  const isExpanded = expandedTraceStep === trace.step_number;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden shadow-sm"
                    >
                      {/* Step Header */}
                      <button
                        onClick={() => toggleTrace(trace.step_number)}
                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-zinc-900/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-[10px] font-mono font-bold">
                            {trace.step_number}
                          </span>
                          <span className="text-xs font-mono font-semibold text-zinc-200">
                            {trace.tool_name || trace.role}
                          </span>
                          <span className="rounded-md bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono font-semibold text-emerald-400">
                            {trace.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-400">
                          {trace.thought && (
                            <span className="text-[11px] font-mono text-zinc-400 max-w-sm truncate hidden md:block">
                              {trace.thought}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>

                      {/* Step Content / JSON Body */}
                      {isExpanded && (
                        <div className="p-4 border-t border-zinc-800 bg-zinc-950 text-xs font-mono space-y-3">
                          {trace.thought && (
                            <div>
                              <span className="text-zinc-500 text-[10px] uppercase block mb-1 font-semibold">
                                Agent Internal Reasoning / Thought:
                              </span>
                              <p className="text-zinc-300 italic">{trace.thought}</p>
                            </div>
                          )}

                          {trace.tool_args && (
                            <div>
                              <span className="text-zinc-500 text-[10px] uppercase block mb-1 font-semibold">
                                Tool Invocation Parameters:
                              </span>
                              <pre className="rounded-xl bg-zinc-900 p-2.5 text-[11px] text-teal-300 overflow-x-auto border border-zinc-800">
                                {JSON.stringify(trace.tool_args, null, 2)}
                              </pre>
                            </div>
                          )}

                          {trace.tool_result && (
                            <div>
                              <span className="text-zinc-500 text-[10px] uppercase block mb-1 font-semibold">
                                Tool Execution Output:
                              </span>
                              <pre className="rounded-xl bg-zinc-900 p-2.5 text-[11px] text-zinc-300 max-h-48 overflow-y-auto overflow-x-auto border border-zinc-800">
                                {JSON.stringify(trace.tool_result, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
