"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Sliders,
  Database,
  BarChart3,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import {
  ModelRecord,
  DatasetRecord,
  HardwareDevice,
  BenchmarkRun,
  AgentResponse,
  AgentTrace,
  MetaStatus,
  chatWithAgent,
} from "@/lib/api";
import { TabType } from "./Navigation";

interface AIEngineerTabProps {
  models: ModelRecord[];
  hardware?: HardwareDevice[];
  datasets?: DatasetRecord[];
  runs?: BenchmarkRun[];
  metaStatus?: MetaStatus | null;
  onRefreshRuns?: () => void;
  setActiveTab: (tab: TabType) => void;
  onSelectRunForExport?: (modelId: string, runId: string) => void;
  initialQuery?: string | null;
  activeGoal?: string | null;
  onClearGoal?: () => void;
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
  hardware = [],
  datasets = [],
  runs = [],
  metaStatus,
  onRefreshRuns,
  setActiveTab,
  onSelectRunForExport,
  initialQuery,
  activeGoal,
  onClearGoal,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.id || ""
  );

  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  // SLA Constraints for Auto-Injection
  const [targetLatencyMs, setTargetLatencyMs] = useState<number>(30.0);
  const [targetFps, setTargetFps] = useState<number>(30.0);
  const [maxAccuracyDropPct, setMaxAccuracyDropPct] = useState<number>(1.0);
  const [budgetUsd, setBudgetUsd] = useState<number>(300);
  const [showConstraintConfig, setShowConstraintConfig] = useState<boolean>(false);
  const [showInjectedContextDetails, setShowInjectedContextDetails] = useState<boolean>(false);
  const [showPreExecutionPlan, setShowPreExecutionPlan] = useState<boolean>(true);

  const [prompt, setPrompt] = useState<string>(
    "Why is my model slow?"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [lastInjectedContext, setLastInjectedContext] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedTraceStep, setExpandedTraceStep] = useState<number | null>(null);

  // Active view toggle: Lineage Tree vs Orchestration Plan vs Conversation
  const [activeView, setActiveView] = useState<"lineage" | "orchestration" | "chat">("chat");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-int8");

  // Track initialQuery to execute once if supplied
  const handledInitialQueryRef = useRef<string | null>(null);

  // Active Model Object
  const currentModel = models.find((m) => m.id === selectedModelId) || models[0];

  // Active Hardware List (Physical Host + Detected)
  const connectedHardware = hardware.length > 0 ? hardware : [
    {
      id: "hw-cpu-01",
      name: "Intel Core i7-13700H CPU",
      device_type: "cpu" as const,
      vendor: "Intel",
      architecture: "x86_64",
      status: "ONLINE" as const,
      is_local: true,
      memory_mb: 32768,
      tdp_watts: 45,
      cost_usd: 0,
      supported_runtimes: ["onnxruntime", "openvino"],
      supported_precisions: ["fp32", "int8"],
      telemetry_supported: false,
      details_json: {},
      detected_at: new Date().toISOString(),
    },
    {
      id: "hw-gpu-01",
      name: "NVIDIA GeForce RTX 4060 Laptop GPU",
      device_type: "gpu" as const,
      vendor: "NVIDIA",
      architecture: "Ada Lovelace",
      status: "ONLINE" as const,
      is_local: true,
      compute_tops: 120,
      memory_mb: 8192,
      tdp_watts: 35,
      cost_usd: 0,
      supported_runtimes: ["onnxruntime", "tensorrt"],
      supported_precisions: ["fp32", "fp16", "int8"],
      telemetry_supported: true,
      details_json: {},
      detected_at: new Date().toISOString(),
    },
    {
      id: "hw-npu-01",
      name: "Hailo-8 M.2 AI Acceleration Module",
      device_type: "npu" as const,
      vendor: "Hailo",
      architecture: "Structure-defined Dataflow",
      status: "SIMULATED" as const,
      is_local: false,
      compute_tops: 26,
      memory_mb: 4096,
      tdp_watts: 5,
      cost_usd: 199,
      supported_runtimes: ["hailo_dfc", "onnxruntime"],
      supported_precisions: ["int8"],
      telemetry_supported: true,
      details_json: {},
      detected_at: new Date().toISOString(),
    },
  ];

  const currentDataset = datasets.length > 0 ? datasets[0] : {
    id: "ds-defect-01",
    name: "Factory Defect Inspection Dataset (VOC2012 format)",
    num_samples: 500,
    classes: ["dent", "scratch", "burr", "crack"],
  };

  // Helper to format injected context summary
  const getContextSummary = () => {
    const modelName = currentModel?.name || "YOLOv8n";
    const opset = currentModel?.opset_version || 17;
    const hwCount = connectedHardware.length;
    return `Model: ${modelName} (Opset ${opset}) • ${hwCount} Devices Detected • SLA: Latency ≤ ${targetLatencyMs}ms, FPS ≥ ${targetFps}`;
  };

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

  // Send Query with Auto-Injected Context
  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || prompt).trim();
    if (!textToSend) return;

    setIsLoading(true);
    setErrorMsg(null);
    setAgentResponse(null);
    setActiveView("chat");

    // Assemble rich context so the user never has to copy-paste technical specs
    const modelName = currentModel?.name || "YOLOv8n";
    const modelFormat = currentModel?.format || "ONNX";
    const opset = currentModel?.opset_version || 17;
    const nodeCount = currentModel?.node_count || 225;
    const hwListStr = connectedHardware.map((h) => `${h.name} (${h.device_type})`).join(", ");
    const dsName = currentDataset?.name || "Validation Dataset";
    const dsSamples = currentDataset?.num_samples || 500;

    const contextPrefix = `${textToSend}

[EdgeForge Auto-Injected Deployment Context]
• Model: ${modelName} (${modelFormat}, Opset ${opset}, ${nodeCount} operators, input: [1, 3, 640, 640])
• Hardware Targets: ${hwListStr}
• Dataset: ${dsName} (${dsSamples} samples)
• Target SLA Constraints: Max Latency <= ${targetLatencyMs}ms, Min Throughput >= ${targetFps} FPS, Max Accuracy Drop <= ${maxAccuracyDropPct}%, Budget <= $${budgetUsd}`;

    setLastInjectedContext(
      `Model: ${modelName} (${modelFormat} Opset ${opset}) • HW: ${connectedHardware.length} targets • SLA: ≤ ${targetLatencyMs}ms, ≥ ${targetFps} FPS, drop ≤ ${maxAccuracyDropPct}%`
    );

    try {
      const resp = await chatWithAgent({
        message: contextPrefix,
        model_id: selectedModelId || undefined,
        constraints: {
          max_latency_ms: targetLatencyMs,
          min_fps: targetFps,
          max_map_drop_pct: maxAccuracyDropPct,
          budget_usd: budgetUsd,
        },
      });
      setAgentResponse(resp);
      if (onRefreshRuns) onRefreshRuns();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to communicate with Meta AI Engineer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-Execution Reasoning Strategy Generator (Explains what the AI is about to do before executing tool calls)
  const getPreExecutionPlan = (query: string) => {
    const lower = query.toLowerCase();
    if (lower.includes("error") || lower.includes("crash") || lower.includes("fail") || lower.includes("parser") || lower.includes("investigate")) {
      return [
        {
          step: 1,
          name: "Inspect ONNX Model Graph & Dynamic Operators",
          tool: "inspect_onnx_graph",
          desc: "Scan graph for unsupported operators (e.g. dynamic NonMaxSuppression opset 17) causing parser crashes.",
        },
        {
          step: 2,
          name: "Query Execution Provider Runtime Support",
          tool: "check_runtime_capabilities",
          desc: "Audit target runtime (TensorRT/CUDA) capabilities to detect operator whitelist and dynamic dimension limits.",
        },
        {
          step: 3,
          name: "Verify Model & Execution Provider Compatibility",
          tool: "check_model_compatibility",
          desc: "Test whether incompatible nodes can fall back to CPUExecutionProvider or require static shape freezing.",
        },
        {
          step: 4,
          name: "Synthesize Plain-English Root Cause & Patch",
          tool: "recommend_hardware",
          desc: "Provide exact diagnostic explanation and step-by-step instructions to eliminate compiler failure.",
        },
      ];
    }
    if (lower.includes("accura") || lower.includes("speed") || lower.includes("quantiz") || lower.includes("int8") || lower.includes("regression") || lower.includes("loss")) {
      return [
        {
          step: 1,
          name: "Inspect Tensor Dynamic Ranges & Clipping Outliers",
          tool: "inspect_model",
          desc: "Identify activation tensors clipped by naive MinMax calibration that led to the 4.5 pt mAP drop.",
        },
        {
          step: 2,
          name: "Audit Calibration Dataset Distribution",
          tool: "inspect_dataset",
          desc: "Verify 500 defect inspection images for representative bounding box scales and class balance.",
        },
        {
          step: 3,
          name: "Simulate Advanced Entropy / KL-Divergence PTQ",
          tool: "optimize_model",
          desc: "Evaluate Entropy histogram calibration and per-channel quantization to recover mAP while maintaining 22ms latency.",
        },
        {
          step: 4,
          name: "Synthesize Speed vs Accuracy Pareto Strategy",
          tool: "recommend_hardware",
          desc: "Deliver verified recommendation to recover detection accuracy without sacrificing edge throughput.",
        },
      ];
    }
    if (lower.includes("hardware") || lower.includes("buy") || lower.includes("budget") || lower.includes("device") || lower.includes("sizing") || lower.includes("procure")) {
      return [
        {
          step: 1,
          name: "Catalog Connected & Available Edge Silicon",
          tool: "list_hardware",
          desc: "Inventory Intel CPU, NVIDIA GPU, and Hailo-8 NPU with published silicon unit pricing ($0 to $199).",
        },
        {
          step: 2,
          name: "Query Empirical Physical Benchmark Telemetry",
          tool: "list_existing_benchmarks",
          desc: "Gather median latency (P50), tail latency (P95), throughput FPS, and verified power draw telemetry.",
        },
        {
          step: 3,
          name: "Compute Multi-Objective Pareto Frontier",
          tool: "recommend_hardware",
          desc: "Filter devices satisfying latency ≤ 30ms, throughput ≥ 30 FPS, and silicon budget ≤ $300.",
        },
        {
          step: 4,
          name: "Deliver Grounded Procurement Verdict",
          tool: "recommend_hardware",
          desc: "Rank candidates by throughput-per-dollar and recommend the optimal hardware configuration.",
        },
      ];
    }
    // Default: Explain Results & Benchmarking Interpretation
    return [
      {
        step: 1,
        name: "Inspect Model Architecture & Target Opset",
        tool: "inspect_model",
        desc: "Examine YOLOv8n ONNX opset 17 specifications, input shape [1, 3, 640, 640], and operator topology.",
      },
      {
        step: 2,
        name: "Audit Execution Providers & Hardware Registry",
        tool: "list_hardware",
        desc: "Catalog available execution providers (CPU, CUDA, TensorRT) across all detected physical devices.",
      },
      {
        step: 3,
        name: "Compare Measured Telemetry Against 30ms SLA",
        tool: "compare_runs",
        desc: "Evaluate 45ms CPU vs 28ms GPU vs 22ms INT8 against real-time camera constraints (30ms / 30 FPS).",
      },
      {
        step: 4,
        name: "Synthesize Plain-English Result Interpretation",
        tool: "recommend_hardware",
        desc: "Explain operational trade-offs, camera multiplexing capacity, and provide production deployment guidance.",
      },
    ];
  };

  // Handle external initialQuery prop
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      const clean = initialQuery.replace(/__\d+$/, "");
      if (handledInitialQueryRef.current !== initialQuery) {
        handledInitialQueryRef.current = initialQuery;
        setPrompt(clean);
        setActiveView("chat");
        handleSendQuery(clean);
      }
    }
  }, [initialQuery]);

  const toggleTrace = (stepNumber: number) => {
    setExpandedTraceStep((prev) => (prev === stepNumber ? null : stepNumber));
  };

  // Plain-English Explanation of Tool Calls
  const getToolActionExplanation = (toolName?: string) => {
    switch (toolName) {
      case "inspect_model":
        return "The AI is inspecting the model's ONNX file header to verify input tensor dimensions [1, 3, 640, 640], opset 17 compatibility, and SHA256 integrity.";
      case "inspect_onnx_graph":
        return "The AI is performing deep computational graph traversal across all 225 nodes, identifying convolution and activation patterns for edge compilation.";
      case "inspect_dataset":
        return "The AI is auditing calibration images, annotation classes, and bounding box distributions to prepare for INT8 quantization.";
      case "list_hardware":
        return "The AI is scanning your local system bus and PCIe devices to catalog available execution targets and audit power telemetry sensors.";
      case "check_runtime_capabilities":
        return "The AI is querying device execution providers (CPUExecutionProvider, CUDAExecutionProvider, TensorRT) and supported precision formats.";
      case "check_model_compatibility":
        return "The AI is validating that all 225 operators in YOLOv8n are natively supported by the target runtime to prevent runtime crashes.";
      case "benchmark_model":
        return "The AI is executing measured warmup and inference loops on physical silicon to record true median latency (P50), tail latency (P95), and RAM usage.";
      case "optimize_model":
        return "The AI is applying post-training quantization (PTQ) to compress weights from 32-bit floats to 8-bit integers, evaluating size vs speedup.";
      case "recommend_hardware":
        return "The AI is calculating the Pareto efficiency frontier to select the device that meets your latency SLA with minimal silicon unit cost.";
      case "export_deployment":
        return "The AI is bundling validated weights, runtime dependencies, and verification checksums into a standalone production package.";
      case "verify_deployment":
        return "The AI is verifying package integrity and executing test inferences on the target deployment host.";
      default:
        return `The AI is executing ${toolName || "reasoning step"} to gather empirical evidence for this deployment recommendation.`;
    }
  };

  const isOnline = metaStatus?.mode === "META_API_ONLINE";

  // Contextual Trigger Handlers for the 4 core UX hooks
  const handleTriggerCompilerCrash = () => {
    const q =
      "Ask EdgeForge AI to investigate this error: TensorRT ONNX Parser failed on node NonMaxSuppression_225 (opset 17 with dynamic shape). Diagnose why the compiler crashed, identify the incompatible operator, and provide the exact fix.";
    setPrompt(q);
    handleSendQuery(q);
  };

  const handleTriggerAccuracyRecovery = () => {
    const q =
      "Find ways to improve accuracy while retaining speed: INT8 quantization caused a 4.5 percentage point mAP regression on YOLOv8n (from 82.0% to 77.5%), although inference time dropped to 22ms. Explain how to recover accuracy using Entropy calibration, per-channel quantization, or mixed precision while preserving the 22ms speed.";
    setPrompt(q);
    handleSendQuery(q);
  };

  const handleTriggerExplainResults = () => {
    const q =
      "Ask EdgeForge AI to explain these results: Analyze the latest benchmark results for YOLOv8n across Intel Core i7 (45ms), NVIDIA RTX 4060 (28ms), and INT8 quantization (22ms). Explain in plain English whether the real-time 30ms SLA is met, what the throughput differences mean for camera feeds, and what the trade-offs are.";
    setPrompt(q);
    handleSendQuery(q);
  };

  const handleTriggerHardwareSizing = () => {
    const q =
      "Ask EdgeForge AI to identify the best hardware for my requirements: Target latency <= 30ms, throughput >= 30 FPS, budget <= $300. Evaluate connected devices (Intel Core i7, NVIDIA RTX 4060, Hailo-8) against my SLA, rank Pareto candidates, and explain the best choice.";
    setPrompt(q);
    handleSendQuery(q);
  };

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
              Ask engineering questions in natural language. EdgeForge AI autonomously injects model
              topologies, checks compiler compatibility, and guides your hardware selection.
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

      {activeGoal === "optimize-model" && (
        <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/60 via-zinc-900/90 to-zinc-950 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">
                  Active Goal: Optimize my model
                </span>
                <span className="rounded bg-purple-500/20 text-purple-200 text-[10px] px-2 py-0.2 font-mono">
                  AI Optimization
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-sans">
                I want better performance without unacceptable accuracy loss.
              </h3>
              <p className="text-xs text-zinc-300 font-sans">
                Ask the Meta AI Engineer below to find optimal INT8 and TensorRT configs that stay within acceptable mAP loss limits:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendQuery("Optimize YOLOv8n for lowest latency with < 1.0 mAP accuracy drop")}
                  className="rounded-lg border border-purple-500/30 bg-purple-950/60 hover:bg-purple-900/60 px-2.5 py-1 text-[11px] text-purple-200 font-sans font-medium transition-colors"
                >
                  ⚡ Optimize for lowest latency (&lt; 1.0 mAP drop)
                </button>
                <button
                  type="button"
                  onClick={() => handleSendQuery("Quantize model using INT8 dynamic calibration and compare against FP32")}
                  className="rounded-lg border border-teal-500/30 bg-teal-950/60 hover:bg-teal-900/60 px-2.5 py-1 text-[11px] text-teal-200 font-sans font-medium transition-colors"
                >
                  🧪 Test INT8 Quantization
                </button>
                <button
                  type="button"
                  onClick={() => handleSendQuery("Audit model for TensorRT execution on NVIDIA RTX 4060 GPU")}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[11px] text-zinc-200 font-sans font-medium transition-colors"
                >
                  🔍 Audit GPU TensorRT
                </button>
              </div>
            </div>
          </div>
          {onClearGoal && (
            <button
              onClick={onClearGoal}
              className="rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white transition-all font-mono self-end sm:self-center shrink-0"
            >
              Exit Goal
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/80 via-zinc-900 to-zinc-950 p-4 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-rose-200 block font-sans">Compiler / Runtime Execution Error Encountered</span>
              <span className="text-[11px] text-rose-300/90">{errorMsg}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleTriggerCompilerCrash}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-900/60 hover:bg-rose-800/80 text-white px-3.5 py-1.5 text-xs font-bold font-sans transition-all shadow-sm"
            >
              <Terminal className="h-3.5 w-3.5 text-rose-200" />
              Ask EdgeForge AI to investigate this error
            </button>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="rounded-lg p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4 CORE CONTEXTUAL AI ASSISTANCE HOOKS                          */}
      {/* ============================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-teal-400 font-bold tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Contextual AI Assistance Hub (One-Click Engineering Hooks)
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            Pre-configured with full model, dataset, & hardware telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Hook 1: Compiler Crash Investigation */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-2.5 shadow-md">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="text-teal-400 font-bold">Diagnostics</span>
                <span className="rounded bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.2 text-[9px] text-rose-300">
                  Parser Crash
                </span>
              </div>
              <h4 className="text-xs font-bold text-zinc-100 font-sans mt-1">
                Investigate Compiler Crash
              </h4>
              <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-snug">
                TensorRT parser failed on dynamic NonMaxSuppression opset 17.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTriggerCompilerCrash}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-950/40 py-1.5 px-2.5 text-xs font-semibold text-teal-300 hover:bg-teal-900/60 hover:text-white transition-all font-sans"
            >
              <Terminal className="h-3 w-3" />
              Ask EdgeForge AI to investigate this error
            </button>
          </div>

          {/* Hook 2: Quantization Regression */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-2.5 shadow-md">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="text-amber-400 font-bold">Optimization</span>
                <span className="rounded bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 text-[9px] text-amber-300">
                  -4.5 pts mAP
                </span>
              </div>
              <h4 className="text-xs font-bold text-zinc-100 font-sans mt-1">
                Recover Quantization Accuracy
              </h4>
              <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-snug">
                INT8 dropped latency to 22ms but caused detection quality loss.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTriggerAccuracyRecovery}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/40 py-1.5 px-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/60 hover:text-white transition-all font-sans"
            >
              <TrendingUp className="h-3 w-3" />
              Find ways to improve accuracy while retaining speed
            </button>
          </div>

          {/* Hook 3: Explain Results */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2.5 shadow-md">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="text-emerald-400 font-bold">Analysis</span>
                <span className="rounded bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] text-emerald-300">
                  Benchmark Run
                </span>
              </div>
              <h4 className="text-xs font-bold text-zinc-100 font-sans mt-1">
                Plain-English Results Explanation
              </h4>
              <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-snug">
                Evaluate trade-offs between 45ms CPU vs 28ms GPU vs 22ms INT8.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTriggerExplainResults}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 py-1.5 px-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 hover:text-white transition-all font-sans"
            >
              <BarChart3 className="h-3 w-3" />
              Ask EdgeForge AI to explain these results
            </button>
          </div>

          {/* Hook 4: Hardware Sizing & Procurement */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-2.5 shadow-md">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="text-purple-400 font-bold">Procurement</span>
                <span className="rounded bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.2 text-[9px] text-purple-300">
                  $300 Budget
                </span>
              </div>
              <h4 className="text-xs font-bold text-zinc-100 font-sans mt-1">
                Identify Optimal Hardware
              </h4>
              <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-snug">
                Rank Pareto efficiency of Intel CPU vs RTX 4060 vs Hailo-8.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTriggerHardwareSizing}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 py-1.5 px-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-900/60 hover:text-white transition-all font-sans"
            >
              <Cpu className="h-3 w-3" />
              Ask EdgeForge AI to identify the best hardware for my requirements
            </button>
          </div>
        </div>
      </div>

      {/* View Switcher: Interactive AI Chat vs Optimization Lineage Tree vs Deployment Plan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/90 p-1 text-xs font-medium shadow-inner">
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
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-400">Context Active:</span>
          <span className="rounded px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-teal-300 font-semibold truncate max-w-[200px]">
            {currentModel?.name || "YOLOv8n"}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: INTERACTIVE AI CONVERSATION VIEW (DEFAULT)             */}
      {/* ============================================================== */}
      {activeView === "chat" && (
        <div className="space-y-6">
          {/* Query Formulation & Auto-Context Hub */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl border border-zinc-800/80 bg-zinc-900/40">
            {/* Context Hub Strip: Model, Hardware, Dataset, Constraints */}
            <div className="rounded-xl border border-teal-500/30 bg-zinc-950/80 p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2 text-xs text-teal-300 font-bold font-mono">
                  <Layers className="h-4 w-4 text-teal-400" />
                  <span>Auto-Injected Deployment Context</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    (Automatically attached to every query — no copy-pasting required)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConstraintConfig((prev) => !prev)}
                  className="text-[11px] font-mono text-teal-400 hover:text-teal-200 flex items-center gap-1"
                >
                  <Sliders className="h-3 w-3" />
                  {showConstraintConfig ? "Close Constraints" : "Configure Constraints (SLA)"}
                </button>
              </div>

              {/* Context Summary Badges */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300">
                  <span className="text-zinc-500">Model:</span>
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    disabled={isLoading}
                    className="bg-transparent text-teal-300 font-semibold focus:outline-none cursor-pointer"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id} className="bg-zinc-950 text-zinc-200">
                        {m.name} ({m.format.toUpperCase()} opset {m.opset_version || 17})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300">
                  <span className="text-zinc-500">Hardware:</span>{" "}
                  <span className="text-emerald-300 font-semibold">
                    {connectedHardware.length} targets detected
                  </span>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300">
                  <span className="text-zinc-500">Dataset:</span>{" "}
                  <span className="text-purple-300 font-semibold">
                    {currentDataset.name.split(" ")[0]} ({currentDataset.num_samples} samples)
                  </span>
                </div>

                <div className="rounded-lg border border-teal-500/30 bg-teal-950/40 px-2.5 py-1 text-teal-300">
                  <span className="text-teal-400 font-bold">Target SLA:</span> Latency &le; {targetLatencyMs}ms &bull; FPS &ge; {targetFps}
                </div>
              </div>

              {/* Inline Constraints Configurator */}
              {showConstraintConfig && (
                <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-zinc-400 text-[10px]">Max Latency (ms):</span>
                    <input
                      type="number"
                      value={targetLatencyMs}
                      onChange={(e) => setTargetLatencyMs(Number(e.target.value) || 30)}
                      className="w-full rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-teal-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-400 text-[10px]">Min Throughput (FPS):</span>
                    <input
                      type="number"
                      value={targetFps}
                      onChange={(e) => setTargetFps(Number(e.target.value) || 30)}
                      className="w-full rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-emerald-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-400 text-[10px]">Max mAP Drop (% pts):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={maxAccuracyDropPct}
                      onChange={(e) => setMaxAccuracyDropPct(Number(e.target.value) || 1.0)}
                      className="w-full rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-purple-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-400 text-[10px]">Silicon Budget ($ USD):</span>
                    <input
                      type="number"
                      value={budgetUsd}
                      onChange={(e) => setBudgetUsd(Number(e.target.value) || 300)}
                      className="w-full rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-amber-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Contextual Hook: After Benchmarking Results Available */}
            {runs && runs.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-sans text-zinc-300">
                  <BarChart3 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>Recent Benchmark Results:</strong> {runs.length} runs verified across detected hardware targets.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerExplainResults}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/80 transition-all font-sans shrink-0"
                >
                  <Sparkles className="h-3 w-3" />
                  Ask EdgeForge AI to explain these results
                </button>
              </div>
            )}

            {/* Text Input Area */}
            <div className="relative">
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                placeholder="Ask an engineering question (e.g., 'Why is my model slow?', 'Can this run on Hailo?', 'What should I buy?')..."
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

            {/* Pre-Execution Plan Preview: Explains what the AI is about to do before executing tool calls */}
            <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-sans font-bold text-teal-300">
                  <Activity className="h-4 w-4 text-teal-400" />
                  <span>Explain what EdgeForge AI is about to do: Planned Tool &amp; Reasoning Sequence</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreExecutionPlan((prev) => !prev)}
                  className="text-[11px] font-mono text-teal-400 hover:text-teal-200 flex items-center gap-1"
                >
                  {showPreExecutionPlan ? "Hide Pre-Execution Plan" : "Show Pre-Execution Plan"}
                </button>
              </div>

              {showPreExecutionPlan && (
                <div className="space-y-2 pt-1 border-t border-teal-500/20">
                  <p className="text-[11px] text-zinc-300 font-sans">
                    Before executing tool calls, EdgeForge AI pre-plans an observable reasoning sequence tailored to your objective:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {getPreExecutionPlan(prompt).map((step) => (
                      <div
                        key={step.step}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-teal-400">
                          <span className="font-bold">Step {step.step}</span>
                          <span className="text-zinc-500 font-mono text-[9px] truncate max-w-[100px]">{step.tool}</span>
                        </div>
                        <h6 className="font-bold text-zinc-200 text-[11px] font-sans leading-snug">
                          {step.name}
                        </h6>
                        <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts Strip */}
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

          {/* ============================================================== */}
          {/* WHAT THE AI IS ABOUT TO DO: ACTIVE EXECUTION SEQUENCE          */}
          {/* ============================================================== */}
          {isLoading && (
            <div className="rounded-2xl border border-teal-500/40 bg-zinc-900/70 p-6 space-y-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-teal-400 text-xs font-mono font-bold">
                  <Activity className="h-4 w-4 animate-spin text-teal-400" />
                  <span>What EdgeForge AI is about to do: Planned Execution Sequence</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  Step-by-step observable reasoning
                </span>
              </div>

              <div className="space-y-3 text-xs font-sans">
                {getPreExecutionPlan(prompt).map((step, idx) => (
                  <div
                    key={step.step}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                      idx === 0
                        ? "border-teal-500/30 bg-teal-950/30 ring-1 ring-teal-500/20"
                        : "border-zinc-800 bg-zinc-950/60"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                        idx === 0
                          ? "bg-teal-500/20 text-teal-300"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {step.step}
                    </span>
                    <div>
                      <h5 className="font-bold text-zinc-200">
                        Step {step.step}: {step.name}
                      </h5>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results & Step-by-Step Observable Trace */}
          {agentResponse && (
            <div className="space-y-6">
              {/* Main Agent Reply */}
              <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-2xl border border-teal-500/40 bg-zinc-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 font-sans">
                        {agentResponse.title || "EdgeForge AI Deployment Recommendation"}
                      </h3>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Mode: {agentResponse.mode} &bull; Session: {agentResponse.session_id.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("workbench")}
                      className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all font-sans"
                    >
                      Run Benchmark in Workbench
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("deployments")}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all font-sans"
                    >
                      <Package className="h-3.5 w-3.5 fill-zinc-950" />
                      Export Deployment
                    </button>
                  </div>
                </div>

                {/* Grounding Context Capsule */}
                {lastInjectedContext && (
                  <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-2.5 text-[11px] font-mono text-zinc-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-teal-300">
                      <Shield className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
                      <span className="font-semibold">Context Injected:</span> {lastInjectedContext}
                    </div>
                    <span className="rounded bg-teal-500/10 border border-teal-500/30 px-2 py-0.2 text-[9px] text-teal-300 uppercase font-bold flex-shrink-0">
                      Zero Hallucination
                    </span>
                  </div>
                )}

                {/* Markdown / Plain-English Answer */}
                <div className="rounded-xl bg-zinc-950/80 p-5 text-xs font-mono text-zinc-200 leading-relaxed space-y-2 whitespace-pre-wrap border border-zinc-800/80 shadow-inner">
                  {agentResponse.reply}
                </div>
              </div>

              {/* ============================================================== */}
              {/* OBSERVABLE STEP-BY-STEP TOOL EXECUTION TRACE TIMELINE          */}
              {/* ============================================================== */}
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
                      Audit Log &bull; Verified Telemetry
                    </span>
                  </div>

                  <div className="space-y-3">
                    {agentResponse.traces.map((trace, idx) => {
                      const isExpanded = expandedTraceStep === trace.step_number;
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden shadow-sm space-y-2"
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

                          {/* Plain-English "What the AI did in this step" Box */}
                          <div className="px-3.5 pb-2 text-[11px] font-sans text-teal-300/90 flex items-start gap-1.5">
                            <Info className="h-3.5 w-3.5 text-teal-400 mt-0.5 flex-shrink-0" />
                            <span>
                              <strong>What the AI did:</strong> {getToolActionExplanation(trace.tool_name)}
                            </span>
                          </div>

                          {/* Step Details / Parameters & Outputs */}
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
      )}

      {/* ============================================================== */}
      {/* VIEW 2: OPTIMIZATION LINEAGE TREE VIEW (PRESERVED & ENHANCED)  */}
      {/* ============================================================== */}
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerExplainResults}
                  className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-950/40 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-900/60 transition-all font-sans"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Ask EdgeForge AI to explain these results
                </button>
                <button
                  type="button"
                  onClick={handleTriggerAccuracyRecovery}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-950/80 transition-all font-sans"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Find ways to improve accuracy while retaining speed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("Which optimization should I try next based on my experiment history?");
                    setActiveView("chat");
                    handleSendQuery("Which optimization should I try next based on my experiment history?");
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all font-sans"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Ask AI Next Optimization
                </button>
              </div>
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

                    {/* Direct Contextual Hook on INT8 Regression Node */}
                    {node.id === "node-int8" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerAccuracyRecovery();
                        }}
                        className="mt-2.5 w-full flex items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/60 hover:bg-amber-900/80 py-1.5 px-2 text-[10px] font-bold text-amber-300 transition-all font-sans shadow-sm"
                      >
                        <TrendingUp className="h-3 w-3" />
                        Find ways to improve accuracy while retaining speed
                      </button>
                    )}
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
                  {activeNode.id === "node-int8" && (
                    <button
                      type="button"
                      onClick={handleTriggerAccuracyRecovery}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/60 font-sans"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      Find ways to improve accuracy while retaining speed
                    </button>
                  )}
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

      {/* ============================================================== */}
      {/* VIEW 3: DEPLOYMENT ANALYSIS & PLAN (PRESERVED & ENHANCED)       */}
      {/* ============================================================== */}
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerExplainResults}
                  className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-950/40 px-3.5 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-900/60 font-sans transition-all"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Ask EdgeForge AI to explain these results
                </button>
                <button
                  type="button"
                  onClick={handleTriggerHardwareSizing}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3.5 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-900/60 font-sans transition-all"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Ask EdgeForge AI to identify the best hardware for my requirements
                </button>
              </div>
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
                    const q = "I have a YOLOv8 model. I need at least 30 FPS and less than 1 percentage point mAP loss. Find the best configuration on my connected devices.";
                    setPrompt(q);
                    setActiveView("chat");
                    handleSendQuery(q);
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
    </div>
  );
};
