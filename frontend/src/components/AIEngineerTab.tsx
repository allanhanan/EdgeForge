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
  GitBranch,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  TrendingDown,
  Info,
  Workflow,
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

interface LineageNode {
  id: string;
  label: string;
  type: "source" | "baseline" | "success" | "regression" | "suggested";
  statusText: string;
  latencyMs?: number;
  mapPercent?: number;
  mapDropPoints?: number;
  whyAttempted: string;
  whatHappened: string;
  agentLearned: string;
  suggestedAction?: string;
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
    "Why is my model slow?"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedTraceStep, setExpandedTraceStep] = useState<number | null>(null);

  // Active view toggle: Lineage Tree vs Orchestration Plan vs Conversation
  const [activeView, setActiveView] = useState<"lineage" | "orchestration" | "chat">("lineage");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-int8");

  // Specification Quick Prompts
  const quickPrompts = [
    "I have a YOLOv8 model. I need at least 30 FPS and less than 1 percentage point mAP loss. Find the best configuration on my connected devices.",
    "Why is my model slow?",
    "Make it faster without losing accuracy.",
    "Will this run on Hailo?",
    "Why did conversion fail?",
    "What should I buy with a $300 budget?",
    "Compare my model versions.",
    "Can I reach 60 FPS on edge hardware?",
    "Deploy this configuration.",
    "Why did INT8 reduce accuracy?",
    "Which optimization should I try next?",
  ];

  // Optimization Experiment Lineage Nodes (Section 6)
  const lineageNodes: LineageNode[] = [
    {
      id: "node-root",
      label: "Original YOLO Model",
      type: "source",
      statusText: "Trained Artifact",
      latencyMs: undefined,
      mapPercent: undefined,
      whyAttempted: "Original PyTorch export of YOLOv8n object detection model for factory defect inspection.",
      whatHappened: "Exported to ONNX opset 17. Verified tensor input: [1, 3, 640, 640] with 225 ONNX operators.",
      agentLearned: "Model graph is healthy and ready for deployment sweep. Target SLA: < 30 ms latency and < 1.0 point mAP drop.",
      suggestedAction: "Run FP32 baseline on physical CPU/GPU target.",
    },
    {
      id: "node-fp32",
      label: "FP32 Baseline",
      type: "baseline",
      statusText: "Too slow",
      latencyMs: 45.0,
      mapPercent: 82.0,
      mapDropPoints: 0.0,
      whyAttempted: "Establish ground-truth latency and detection accuracy baseline on Intel Core i7 CPU.",
      whatHappened: "Measured 45.0 ms latency at 22.2 FPS. mAP@50 reached 82.0%.",
      agentLearned: "Accuracy meets requirement, but 45 ms latency violates the user's 30 ms SLA constraint by 15 ms. Quantization or pruning needed.",
      suggestedAction: "Test FP16 half-precision and INT8 quantization.",
    },
    {
      id: "node-fp16",
      label: "FP16 Half-Precision",
      type: "success",
      statusText: "Benchmark complete",
      latencyMs: 28.0,
      mapPercent: 81.8,
      mapDropPoints: 0.2,
      whyAttempted: "Evaluate 16-bit floating point inference on NVIDIA RTX 4060 Tensor Cores.",
      whatHappened: "Measured 28.0 ms median latency at 35.7 FPS. mAP retention: 81.8% (only 0.2 percentage point drop).",
      agentLearned: "FP16 satisfies both constraints (28ms < 30ms and 0.2 pt drop <= 1.0 pt limit). Safe candidate for deployment.",
      suggestedAction: "Ready for deployment package bundling.",
    },
    {
      id: "node-int8",
      label: "INT8 Quantization",
      type: "regression",
      statusText: "Accuracy regression",
      latencyMs: 22.0,
      mapPercent: 77.5,
      mapDropPoints: 4.5,
      whyAttempted: "Maximize inference speed on low-power edge accelerators via INT8 PTQ dynamic quantization.",
      whatHappened: "Latency dropped to 22.0 ms (45.4 FPS), but detection mAP degraded from 82.0% to 77.5% (-4.5 points).",
      agentLearned: "MinMax calibration aggressively clipped small bounding box activations. The 4.5 point mAP drop exceeds the acceptable 1.0 point threshold.",
      suggestedAction: "Do NOT deploy standard INT8. Try Entropy calibration with 500 calibration images.",
    },
    {
      id: "node-new-calib",
      label: "New Calibration (Entropy)",
      type: "suggested",
      statusText: "Suggested next test",
      latencyMs: 23.5,
      mapPercent: 81.2,
      mapDropPoints: 0.8,
      whyAttempted: "Mitigate activation clipping using KL-Divergence / Entropy histogram calibration with 500 defect images.",
      whatHappened: "Simulated calibration projection: Estimated 23.5 ms latency and 81.2% mAP retention (-0.8 point loss).",
      agentLearned: "Entropy calibration preserves outlier distribution, recovering ~3.7 percentage points of mAP compared to naive MinMax INT8.",
      suggestedAction: "Execute calibration run on workbench.",
    },
  ];

  const activeNode = lineageNodes.find((n) => n.id === selectedNodeId) || lineageNodes[3];

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || prompt;
    if (!textToSend.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setAgentResponse(null);
    setActiveView("chat");

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
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-6 sm:p-7 backdrop-blur-md shadow-2xl">
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
              Describe your engineering objective in natural language or explore the optimization lineage tree.
              Meta AI autonomously inspects graphs, investigates accuracy loss, and orchestrates physical testing.
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

      {/* View Switcher: Optimization Lineage Tree vs Deployment Orchestration Plan vs Interactive AI Chat */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/90 p-1 text-xs font-medium shadow-inner">
            <button
              type="button"
              onClick={() => setActiveView("lineage")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
                activeView === "lineage"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-400 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Optimization Lineage Tree
            </button>
            <button
              type="button"
              onClick={() => setActiveView("orchestration")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
                activeView === "orchestration"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-400 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Workflow className="h-3.5 w-3.5" />
              Deployment Analysis & Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveView("chat")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
                activeView === "chat"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-400 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              Interactive AI Engineer Chat
            </button>
          </div>
        </div>

        <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
          Model: {models.find((m) => m.id === selectedModelId)?.name || "YOLOv8n"}
        </span>
      </div>

      {/* DEPLOYMENT ANALYSIS & EXPERIMENT ORCHESTRATION (Section 6) */}
      {activeView === "orchestration" && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-6 shadow-2xl border border-zinc-800/80 bg-zinc-900/40">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">
                  EdgeForge AI Engineer
                </span>
                <h3 className="text-lg font-bold text-zinc-100 font-sans">
                  Deployment analysis and experiment orchestration
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Autonomous agent analyzes your deployment SLA, assesses connected devices, and formulates a targeted benchmark plan.
                </p>
              </div>

              <span className="rounded-full bg-teal-500/10 border border-teal-500/30 px-3 py-1 text-xs font-mono font-medium text-teal-300">
                Agent Orchestration Active
              </span>
            </div>

            {/* Example Session Card */}
            <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-4 space-y-2">
              <span className="text-[10px] font-mono uppercase text-teal-400 font-bold tracking-wider">
                Example session
              </span>
              <p className="text-sm font-mono text-zinc-100 italic">
                &ldquo;I have a YOLOv8 model. I need at least 30 FPS and less than 1 percentage point mAP loss. Find the best configuration on my connected devices.&rdquo;
              </p>
            </div>

            {/* Agent Activity Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
                Agent activity
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-1">
                  <div className="text-xs font-sans font-semibold text-zinc-200">Inspect model graph</div>
                  <span className="inline-block rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                    Complete
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-1">
                  <div className="text-xs font-sans font-semibold text-zinc-200">Check available hardware</div>
                  <span className="inline-block rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                    Complete
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-1">
                  <div className="text-xs font-sans font-semibold text-zinc-200">Read previous experiments</div>
                  <span className="inline-block rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                    Complete
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-1">
                  <div className="text-xs font-sans font-semibold text-zinc-200">Plan missing benchmarks</div>
                  <span className="inline-block rounded bg-teal-950/80 border border-teal-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-300">
                    Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Proposed Experiment Plan */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 font-sans">
                    Proposed experiment plan
                  </h4>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Two compatible configurations need additional measurements before a recommendation can be verified.
                  </p>
                </div>

                <span className="text-[10px] text-amber-400 font-mono bg-amber-950/50 border border-amber-500/30 px-2.5 py-1 rounded-md">
                  Actual runs should require an execution budget and appropriate authorization.
                </span>
              </div>

              {/* The 2 Candidate Configurations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">Target 1: Intel Core i7 CPU</span>
                    <span className="text-[10px] text-teal-400 border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 rounded">
                      INT8 Entropy Calibration
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Test Post-Training Quantization with 500 images to verify if latency drops under 30 ms while retaining &gt; 81.0% mAP.
                  </p>
                  <div className="text-[10px] text-zinc-500 flex justify-between pt-1 border-t border-zinc-800">
                    <span>Est. Latency: 23.5 ms</span>
                    <span>Target FPS: 42.5 FPS</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">Target 2: NVIDIA RTX 4060 GPU</span>
                    <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded">
                      TensorRT FP16
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Test half-precision TensorRT execution provider to evaluate throughput acceleration without quantization accuracy degradation.
                  </p>
                  <div className="text-[10px] text-zinc-500 flex justify-between pt-1 border-t border-zinc-800">
                    <span>Est. Latency: 28.0 ms</span>
                    <span>Target FPS: 35.7 FPS</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("I have a YOLOv8 model. I need at least 30 FPS and less than 1 percentage point mAP loss. Find the best configuration on my connected devices.");
                    setActiveView("chat");
                    handleSendQuery("I have a YOLOv8 model. I need at least 30 FPS and less than 1 percentage point mAP loss. Find the best configuration on my connected devices.");
                  }}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all font-sans"
                >
                  Explore agent workflow
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("workbench")}
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all font-sans"
                >
                  Authorize & Launch Plan in Workbench
                </button>
              </div>
            </div>

            {/* Engineering Conclusion */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                Engineering conclusion
              </span>
              <p className="text-xs font-sans text-zinc-200 leading-relaxed">
                There is insufficient evidence to select a verified winner yet. Run the proposed benchmarks, then compare measured latency and mAP.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LINEAGE TREE VIEW (Section 6 Showcase) */}
      {activeView === "lineage" && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-6 shadow-2xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">
                  Autonomous Optimization Lineage
                </span>
                <h3 className="text-lg font-bold text-zinc-100 font-sans">
                  Optimization Experiment History
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Illustrative optimization lineage showing why optimizations were attempted, what happened, and what the agent learned.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPrompt("Which optimization should I try next based on my experiment history?");
                  setActiveView("chat");
                  handleSendQuery("Which optimization should I try next based on my experiment history?");
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all font-sans"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ask AI Next Optimization
              </button>
            </div>

            {/* Visual Node Graph */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              {lineageNodes.map((node, idx) => {
                const isSelected = selectedNodeId === node.id;
                let badgeClass = "bg-zinc-800 text-zinc-300 border-zinc-700";
                if (node.type === "baseline") badgeClass = "bg-rose-950/80 text-rose-300 border-rose-500/40";
                if (node.type === "success") badgeClass = "bg-emerald-950/80 text-emerald-300 border-emerald-500/40";
                if (node.type === "regression") badgeClass = "bg-amber-950/80 text-amber-300 border-amber-500/40";
                if (node.type === "suggested") badgeClass = "bg-teal-950/80 text-teal-300 border-teal-500/40 animate-pulse";

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`relative cursor-pointer rounded-2xl p-4 transition-all duration-150 border flex flex-col justify-between ${
                      isSelected
                        ? "bg-zinc-900 border-teal-500 shadow-xl shadow-teal-500/10 ring-1 ring-teal-500/40 scale-[1.02]"
                        : "bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60"
                    }`}
                  >
                    {/* Node Header */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>Step {idx + 1}</span>
                        {node.type === "source" && <span className="text-teal-400">ROOT</span>}
                      </div>
                      <h4 className="font-bold text-sm text-zinc-100 font-sans leading-snug">
                        {node.label}
                      </h4>
                    </div>

                    {/* Node Metrics */}
                    <div className="my-3 space-y-1 font-mono text-xs">
                      {node.latencyMs !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[11px]">Latency:</span>
                          <span className="text-zinc-200 font-bold">{node.latencyMs.toFixed(1)} ms</span>
                        </div>
                      )}
                      {node.mapPercent !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[11px]">mAP@50:</span>
                          <span className="text-purple-300 font-bold">{node.mapPercent.toFixed(1)}%</span>
                        </div>
                      )}
                      {node.mapDropPoints !== undefined && node.mapDropPoints > 0 && (
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span>mAP Drop:</span>
                          <span className={node.mapDropPoints > 1.0 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                            -{node.mapDropPoints.toFixed(1)} pts
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="pt-2 border-t border-zinc-800/80">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider border ${badgeClass}`}
                      >
                        {node.statusText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Node Inspector Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider font-semibold">
                      Node Deep Investigation
                    </span>
                    <h4 className="text-base font-bold text-zinc-100 font-sans">
                      {activeNode.label} — {activeNode.statusText}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("workbench")}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all font-sans"
                  >
                    <Play className="h-3 w-3 text-teal-400" />
                    Test in Workbench
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("deployments")}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-sm shadow-teal-500/20 font-sans"
                  >
                    <Package className="h-3 w-3" />
                    Deploy Candidate
                  </button>
                </div>
              </div>

              {/* 3 Reasoning Pillars: Why Attempted, What Happened, What Agent Learned */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold block">
                    1. Why was it attempted?
                  </span>
                  <p className="text-zinc-300 leading-relaxed text-[12px]">
                    {activeNode.whyAttempted}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                    2. What happened?
                  </span>
                  <p className="text-zinc-300 leading-relaxed text-[12px]">
                    {activeNode.whatHappened}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold block">
                    3. What did the agent learn?
                  </span>
                  <p className="text-zinc-300 leading-relaxed text-[12px]">
                    {activeNode.agentLearned}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE AI CONVERSATION VIEW */}
      <div className="space-y-6">
        {/* Query Formulation Form */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl border border-zinc-800/80 bg-zinc-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-400" />
              <span className="text-xs font-mono text-zinc-300 font-medium">Model Context:</span>
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
              Session: {agentResponse ? agentResponse.session_id.slice(0, 8) : "Ready"}
            </span>
          </div>

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              placeholder="Ask an engineering question (e.g., 'Why is my model slow?', 'Why did conversion fail?', 'What should I buy?')..."
              className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-4 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 focus:outline-none leading-relaxed shadow-inner"
            />

            <div className="absolute right-3.5 bottom-4">
              <button
                type="button"
                onClick={() => handleSendQuery()}
                disabled={isLoading || !prompt.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all font-sans"
              >
                {isLoading ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 fill-zinc-950" />
                    Ask AI Engineer
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 10 Quick Prompts */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider font-semibold">
              Deployment Engineer Quick Prompts:
            </span>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(q);
                    handleSendQuery(q);
                  }}
                  disabled={isLoading}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900 transition-all text-left truncate max-w-sm"
                >
                  &ldquo;{q}&rdquo;
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
              <p className="animate-pulse">Step 1: Inspecting model architecture, opset, and tensor shapes...</p>
              <p className="animate-pulse delay-75">Step 2: Checking physical local silicon and edge hardware compatibility...</p>
              <p className="animate-pulse delay-150">Step 3: Calculating Pareto latency-accuracy trade-offs against SLA constraints...</p>
            </div>
          </div>
        )}

        {/* Results & Step-by-Step Observable Trace */}
        {agentResponse && (
          <div className="space-y-6">
            {/* Main Agent Reply */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-2xl border border-teal-500/40 bg-zinc-900/50">
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
                  type="button"
                  onClick={() => setActiveTab("deployments")}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all font-sans"
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
              <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-zinc-800/80 bg-zinc-900/40">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-teal-400" />
                    <h3 className="text-sm font-semibold text-zinc-200 font-sans">
                      Observable Tool Execution Trace ({agentResponse.traces.length} Steps)
                    </h3>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Audit Log
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
                          type="button"
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
    </div>
  );
};
