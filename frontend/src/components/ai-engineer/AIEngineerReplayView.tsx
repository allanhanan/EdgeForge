"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Terminal,
  Shield,
  GitBranch,
  Check,
  Copy,
  Sparkles,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Activity,
  FileCode,
  Box,
  Server,
  Layers3,
  Clock,
  Sliders,
  Download,
} from "lucide-react";
import {
  JETSON_REPLAY_SCENARIO,
} from "./AIEngineerReplayData";
import { TabType } from "../Navigation";
import { useReplay } from "@/components/replay";

export type ReplayViewTab = "chat" | "lineage" | "decisions" | "plan";

interface AIEngineerReplayViewProps {
  activeView: ReplayViewTab;
  setActiveView: (view: ReplayViewTab) => void;
  setActiveTab: (tab: TabType) => void;
  onSelectRunForExport?: (modelId: string, runId: string) => void;
  onExitReplay: () => void;
}

// Robust cross-browser clipboard copy with fallback
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
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

const CopyButton: React.FC<{ text: string; label?: string }> = ({
  text,
  label = "Copy",
}) => {
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
      className="inline-flex items-center gap-1 rounded-sm border border-[#2c3235] bg-[#1f2328] px-2 py-0.5 text-[11px] font-mono text-[#ccccdc] hover:bg-[#262b32] hover:text-white transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-[#73bf69]" />
          <span className="text-[#73bf69]">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 text-[#8e8e9e]" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export const AIEngineerReplayView: React.FC<AIEngineerReplayViewProps> = ({
  activeView,
  setActiveView,
  setActiveTab,
  onSelectRunForExport,
  onExitReplay,
}) => {
  const scenario = JETSON_REPLAY_SCENARIO;

  // Global Replay context integration
  const {
    isReplayMode,
    isPlaying: globalIsPlaying,
    playbackSpeed: globalSpeed,
    togglePlayPause: globalTogglePlayPause,
    setSpeed: globalSetSpeed,
  } = useReplay();

  // Mode: Standalone (isolated local control) vs Linked to Global Walkthrough
  const [isLinkedToWalkthrough, setIsLinkedToWalkthrough] = useState<boolean>(isReplayMode);

  // Stages:
  // 0: Prompt & Constraints Injected
  // 1: Agent Thinking & Reasoning Stream
  // 2: Tool 1 (inspect_model_graph)
  // 3: Tool 2 (query_benchmark_telemetry)
  // 4: Tool 3 (run_int8_quantization_plan)
  // 5: Tool 4 (generate_edge_deployment_manifest)
  // 6: Final Synthesis & Recommendations
  const MAX_STAGES = 6;
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 5x

  // Inspection states
  const [expandedToolStep, setExpandedToolStep] = useState<number | null>(1);
  const [activeToolTab, setActiveToolTab] = useState<Record<number, "args" | "stdout" | "output">>({
    1: "stdout",
    2: "stdout",
    3: "stdout",
    4: "stdout",
  });
  const [selectedLineageId, setSelectedLineageId] = useState<string>("lineage-deploy-ready");

  // Streaming text simulation for reasoning tokens
  const [streamedText, setStreamedText] = useState<string>("");
  const fullReasoningText = useMemo(
    () => scenario.reasoningStreamTokens.join(""),
    [scenario.reasoningStreamTokens]
  );

  // Sync with global walkthrough if linked
  useEffect(() => {
    if (isLinkedToWalkthrough && isReplayMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaying(globalIsPlaying);
      if ([0.5, 1, 2, 5].includes(globalSpeed)) {
        setPlaybackSpeed(globalSpeed);
      }
    }
  }, [isLinkedToWalkthrough, isReplayMode, globalIsPlaying, globalSpeed]);

  // Stage timer with stage-dependent durations
  useEffect(() => {
    if (!isPlaying) return;
    if (currentStage >= MAX_STAGES) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaying(false);
      return;
    }

    // Stage 1 duration is designed to accommodate the character typing stream
    let durationMs: number;
    switch (currentStage) {
      case 0:
        durationMs = 1400 / playbackSpeed;
        break;
      case 1:
        // Reason stream duration: approx 2200ms at 1x so typing finishes smoothly
        durationMs = 2400 / playbackSpeed;
        break;
      case 2:
      case 3:
      case 5:
        durationMs = 2200 / playbackSpeed;
        break;
      case 4:
        durationMs = 2600 / playbackSpeed;
        break;
      default:
        durationMs = 2200 / playbackSpeed;
    }

    const timer = setTimeout(() => {
      setCurrentStage((prev) => {
        const next = prev + 1;
        if (next >= MAX_STAGES) {
          setIsPlaying(false);
        }
        // Auto-expand latest tool
        if (next >= 2 && next <= 5) {
          setExpandedToolStep(next - 1);
        } else if (next === 6) {
          setExpandedToolStep(4);
        }
        return next;
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStage, playbackSpeed, MAX_STAGES]);

  // Stream text typing animation when in stage 1
  useEffect(() => {
    if (currentStage === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStreamedText("");
      return;
    }
    if (currentStage >= 2) {
      setStreamedText(fullReasoningText);
      return;
    }

    // Stream reasoning text during stage 1 (16 chars every 30ms scaled by playbackSpeed)
    let charIndex = 0;
    const intervalTime = Math.max(8, Math.round(30 / playbackSpeed));
    const charsPerStep = 16;
    const streamInterval = setInterval(() => {
      charIndex += charsPerStep;
      if (charIndex >= fullReasoningText.length) {
        setStreamedText(fullReasoningText);
        clearInterval(streamInterval);
      } else {
        setStreamedText(fullReasoningText.slice(0, charIndex));
      }
    }, intervalTime);

    return () => clearInterval(streamInterval);
  }, [currentStage, fullReasoningText, playbackSpeed]);

  const toggleToolExpanded = (step: number) => {
    setExpandedToolStep((prev) => (prev === step ? null : step));
  };

  const handleToolTabChange = (step: number, tab: "args" | "stdout" | "output") => {
    setActiveToolTab((prev) => ({ ...prev, [step]: tab }));
  };

  // Skip to end
  const handleSkipToEnd = () => {
    setCurrentStage(MAX_STAGES);
    setIsPlaying(false);
    setStreamedText(fullReasoningText);
    setExpandedToolStep(4);
  };

  // Restart replay cleanly
  const handleRestart = () => {
    setCurrentStage(0);
    setStreamedText("");
    setExpandedToolStep(null);
    setIsPlaying(true);
  };

  // Step forward
  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStage((prev) => {
      const next = Math.min(MAX_STAGES, prev + 1);
      if (next >= 2 && next <= 5) {
        setExpandedToolStep(next - 1);
      } else if (next === 6) {
        setExpandedToolStep(4);
      }
      return next;
    });
  };

  // Step backward
  const handleStepBackward = () => {
    setIsPlaying(false);
    setCurrentStage((prev) => {
      const prevStage = Math.max(0, prev - 1);
      if (prevStage >= 2 && prevStage <= 5) {
        setExpandedToolStep(prevStage - 1);
      } else {
        setExpandedToolStep(null);
      }
      return prevStage;
    });
  };

  // Visible tools based on stage
  const visibleTools = useMemo(() => {
    return scenario.tools.filter((t) => currentStage >= t.stepNumber + 1);
  }, [scenario.tools, currentStage]);

  // Selected lineage node
  const activeLineageNode = useMemo(() => {
    return (
      scenario.lineageNodes.find((n) => n.id === selectedLineageId) ||
      scenario.lineageNodes[scenario.lineageNodes.length - 1]
    );
  }, [scenario.lineageNodes, selectedLineageId]);

  // Compute status summary
  const currentStageLabel = useMemo(() => {
    switch (currentStage) {
      case 0:
        return "Stage 0/6 · Goal Ingestion & Parameter Injection";
      case 1:
        return "Stage 1/6 · Agent Reasoning & Constraint Analysis";
      case 2:
        return "Stage 2/6 · Tool 1: inspect_model_graph (ONNX Graph Audit)";
      case 3:
        return "Stage 3/6 · Tool 2: query_benchmark_telemetry (Jetson Telemetry)";
      case 4:
        return "Stage 4/6 · Tool 3: run_int8_quantization_plan (Entropy Calibration)";
      case 5:
        return "Stage 5/6 · Tool 4: generate_edge_deployment_manifest (Bundling)";
      case 6:
        return "Stage 6/6 · Session Complete · Deployment Package Certified";
      default:
        return "Replay Active";
    }
  }, [currentStage]);

  // Current real-time agent status
  const currentAgentStatus = useMemo(() => {
    switch (currentStage) {
      case 0:
        return {
          code: "INGESTING_CONSTRAINTS",
          label: "Ingesting Robotic Inspection Constraints",
          color: "text-[#5794f2]",
        };
      case 1:
        return {
          code: "STREAMING_REASONING_TOKENS",
          label: "Formulating Multi-Phase Optimization Sweep",
          color: "text-[#5794f2]",
        };
      case 2:
        return {
          code: "EXECUTING_TOOL: inspect_model_graph",
          label: "Auditing ONNX Graph & Convolution Kernels",
          color: "text-[#f59f00]",
        };
      case 3:
        return {
          code: "EXECUTING_TOOL: query_benchmark_telemetry",
          label: "Querying Physical Jetson Orin Nano Telemetry",
          color: "text-[#f59f00]",
        };
      case 4:
        return {
          code: "EXECUTING_TOOL: run_int8_quantization_plan",
          label: "Running KL-Divergence Entropy Calibration",
          color: "text-[#73bf69]",
        };
      case 5:
        return {
          code: "EXECUTING_TOOL: generate_edge_deployment_manifest",
          label: "Synthesizing Zero-Copy TensorRT Edge Bundle",
          color: "text-[#73bf69]",
        };
      case 6:
        return {
          code: "OPTIMIZATION_CERTIFIED",
          label: "Deployment Package Certified (94.2% mAP retained, 3.8x speedup)",
          color: "text-emerald-400",
        };
      default:
        return {
          code: "REPLAY_ACTIVE",
          label: "Autonomous Engineer Active",
          color: "text-white",
        };
    }
  }, [currentStage]);

  const handleExportToDeployments = useCallback(() => {
    if (onSelectRunForExport) {
      onSelectRunForExport("edge-tiny-yolo-int8", "run-jetson-int8-005");
    }
    setActiveTab("deployments");
  }, [onSelectRunForExport, setActiveTab]);

  return (
    <div className="space-y-4 text-[#ccccdc] font-sans">
      {/* ========================================================================= */}
      {/* 1. REPLAY CONTROLLER & TELEMETRY BANNER (Grafana workstation style)       */}
      {/* ========================================================================= */}
      <div className="border border-[#5794f2]/40 bg-[#141619] rounded-sm p-4 space-y-3 shadow-lg relative overflow-hidden">
        {/* Glow ambient background accent */}
        <div className="absolute top-0 right-0 w-96 h-32 bg-[#5794f2]/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#2c3235] pb-3 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h1 className="text-sm font-semibold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                Replay Mode: Autonomous Edge Optimization Sweep
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm border border-[#5794f2]/40 bg-[#5794f2]/10 text-[#5794f2] font-bold">
                NVIDIA Jetson Orin Nano (15W)
              </span>

              {/* Mode indicator badge */}
              <button
                type="button"
                onClick={() => setIsLinkedToWalkthrough((prev) => !prev)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border transition-colors flex items-center gap-1 ${
                  isLinkedToWalkthrough && isReplayMode
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-[#f59f00]/40 bg-[#f59f00]/10 text-[#f59f00]"
                }`}
                title="Click to toggle between Standalone Replay and Linked Platform Walkthrough"
              >
                <Activity className="h-2.5 w-2.5" />
                {isLinkedToWalkthrough && isReplayMode
                  ? "Linked to Full Walkthrough"
                  : "Standalone Session (Isolated)"}
              </button>
            </div>
            <p className="text-xs text-[#8e8e9e] font-mono mt-1">
              Interactive session replay: Inspect agent thinking, observable tool calls, stdout traces, JSON arguments, decision summaries, and optimization lineage.
            </p>
          </div>

          {/* Replay Playback Controls */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={() => {
                if (isLinkedToWalkthrough && isReplayMode) {
                  globalTogglePlayPause();
                }
                setIsPlaying((p) => !p);
              }}
              className={`px-3 py-1.5 rounded-sm border transition-colors flex items-center gap-1.5 font-bold ${
                isPlaying
                  ? "border-[#f59f00]/40 bg-[#f59f00]/10 text-[#f59f00] hover:bg-[#f59f00]/20"
                  : "border-[#73bf69]/40 bg-[#73bf69]/10 text-[#73bf69] hover:bg-[#73bf69]/20"
              }`}
              title={isPlaying ? "Pause replay" : "Play replay"}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Play
                </>
              )}
            </button>

            {/* Step Backward */}
            <button
              type="button"
              onClick={handleStepBackward}
              disabled={currentStage <= 0}
              className="px-2 py-1.5 rounded-sm border border-[#2c3235] bg-[#1f2328] hover:bg-[#262b32] text-[#ccccdc] disabled:opacity-40 transition-colors"
              title="Step backward"
            >
              Step -1
            </button>

            {/* Step Forward */}
            <button
              type="button"
              onClick={handleStepForward}
              disabled={currentStage >= MAX_STAGES}
              className="px-2 py-1.5 rounded-sm border border-[#2c3235] bg-[#1f2328] hover:bg-[#262b32] text-[#ccccdc] disabled:opacity-40 transition-colors"
              title="Step forward"
            >
              Step +1
            </button>

            {/* Speed Selector */}
            <div className="flex items-center border border-[#2c3235] bg-[#1f2328] rounded-sm p-0.5">
              {[0.5, 1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => {
                    setPlaybackSpeed(spd);
                    if (isLinkedToWalkthrough && isReplayMode) {
                      if (spd === 1 || spd === 2 || spd === 4) {
                        globalSetSpeed(spd);
                      }
                    }
                  }}
                  className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold transition-colors ${
                    playbackSpeed === spd
                      ? "bg-[#5794f2] text-[#0d0f12]"
                      : "text-[#8e8e9e] hover:text-white"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Skip to End */}
            <button
              type="button"
              onClick={handleSkipToEnd}
              className="px-2.5 py-1.5 rounded-sm border border-[#2c3235] bg-[#1f2328] hover:bg-[#262b32] text-[#8e8e9e] hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              title="Jump to final completion stage"
            >
              <SkipForward className="h-3 w-3" /> Skip
            </button>

            {/* Restart */}
            <button
              type="button"
              onClick={handleRestart}
              className="px-2.5 py-1.5 rounded-sm border border-[#2c3235] bg-[#1f2328] hover:bg-[#262b32] text-[#8e8e9e] hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              title="Restart session replay"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>

            {/* Exit Replay Mode */}
            <button
              type="button"
              onClick={onExitReplay}
              className="px-2.5 py-1.5 rounded-sm border border-[#f2495c]/40 bg-[#f2495c]/10 text-[#f2495c] hover:bg-[#f2495c]/20 transition-colors text-[11px]"
            >
              Exit Replay
            </button>
          </div>
        </div>

        {/* Real-time Agent Status Pill Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-[#2c3235] bg-[#0d0f12] px-3 py-1.5 rounded-sm font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-[#8e8e9e] tracking-wider">
              Agent Status:
            </span>
            <span className={`inline-flex items-center gap-1.5 font-bold ${currentAgentStatus.color}`}>
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              <code>{currentAgentStatus.code}</code>
            </span>
          </div>
          <span className="text-[11px] text-[#8e8e9e] truncate">
            {currentAgentStatus.label}
          </span>
        </div>

        {/* Progress Timeline Tracker */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-white font-semibold flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-[#5794f2]" />
              {currentStageLabel}
            </span>
            <span className="text-[#8e8e9e]">
              Progress: {Math.round((currentStage / MAX_STAGES) * 100)}%
            </span>
          </div>

          <div className="h-1.5 w-full bg-[#1f2328] rounded-full overflow-hidden border border-[#2c3235]">
            <div
              className="h-full bg-gradient-to-r from-[#5794f2] via-[#73bf69] to-emerald-400 transition-all duration-300"
              style={{ width: `${(currentStage / MAX_STAGES) * 100}%` }}
            />
          </div>

          {/* Step Pill Indicators */}
          <div className="grid grid-cols-7 gap-1 pt-1 text-[9px] font-mono text-center">
            {[
              "0: Goal Ingestion",
              "1: Agent Thinking",
              "2: inspect_graph",
              "3: query_telemetry",
              "4: int8_calibration",
              "5: generate_manifest",
              "6: Final Synthesis",
            ].map((name, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStage(idx);
                  if (idx >= 2 && idx <= 5) {
                    setExpandedToolStep(idx - 1);
                  } else if (idx === 6) {
                    setExpandedToolStep(4);
                  }
                }}
                className={`py-1 px-1 rounded-sm border truncate transition-all ${
                  currentStage === idx
                    ? "border-[#5794f2] bg-[#5794f2]/20 text-white font-bold"
                    : currentStage > idx
                    ? "border-[#73bf69]/30 bg-[#73bf69]/10 text-[#73bf69]"
                    : "border-[#2c3235] bg-[#141619] text-[#8e8e9e] hover:text-[#ccccdc]"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-VIEW SWITCHER: Chat / Lineage / Decisions / Plan                   */}
      {/* ========================================================================= */}
      <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#2c3235] bg-[#1f2328] px-3 pt-2">
          <div className="flex items-center gap-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveView("chat")}
              className={`px-3.5 py-1.5 rounded-t-sm transition-colors flex items-center gap-1.5 ${
                activeView === "chat"
                  ? "bg-[#181b1f] text-white border-t-2 border-t-[#5794f2] border-x border-[#2c3235] font-semibold"
                  : "text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#262b32]"
              }`}
            >
              <Terminal className="h-3.5 w-3.5 text-[#5794f2]" />
              Agent Reasoning &amp; Tool Traces ({visibleTools.length}/4 Tools)
            </button>

            <button
              type="button"
              onClick={() => setActiveView("lineage")}
              className={`px-3.5 py-1.5 rounded-t-sm transition-colors flex items-center gap-1.5 ${
                activeView === "lineage"
                  ? "bg-[#181b1f] text-white border-t-2 border-t-[#73bf69] border-x border-[#2c3235] font-semibold"
                  : "text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#262b32]"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5 text-[#73bf69]" />
              Interactive Optimization Lineage DAG
            </button>

            <button
              type="button"
              onClick={() => setActiveView("decisions")}
              className={`px-3.5 py-1.5 rounded-t-sm transition-colors flex items-center gap-1.5 ${
                activeView === "decisions"
                  ? "bg-[#181b1f] text-white border-t-2 border-t-emerald-400 border-x border-[#2c3235] font-semibold"
                  : "text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#262b32]"
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-emerald-400" />
              Decision Log &amp; SLA Verification ({visibleTools.length}/4 Decisions)
            </button>

            <button
              type="button"
              onClick={() => setActiveView("plan")}
              className={`px-3.5 py-1.5 rounded-t-sm transition-colors flex items-center gap-1.5 ${
                activeView === "plan"
                  ? "bg-[#181b1f] text-white border-t-2 border-t-[#f59f00] border-x border-[#2c3235] font-semibold"
                  : "text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#262b32]"
              }`}
            >
              <Box className="h-3.5 w-3.5 text-[#f59f00]" />
              Jetson Deployment Manifest
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#8e8e9e] hidden sm:block pb-1">
            Target: Jetson Orin Nano (15W) · INT8 Calibrated
          </span>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: REPLAY CHAT, REASONING STREAM & STRUCTURED TOOL TRACES            */}
        {/* ========================================================================= */}
        {activeView === "chat" && (
          <div className="p-4 space-y-4">
            {/* Conversation Message 1: Operator Prompt & Constraints */}
            <div className="border border-[#2c3235] bg-[#141619] p-4 rounded-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#8e8e9e] font-semibold flex items-center gap-1.5">
                  <Terminal className="h-3 w-3 text-[#5794f2]" />
                  Conversation Message 1 · Operator Prompt Submission
                </span>
                <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-sm">
                  Autonomous Replay Mode
                </span>
              </div>

              <div className="bg-[#0d0f12] border border-[#2c3235] p-3 rounded-sm">
                <p className="text-xs font-mono text-white leading-relaxed">
                  &ldquo;{scenario.userPrompt}&rdquo;
                </p>
              </div>

              {/* Auto-injected SLA context banner */}
              <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm text-[11px] font-mono text-[#8e8e9e] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#ccccdc] truncate">
                  <Shield className="h-3.5 w-3.5 text-[#5794f2] shrink-0" />
                  <strong className="text-white">Auto-Injected Context:</strong>{" "}
                  <span className="truncate">{scenario.injectedContext}</span>
                </div>
                <span className="text-[10px] text-[#73bf69] border border-[#73bf69]/30 bg-[#73bf69]/10 px-1.5 py-0.2 rounded-sm shrink-0">
                  Zero Hallucination
                </span>
              </div>
            </div>

            {/* Conversation Message 2: Agent Thinking & Simulated Reasoning Stream */}
            {currentStage >= 1 && (
              <div className="border border-[#5794f2]/40 bg-[#141619] rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#2c3235] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#5794f2] animate-pulse" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      {scenario.thinkingMessage}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#5794f2] border border-[#5794f2]/40 bg-[#5794f2]/10 px-2 py-0.5 rounded-sm">
                    {currentStage >= 6 ? "REASONING COMPLETE" : "STREAMING REASONING"}
                  </span>
                </div>

                <div className="bg-[#0d0f12] border border-[#2c3235] p-3 rounded-sm font-mono text-xs text-[#ccccdc] leading-relaxed whitespace-pre-wrap">
                  {currentStage === 0
                    ? ""
                    : currentStage >= 2
                    ? fullReasoningText
                    : streamedText}
                  {currentStage === 1 && streamedText.length < fullReasoningText.length && (
                    <span className="inline-block w-2 h-4 bg-[#5794f2] animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            )}

            {/* Observable Tool Execution Traces (Progressively Revealed) */}
            {visibleTools.length > 0 && (
              <div className="border border-[#2c3235] bg-[#181b1f] rounded-sm overflow-hidden space-y-0">
                <div className="px-3.5 py-2.5 bg-[#1f2328] border-b border-[#2c3235] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-[#5794f2]" />
                    <span className="text-[11px] font-mono uppercase text-white font-semibold tracking-wider">
                      Observable Tool Execution Sequence ({visibleTools.length}/4 Tools Executed)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8e8e9e]">
                    Click any tool to inspect JSON arguments, stdout execution trace, and return payloads
                  </span>
                </div>

                <div className="divide-y divide-[#2c3235]">
                  {visibleTools.map((tool) => {
                    const isExpanded = expandedToolStep === tool.stepNumber;
                    const activeTabKey = activeToolTab[tool.stepNumber] || "stdout";

                    return (
                      <div key={tool.stepNumber} className="bg-[#141619] transition-colors">
                        {/* Tool Header Summary Row */}
                        <div
                          onClick={() => toggleToolExpanded(tool.stepNumber)}
                          className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-[#1a1d22] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-[#5794f2] px-1.5 py-0.5 rounded-sm bg-[#5794f2]/10 border border-[#5794f2]/30 shrink-0">
                              #{tool.stepNumber}
                            </span>

                            {/* Tool Name Badge */}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-[#1f2328] border border-[#5794f2]/40 text-[#5794f2] font-mono text-xs font-semibold shrink-0">
                              <Terminal className="h-3 w-3 text-[#5794f2]" />
                              <code>{tool.toolName}</code>
                            </span>

                            <span className="text-xs text-[#8e8e9e] font-sans truncate hidden md:inline">
                              {tool.description}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                            {/* Execution Offset, ISO timestamp & Duration */}
                            <span className="text-[11px] text-[#8e8e9e] flex items-center gap-1" title={tool.timestampISO}>
                              <Clock className="h-3 w-3 text-[#8e8e9e]" />
                              {tool.timestampOffset} ({tool.durationMs}ms)
                            </span>

                            {/* Status Badge */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                              <Check className="h-3 w-3 text-emerald-400" />
                              {tool.status}
                            </span>

                            {/* Chevron */}
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-[#8e8e9e] transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-white" : ""
                              }`}
                            />
                          </div>
                        </div>

                        {/* Collapsible Tool Details: Arguments, Stdout Trace, Output Payload */}
                        {isExpanded && (
                          <div className="p-4 border-t border-[#2c3235] bg-[#0d0f12] space-y-3.5">
                            {/* Autonomous Decision Summary Banner */}
                            <div className="rounded-sm bg-amber-500/10 border border-amber-500/30 p-3 space-y-1">
                              <span className="text-[10px] uppercase text-amber-400 font-mono font-bold flex items-center gap-1.5">
                                <Sliders className="h-3.5 w-3.5 text-amber-400" />
                                Autonomous Decision Summary:
                              </span>
                              <p className="text-xs text-[#ccccdc] font-sans leading-relaxed">
                                {tool.decisionSummary}
                              </p>
                            </div>

                            {/* Agent intent quote */}
                            <div className="rounded-sm bg-[#181b1f] border border-[#2c3235] p-3">
                              <span className="text-[10px] uppercase text-[#5794f2] font-mono font-semibold block mb-1">
                                Agent Intent / Internal Reasoning:
                              </span>
                              <p className="text-xs text-[#ccccdc] font-sans leading-relaxed italic">
                                &ldquo;{tool.thought}&rdquo;
                              </p>
                            </div>

                            {/* Key Telemetry Badges */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                              {tool.keyMetrics.map((km, kIdx) => (
                                <div
                                  key={kIdx}
                                  className="border border-[#2c3235] bg-[#141619] p-2 rounded-sm"
                                >
                                  <span className="text-[10px] text-[#8e8e9e] uppercase block">
                                    {km.label}
                                  </span>
                                  <span className={`font-semibold text-xs ${km.color || "text-white"}`}>
                                    {km.value}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Sub-tabs for: Stdout Trace | JSON Arguments | Return Payload */}
                            <div className="border border-[#2c3235] bg-[#141619] rounded-sm overflow-hidden">
                              <div className="flex items-center justify-between border-b border-[#2c3235] bg-[#1a1d22] px-3 py-1.5 text-xs font-mono">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToolTabChange(tool.stepNumber, "stdout")}
                                    className={`px-2.5 py-1 rounded-sm transition-colors text-[11px] font-semibold flex items-center gap-1.5 ${
                                      activeTabKey === "stdout"
                                        ? "bg-[#0d0f12] text-emerald-400 border border-[#2c3235]"
                                        : "text-[#8e8e9e] hover:text-white"
                                    }`}
                                  >
                                    <Terminal className="h-3 w-3" />
                                    Stdout Execution Trace
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToolTabChange(tool.stepNumber, "args")}
                                    className={`px-2.5 py-1 rounded-sm transition-colors text-[11px] font-semibold flex items-center gap-1.5 ${
                                      activeTabKey === "args"
                                        ? "bg-[#0d0f12] text-[#5794f2] border border-[#2c3235]"
                                        : "text-[#8e8e9e] hover:text-white"
                                    }`}
                                  >
                                    <FileCode className="h-3 w-3" />
                                    Input Arguments (JSON)
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToolTabChange(tool.stepNumber, "output")}
                                    className={`px-2.5 py-1 rounded-sm transition-colors text-[11px] font-semibold flex items-center gap-1.5 ${
                                      activeTabKey === "output"
                                        ? "bg-[#0d0f12] text-[#73bf69] border border-[#2c3235]"
                                        : "text-[#8e8e9e] hover:text-white"
                                    }`}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Return Payload (JSON)
                                  </button>
                                </div>

                                <CopyButton
                                  text={
                                    activeTabKey === "stdout"
                                      ? tool.stdoutTrace.join("\n")
                                      : JSON.stringify(
                                          activeTabKey === "args"
                                            ? tool.inputArgs
                                            : tool.outputPayload,
                                          null,
                                          2
                                        )
                                  }
                                  label="Copy View"
                                />
                              </div>

                              <div className="p-3 bg-[#0d0f12]">
                                {activeTabKey === "stdout" && (
                                  <pre className="text-[11px] font-mono text-[#ccccdc] overflow-x-auto max-h-56 leading-relaxed space-y-0.5">
                                    {tool.stdoutTrace.map((line, lIdx) => {
                                      let lineStyle = "text-[#ccccdc]";
                                      if (line.includes("VIOLATION") || line.includes("REJECTED")) {
                                        lineStyle = "text-[#f2495c] font-semibold";
                                      } else if (line.includes("PASS") || line.includes("ACCEPTED") || line.includes("Retrieved 3")) {
                                        lineStyle = "text-[#73bf69]";
                                      } else if (line.includes("BOTTLENECK") || line.includes("DECISION")) {
                                        lineStyle = "text-[#f59f00]";
                                      } else if (line.startsWith("[")) {
                                        lineStyle = "text-[#5794f2]";
                                      }
                                      return (
                                        <div key={lIdx} className={lineStyle}>
                                          {line}
                                        </div>
                                      );
                                    })}
                                  </pre>
                                )}

                                {activeTabKey === "args" && (
                                  <pre className="text-[11px] font-mono text-[#5794f2] overflow-x-auto max-h-56">
                                    {JSON.stringify(tool.inputArgs, null, 2)}
                                  </pre>
                                )}

                                {activeTabKey === "output" && (
                                  <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56">
                                    {JSON.stringify(tool.outputPayload, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conversation Message 3: Final Synthesis Response & Recommendations */}
            {currentStage >= 6 && (
              <div className="border border-emerald-500/40 bg-[#141619] rounded-sm p-4 space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2c3235] pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Conversation Message 3 · Autonomous Synthesis &amp; SLA Certification
                    </h3>
                    <span className="text-[10px] text-[#8e8e9e] font-mono">
                      Engine: Meta AI muse-spark-1.3 · Pareto Optimal Deployment Package Certified
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <CopyButton text={scenario.synthesisResponse} label="Copy Markdown" />
                    <button
                      type="button"
                      onClick={() => setActiveView("lineage")}
                      className="px-2.5 py-1 rounded-sm border border-[#73bf69]/40 bg-[#73bf69]/10 text-[#73bf69] hover:bg-[#73bf69]/20 transition-colors"
                    >
                      View Lineage DAG
                    </button>
                    <button
                      type="button"
                      onClick={handleExportToDeployments}
                      className="px-2.5 py-1 rounded-sm border border-[#5794f2]/40 bg-[#5794f2] hover:bg-[#4682e0] text-[#0d0f12] font-semibold transition-colors flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Export Bundle ZIP
                    </button>
                  </div>
                </div>

                {/* Synthesis Markdown */}
                <div className="border border-[#2c3235] bg-[#0d0f12] p-4 text-xs font-mono text-[#ccccdc] leading-relaxed rounded-sm whitespace-pre-wrap select-all">
                  {scenario.synthesisResponse}
                </div>

                {/* Final Recommendation Cards */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono uppercase text-white font-bold block">
                    Final Deployment Recommendations:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 font-mono text-xs">
                    {scenario.finalRecommendations.map((rec, rIdx) => (
                      <div
                        key={rIdx}
                        className="border border-[#2c3235] bg-[#181b1f] p-3 rounded-sm space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#5794f2] uppercase">
                            {rec.badge}
                          </span>
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                        <h4 className="font-bold text-white text-xs">{rec.title}</h4>
                        <p className="text-[11px] text-[#8e8e9e] leading-snug">
                          {rec.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: INTERACTIVE OPTIMIZATION LINEAGE TREE (VISUAL DAG)                */}
        {/* ========================================================================= */}
        {activeView === "lineage" && (
          <div className="p-4 space-y-4">
            <div className="border border-[#2c3235] bg-[#141619] p-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-[#73bf69]" />
                  Interactive Optimization Lineage DAG
                </h3>
                <p className="text-xs text-[#8e8e9e] font-mono mt-0.5">
                  Visual directed acyclic graph: Base Model (FP32) &rarr; Quantized INT8 (TensorRT) &rarr; Calibration Tuning &rarr; Deployment Ready Package (94.2% mAP retained, 3.8x speedup).
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-[11px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 rounded-sm">
                  Click any node to inspect telemetry &amp; reasoning
                </span>
              </div>
            </div>

            {/* Visual DAG Progression Pipeline with Connectors */}
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs relative z-10">
                {scenario.lineageNodes.map((node, nodeIdx) => {
                  const isSelected = selectedLineageId === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedLineageId(node.id)}
                      className={`relative border p-3.5 rounded-sm cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-[#5794f2] bg-[#1f2328] text-white shadow-md ring-2 ring-[#5794f2]"
                          : "border-[#2c3235] bg-[#141619] hover:bg-[#1a1d22] text-[#ccccdc]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-[#8e8e9e] mb-1.5">
                          <span className="font-bold text-[#5794f2]">Step #{node.stepNumber}</span>
                          {nodeIdx < scenario.lineageNodes.length - 1 ? (
                            <span className="flex items-center gap-1 text-[#5794f2] font-mono text-[10px] font-bold">
                              DAG FLOW &rarr;
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">CERTIFIED</span>
                          )}
                        </div>

                        <h4 className="font-bold text-white text-xs leading-snug">{node.label}</h4>

                        <span
                          className={`inline-block px-1.5 py-0.5 mt-2 rounded-sm text-[10px] uppercase font-semibold border ${node.badgeColor}`}
                        >
                          {node.statusText}
                        </span>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-[#2c3235] text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#8e8e9e]">Latency:</span>
                          <span className="font-semibold text-white">{node.latencyMs.toFixed(1)} ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8e8e9e]">Throughput:</span>
                          <span className="font-semibold">{node.fps.toFixed(1)} FPS</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8e8e9e]">mAP@50:</span>
                          <span className="font-semibold">{node.mapPercent.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8e8e9e]">Speedup:</span>
                          <span className="font-bold text-emerald-400">{node.speedupMultiplier.toFixed(1)}x</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Node Deep Telemetry & Reasoning Panel */}
            <div className="border border-[#2c3235] bg-[#141619] rounded-sm p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2c3235] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 bg-[#1f2328] border border-[#2c3235] text-[#5794f2] text-[10px] font-mono">
                      STEP #{activeLineageNode.stepNumber}
                    </span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
                      {activeLineageNode.label} — Deep Telemetry &amp; Reasoning
                    </h3>
                  </div>
                  <p className="text-xs text-[#8e8e9e] font-mono mt-0.5">
                    Evaluation status: {activeLineageNode.statusText} • Speedup: {activeLineageNode.speedupMultiplier}x vs Baseline
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveView("chat")}
                    className="px-2.5 py-1.5 rounded-sm border border-[#2c3235] bg-[#1f2328] hover:bg-[#262b32] text-[#ccccdc] transition-colors"
                  >
                    View Tool Traces
                  </button>
                  <button
                    type="button"
                    onClick={handleExportToDeployments}
                    className="px-2.5 py-1.5 rounded-sm border border-[#5794f2]/40 bg-[#5794f2] hover:bg-[#4682e0] text-[#0d0f12] font-semibold transition-colors flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Deploy Node Artifact
                  </button>
                </div>
              </div>

              {/* 6 Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
                <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm">
                  <span className="text-[10px] text-[#8e8e9e] uppercase block">P50 Latency</span>
                  <span className="text-white font-bold text-sm">
                    {activeLineageNode.latencyMs.toFixed(1)} ms
                  </span>
                </div>
                <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm">
                  <span className="text-[10px] text-[#8e8e9e] uppercase block">Throughput</span>
                  <span className="text-white font-bold text-sm">
                    {activeLineageNode.fps.toFixed(1)} FPS
                  </span>
                </div>
                <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm">
                  <span className="text-[10px] text-[#8e8e9e] uppercase block">mAP@50</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {activeLineageNode.mapPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm">
                  <span className="text-[10px] text-[#8e8e9e] uppercase block">Model Footprint</span>
                  <span className="text-white font-bold text-sm">
                    {activeLineageNode.modelSizeMb} MB
                  </span>
                </div>
                <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm">
                  <span className="text-[10px] text-[#8e8e9e] uppercase block">Power Draw</span>
                  <span className="text-white font-bold text-sm">
                    {activeLineageNode.powerWatts} W
                  </span>
                </div>
                <div className="border border-[#2c3235] bg-[#181b1f] p-2.5 rounded-sm">
                  <span className="text-[10px] text-[#8e8e9e] uppercase block">Net Speedup</span>
                  <span className="text-[#5794f2] font-bold text-sm">
                    {activeLineageNode.speedupMultiplier.toFixed(1)}x
                  </span>
                </div>
              </div>

              {/* 3 Pillars of Reasoning */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="border border-[#2c3235] bg-[#181b1f] p-3 rounded-sm space-y-1.5">
                  <span className="text-[10px] uppercase text-[#5794f2] font-semibold block">
                    1. Why was it attempted?
                  </span>
                  <p className="text-[#ccccdc] leading-relaxed text-[11px]">
                    {activeLineageNode.whyAttempted}
                  </p>
                </div>

                <div className="border border-[#2c3235] bg-[#181b1f] p-3 rounded-sm space-y-1.5">
                  <span className="text-[10px] uppercase text-[#73bf69] font-semibold block">
                    2. What happened?
                  </span>
                  <p className="text-[#ccccdc] leading-relaxed text-[11px]">
                    {activeLineageNode.whatHappened}
                  </p>
                </div>

                <div className="border border-[#2c3235] bg-[#181b1f] p-3 rounded-sm space-y-1.5">
                  <span className="text-[10px] uppercase text-[#f59f00] font-semibold block">
                    3. What did the agent learn?
                  </span>
                  <p className="text-[#ccccdc] leading-relaxed text-[11px]">
                    {activeLineageNode.agentLearned}
                  </p>
                </div>
              </div>

              {/* Node Configuration Details */}
              <div className="border border-[#2c3235] bg-[#0d0f12] p-3 rounded-sm font-mono text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2c3235] pb-2">
                  <span className="text-[11px] text-white font-semibold uppercase">
                    Configuration &amp; Runtime Specification:
                  </span>
                  <span className="text-[10px] text-[#8e8e9e]">
                    Precision: {activeLineageNode.configuration.precision} · Engine: {activeLineageNode.configuration.engine}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#8e8e9e]">
                  <div>
                    <span className="text-white">Format:</span> {activeLineageNode.configuration.format}
                  </div>
                  {activeLineageNode.configuration.calibrationMethod && (
                    <div>
                      <span className="text-white">Calibrator:</span>{" "}
                      {activeLineageNode.configuration.calibrationMethod}
                    </div>
                  )}
                  {activeLineageNode.configuration.runtimeFlags && (
                    <div className="sm:col-span-2">
                      <span className="text-white">Runtime Flags:</span>{" "}
                      <code>{activeLineageNode.configuration.runtimeFlags.join(" ")}</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Suggested Action */}
              <div className="border border-[#2c3235] bg-[#0d0f12] p-2.5 rounded-sm text-xs font-mono flex items-center justify-between">
                <span className="text-[#8e8e9e]">
                  <strong className="text-white">Suggested Action:</strong>{" "}
                  {activeLineageNode.suggestedAction}
                </span>
                <span className="text-[10px] text-[#5794f2] border border-[#5794f2]/30 bg-[#5794f2]/10 px-2 py-0.5 rounded-sm">
                  Verified Edge Step
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: DECISION LOG & SLA VERIFICATION MATRIX                            */}
        {/* ========================================================================= */}
        {activeView === "decisions" && (
          <div className="p-4 space-y-4">
            <div className="border border-[#2c3235] bg-[#141619] p-3 rounded-sm flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-400" />
                  Autonomous Decision Log &amp; SLA Gate Verification
                </h3>
                <p className="text-xs text-[#8e8e9e] font-mono mt-0.5">
                  Audit trail of mathematical decisions and SLA gate evaluations executed autonomously by the Meta AI Engineer.
                </p>
              </div>

              <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 rounded-sm">
                4/4 Milestones Certified
              </span>
            </div>

            {/* Chronological Decision Cards */}
            <div className="space-y-3">
              {scenario.tools.map((tool) => (
                <div
                  key={tool.stepNumber}
                  className="border border-[#2c3235] bg-[#141619] p-3.5 rounded-sm space-y-2 font-mono text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#2c3235] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-sm bg-[#5794f2]/10 border border-[#5794f2]/30 text-[#5794f2] text-[10px] font-bold">
                        DECISION #{tool.stepNumber}
                      </span>
                      <span className="font-bold text-white text-xs">{tool.stageName}</span>
                      <code className="text-[11px] text-[#5794f2]">({tool.toolName})</code>
                    </div>
                    <span className="text-[10px] text-[#8e8e9e] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tool.timestampOffset} ({tool.timestampISO})
                    </span>
                  </div>

                  <p className="text-xs text-[#ccccdc] font-sans leading-relaxed">
                    {tool.decisionSummary}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                    <span className="text-[#8e8e9e]">Key Telemetry:</span>
                    {tool.keyMetrics.map((km, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded-sm bg-[#0d0f12] border border-[#2c3235] text-[#ccccdc]"
                      >
                        <strong className="text-white">{km.label}:</strong> {km.value}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* SLA Gate Verification Table */}
            <div className="border border-[#2c3235] bg-[#141619] rounded-sm overflow-hidden font-mono text-xs">
              <div className="px-3.5 py-2.5 bg-[#1f2328] border-b border-[#2c3235] flex items-center justify-between">
                <span className="text-white font-bold text-[11px] uppercase tracking-wider">
                  Quantitative SLA Gate Compliance Matrix
                </span>
                <span className="text-emerald-400 text-[10px] font-bold">100% GATES PASSED</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[#2c3235] bg-[#0d0f12] text-[#8e8e9e] uppercase text-[10px]">
                      <th className="p-2.5">SLA Constraint Metric</th>
                      <th className="p-2.5">Target SLA Threshold</th>
                      <th className="p-2.5">FP32 Baseline</th>
                      <th className="p-2.5">INT8 Calibrated</th>
                      <th className="p-2.5">Margin / Delta</th>
                      <th className="p-2.5">Gate Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2c3235] text-[#ccccdc]">
                    <tr>
                      <td className="p-2.5 font-bold text-white">Median Latency (P50)</td>
                      <td className="p-2.5">&le; 25.0 ms</td>
                      <td className="p-2.5 text-[#f2495c]">45.2 ms</td>
                      <td className="p-2.5 text-[#73bf69] font-bold">18.4 ms</td>
                      <td className="p-2.5 text-emerald-400">+6.6 ms Headroom</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          PASSED
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-white">Throughput (FPS)</td>
                      <td className="p-2.5">&ge; 40.0 FPS</td>
                      <td className="p-2.5 text-[#f2495c]">22.1 FPS</td>
                      <td className="p-2.5 text-[#73bf69] font-bold">54.3 FPS</td>
                      <td className="p-2.5 text-emerald-400">+14.3 FPS Headroom</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          PASSED
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-white">Accuracy Degradation</td>
                      <td className="p-2.5">&le; 1.0% pts mAP</td>
                      <td className="p-2.5">82.0% mAP (0.0%)</td>
                      <td className="p-2.5 text-[#73bf69] font-bold">81.2% mAP (-0.8%)</td>
                      <td className="p-2.5 text-emerald-400">94.2% Retained</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          PASSED
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-white">Power Draw (TDP)</td>
                      <td className="p-2.5">&le; 15.0 Watts</td>
                      <td className="p-2.5 text-amber-400">14.8 W</td>
                      <td className="p-2.5 text-[#73bf69] font-bold">11.4 W</td>
                      <td className="p-2.5 text-emerald-400">+3.6 W Margin</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          PASSED
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-white">Junction Temperature</td>
                      <td className="p-2.5">&le; 85.0 &deg;C</td>
                      <td className="p-2.5">72.4 &deg;C</td>
                      <td className="p-2.5 text-[#73bf69] font-bold">61.2 &deg;C</td>
                      <td className="p-2.5 text-emerald-400">+23.8 &deg;C Headroom</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          PASSED
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: JETSON DEPLOYMENT MANIFEST & BUNDLE                               */}
        {/* ========================================================================= */}
        {activeView === "plan" && (
          <div className="p-4 space-y-4">
            <div className="border border-[#2c3235] bg-[#141619] p-3 rounded-sm flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                  <Box className="h-4 w-4 text-[#f59f00]" />
                  Edge Deployment Manifest: NVIDIA Jetson Orin Nano
                </h3>
                <p className="text-xs text-[#8e8e9e] font-mono mt-0.5">
                  Generated standalone bundle specifications, zero-copy inference wrapper, and L4T container configuration.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportToDeployments}
                className="px-3 py-1.5 rounded-sm border border-[#5794f2]/40 bg-[#5794f2] hover:bg-[#4682e0] text-[#0d0f12] font-semibold transition-colors text-xs font-mono flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Go to Deployments Tab
              </button>
            </div>

            {/* Bundle Components Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="border border-[#2c3235] bg-[#141619] p-3 rounded-sm space-y-2">
                <span className="text-[10px] text-[#5794f2] uppercase font-bold flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5" />
                  Compiled Engine Plan
                </span>
                <h4 className="font-bold text-white text-xs">model_int8.engine</h4>
                <p className="text-[11px] text-[#8e8e9e]">
                  TensorRT 8.6 serialized execution plan (3.9 MB) calibrated with KL-Divergence Entropy for 15W Tegra silicon.
                </p>
              </div>

              <div className="border border-[#2c3235] bg-[#141619] p-3 rounded-sm space-y-2">
                <span className="text-[10px] text-[#73bf69] uppercase font-bold flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  Zero-Copy Python Runner
                </span>
                <h4 className="font-bold text-white text-xs">infer.py</h4>
                <p className="text-[11px] text-[#8e8e9e]">
                  Deterministic pipeline with CUDA unified memory pin buffers, preprocessing, and NMS box filtering at 54.3 FPS.
                </p>
              </div>

              <div className="border border-[#2c3235] bg-[#141619] p-3 rounded-sm space-y-2">
                <span className="text-[10px] text-[#f59f00] uppercase font-bold flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  Jetson Docker Container
                </span>
                <h4 className="font-bold text-white text-xs">docker-compose.edge.yml</h4>
                <p className="text-[11px] text-[#8e8e9e]">
                  L4T 36.2 base with GPU device passthrough (`/dev/nvhost-gpu`), 4096 MB RAM ceiling, and auto-restart policy.
                </p>
              </div>
            </div>

            {/* Docker Compose YAML preview */}
            <div className="border border-[#2c3235] bg-[#0d0f12] rounded-sm overflow-hidden">
              <div className="px-3 py-1.5 bg-[#1a1d22] border-b border-[#2c3235] flex items-center justify-between text-xs font-mono">
                <span className="text-white font-semibold text-[11px]">
                  docker-compose.edge.yml (Jetson Edge Container Specification)
                </span>
                <CopyButton
                  text={`version: "3.8"
services:
  edgeforge-defect-detector:
    image: nvcr.io/nvidia/l4t-tensorrt:r8.6.2-devel
    container_name: edgeforge-yolov8n-jetson
    restart: always
    runtime: nvidia
    devices:
      - /dev/nvhost-ctrl
      - /dev/nvhost-gpu
      - /dev/nvmap
    environment:
      - CUDA_MODULE_LOADING=LAZY
      - JETSON_POWER_MODE=15W_6CORE
    volumes:
      - ./model_int8.engine:/app/model.engine:ro
      - ./infer.py:/app/infer.py:ro
    command: python3 /app/infer.py --engine /app/model.engine --sla-target 25.0
    deploy:
      resources:
        limits:
          memory: 4096M`}
                  label="Copy YAML"
                />
              </div>
              <pre className="p-3 text-[11px] font-mono text-[#ccccdc] overflow-x-auto leading-relaxed">
{`version: "3.8"
services:
  edgeforge-defect-detector:
    image: nvcr.io/nvidia/l4t-tensorrt:r8.6.2-devel
    container_name: edgeforge-yolov8n-jetson
    restart: always
    runtime: nvidia
    devices:
      - /dev/nvhost-ctrl
      - /dev/nvhost-gpu
      - /dev/nvmap
    environment:
      - CUDA_MODULE_LOADING=LAZY
      - JETSON_POWER_MODE=15W_6CORE
    volumes:
      - ./model_int8.engine:/app/model.engine:ro
      - ./infer.py:/app/infer.py:ro
    command: python3 /app/infer.py --engine /app/model.engine --sla-target 25.0
    deploy:
      resources:
        limits:
          memory: 4096M`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
