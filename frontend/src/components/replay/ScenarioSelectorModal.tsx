"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Play,
  Clock,
  Layers,
  Cpu,
  Sparkles,
  Zap,
  Sliders,
  Bot,
  Package,
  Search,
  GitCompare,
} from "lucide-react";
import { ReplayScenario } from "./types";
import { REPLAY_SCENARIOS } from "../../lib/replayData";
import { useReplay, STAGE_DURATION_SECONDS } from "./ReplayContext";

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const SCENARIO_HARDWARE_MAP: Record<string, string[]> = {
  "featured-e2e": ["Jetson Orin Nano", "Hailo-8 M.2", "RTX 4060", "Intel i7"],
  "featured-end-to-end": ["Jetson Orin Nano", "Hailo-8 M.2", "RTX 4060", "Intel i7"],
  "yolo-inspection": ["ONNX Graph", "Intel i7 Host"],
  "hardware-benchmarking": ["Jetson Orin Nano", "Hailo-8 M.2", "RTX 4060"],
  "precision-optimization": ["Hailo-8 M.2", "INT8 Dynamic QDQ"],
  "hardware-comparison": ["Pareto Frontier", "Hailo-8 vs Jetson Orin"],
  "ai-engineer": ["Llama-3-70B", "Hailo-8 Recommendation"],
  "ai-engineer-workflow": ["Llama-3-70B", "Hailo-8 Recommendation"],
  "deployment-bundling": ["Zero-Copy DMA", "Docker / Python"],
};

const SCENARIO_DIFFICULTY_MAP: Record<string, string> = {
  "featured-e2e": "Advanced",
  "featured-end-to-end": "Advanced",
  "yolo-inspection": "Beginner",
  "hardware-benchmarking": "Intermediate",
  "precision-optimization": "Advanced",
  "hardware-comparison": "Intermediate",
  "ai-engineer": "Advanced",
  "ai-engineer-workflow": "Advanced",
  "deployment-bundling": "Beginner",
};

const SCENARIO_TAG_MAP: Record<string, string> = {
  "featured-e2e": "End-to-End Edge Optimization Walkthrough",
  "featured-end-to-end": "End-to-End Edge Optimization Walkthrough",
  "yolo-inspection": "Defect Detection & YOLO Model Architecture Analysis",
  "hardware-benchmarking": "Cross-Hardware Benchmarking & Physical Profiling",
  "precision-optimization": "INT8 Quantization & Calibration (FP32 -> FP16 -> INT8)",
  "hardware-comparison": "Multi-Device Pareto Frontier & Hardware Comparison",
  "ai-engineer": "Autonomous AI Engineer Optimization",
  "ai-engineer-workflow": "Autonomous AI Engineer Optimization",
  "deployment-bundling": "Edge Deployment Artifact Bundling & Verification",
};

interface ScenarioSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario?: (scenario: ReplayScenario) => void;
}

export const ScenarioSelectorModal: React.FC<ScenarioSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
}) => {
  const { startScenario } = useReplay();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Scenarios (7)" },
    { id: "featured", label: "Featured Walkthrough" },
    { id: "benchmarking", label: "Benchmarking" },
    { id: "optimization", label: "Model & Quantization" },
    { id: "agent", label: "AI Engineer" },
    { id: "comparison", label: "Pareto & Comparison" },
    { id: "deployment", label: "Deployment" },
  ];

  const filteredScenarios = useMemo(() => {
    return REPLAY_SCENARIOS.filter((sc) => {
      const isFeatured = Boolean(sc.id === "featured-e2e" || sc.id === "featured-end-to-end" || sc.featured);
      let matchesCategory = false;
      if (selectedCategory === "all") {
        matchesCategory = true;
      } else if (selectedCategory === "featured") {
        matchesCategory = isFeatured;
      } else if (selectedCategory === "benchmarking" || selectedCategory === "Hardware Profiling") {
        matchesCategory = sc.id.includes("benchmark") || sc.category.toLowerCase().includes("benchmark");
      } else if (selectedCategory === "optimization" || selectedCategory === "Model Optimization") {
        matchesCategory =
          sc.id.includes("optimization") ||
          sc.id.includes("yolo") ||
          sc.category.toLowerCase().includes("opt") ||
          sc.category.toLowerCase().includes("arch");
      } else if (selectedCategory === "agent" || selectedCategory === "AI Systems") {
        matchesCategory = sc.id.includes("agent") || sc.id.includes("ai") || sc.category.toLowerCase().includes("agent");
      } else if (selectedCategory === "comparison") {
        matchesCategory = sc.id.includes("compare") || sc.id.includes("comparison") || sc.category.toLowerCase().includes("pareto");
      } else if (selectedCategory === "deployment" || selectedCategory === "Deployment") {
        matchesCategory = sc.id.includes("deploy") || sc.category.toLowerCase().includes("deploy");
      } else {
        matchesCategory =
          sc.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          selectedCategory.toLowerCase().includes(sc.category.toLowerCase());
      }

      const q = searchQuery.toLowerCase().trim();
      const hardwareList = SCENARIO_HARDWARE_MAP[sc.id] || [];
      const matchesSearch =
        !q ||
        sc.title.toLowerCase().includes(q) ||
        sc.tagline.toLowerCase().includes(q) ||
        sc.description.toLowerCase().includes(q) ||
        sc.id.toLowerCase().includes(q) ||
        hardwareList.some((hw) => hw.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleLaunch = (scenario: ReplayScenario) => {
    if (onSelectScenario) {
      onSelectScenario(scenario);
    } else {
      startScenario(scenario.id);
    }
    onClose();
  };

  const getScenarioIcon = (iconName?: string) => {
    switch (iconName) {
      case "Sparkles":
        return Sparkles;
      case "Layers":
        return Layers;
      case "Cpu":
        return Cpu;
      case "Sliders":
        return Sliders;
      case "GitCompare":
        return GitCompare;
      case "Bot":
        return Bot;
      case "Package":
        return Package;
      default:
        return Sparkles;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="replay-scenario-selector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="replay-modal-title"
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#111217] border border-[#2c3235] shadow-2xl rounded-sm flex flex-col overflow-hidden text-[#ccccdc]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-5 border-b border-[#2c3235] bg-[#181b1f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#22252b] border border-[#f59f00]/40 text-[#f59f00]">
              <Zap className="h-4 w-4 fill-[#f59f00]/20 text-[#f59f00]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="replay-modal-title"
                  className="text-sm font-semibold tracking-tight text-[#ccccdc]"
                >
                  EdgeForge Interactive Replay Catalog
                </h2>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-sm bg-[#f59f00]/15 text-[#f59f00] border border-[#f59f00]/40 uppercase">
                  SELECT INTERACTIVE REPLAY SCENARIO
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-[#22252b] border border-[#2c3235] text-[#73bf69]">
                  0 CONFIG REQUIRED
                </span>
              </div>
              <p className="text-[11px] text-[#8e8e9e] font-sans">
                Interactive engineering simulations with verified telemetry, zero logins, and no hardware required.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-sm flex items-center justify-center text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#22252b] transition-colors"
            title="Close dialog (Esc)"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-3 border-b border-[#2c3235] bg-[#14161b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 text-xs font-sans rounded-sm transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-[#22252b] text-[#f59f00] font-medium border border-[#f59f00]/40"
                    : "text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#22252b]/50 border border-transparent"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="h-3.5 w-3.5 text-[#8e8e9e] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search scenarios or hardware..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-[#181b1f] border border-[#2c3235] rounded-sm text-[#ccccdc] placeholder-[#8e8e9e] focus:outline-none focus:border-[#5794f2]"
            />
          </div>
        </div>

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {filteredScenarios.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8e8e9e]">
              No scenarios match your search criteria. Try resetting filters.
            </div>
          ) : (
            filteredScenarios.map((scenario) => {
              const isFeatured = scenario.id === "featured-e2e" || scenario.id === "featured-end-to-end" || Boolean(scenario.featured);
              const stagesCount = scenario.stages?.length || 0;
              const totalDurationSec = stagesCount * STAGE_DURATION_SECONDS;
              const hardwareList = SCENARIO_HARDWARE_MAP[scenario.id] || ["Edge Silicon"];
              const difficulty = SCENARIO_DIFFICULTY_MAP[scenario.id] || "Intermediate";
              const IconComp = getScenarioIcon(scenario.iconName || "Sparkles");

              return (
                <div
                  key={scenario.id}
                  className={`p-4 rounded-sm border transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isFeatured
                      ? "bg-[#181b1f] border-[#f59f00]/50 hover:border-[#f59f00] shadow-[0_0_15px_rgba(245,159,0,0.08)]"
                      : "bg-[#181b1f] border-[#2c3235] hover:border-[#3e4448] hover:bg-[#1a1d22]"
                  }`}
                >
                  {/* Left Column: Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <IconComp
                          className={`h-4 w-4 ${isFeatured ? "text-[#f59f00]" : "text-[#5794f2]"}`}
                        />
                        <span className="font-semibold text-sm text-[#ccccdc] font-sans">
                          {scenario.title}
                        </span>
                      </div>
                      {isFeatured && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded-sm bg-[#f59f00]/15 text-[#f59f00] border border-[#f59f00]/40">
                          <Sparkles className="h-3 w-3" />
                          RECOMMENDED FOR JUDGES
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-sm bg-[#22252b] text-[#8e8e9e] border border-[#2c3235]">
                        {scenario.category}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-sm bg-[#22252b] text-[#8e8e9e] border border-[#2c3235]">
                        {difficulty}
                      </span>
                    </div>

                    {SCENARIO_TAG_MAP[scenario.id] && (
                      <span className="text-[11px] font-mono font-medium text-[#5794f2] block">
                        {SCENARIO_TAG_MAP[scenario.id]}
                      </span>
                    )}

                    <p className="text-xs text-[#8e8e9e] font-sans line-clamp-2">
                      {scenario.description}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8e8e9e] pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#5794f2]" />
                        <span className="font-mono text-[#ccccdc]">
                          {formatDuration(totalDurationSec)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-[#73bf69]" />
                        <span className="font-mono text-[#ccccdc]">
                          {stagesCount} Stages
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-[#f59f00]" />
                        <div className="flex flex-wrap gap-1">
                          {hardwareList.map((hw, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 text-[10px] font-mono rounded-sm bg-[#111217] text-[#ccccdc] border border-[#2c3235]"
                            >
                              {hw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Launch Action */}
                  <div className="flex items-center justify-end shrink-0 pt-2 md:pt-0">
                    <button
                      id={`btn-launch-scenario-${scenario.id}`}
                      onClick={() => handleLaunch(scenario)}
                      className={`h-9 px-4 rounded-sm flex items-center gap-2 text-xs font-semibold transition-all shadow-sm ${
                        isFeatured
                          ? "bg-[#f59f00] text-black hover:bg-[#f59f00]/90 font-medium active:scale-95"
                          : "bg-[#22252b] text-[#ccccdc] border border-[#2c3235] hover:bg-[#2c3235] hover:text-white"
                      }`}
                    >
                      <Play
                        className={`h-3.5 w-3.5 ${
                          isFeatured ? "fill-black text-black" : "fill-current"
                        }`}
                      />
                      <span>Launch Scenario</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="h-11 px-5 border-t border-[#2c3235] bg-[#181b1f] flex items-center justify-between text-xs text-[#8e8e9e] shrink-0 font-mono">
          <div className="flex items-center gap-2">
            <span>Controls:</span>
            <span className="px-1.5 py-0.5 bg-[#22252b] rounded-sm text-[10px] text-[#ccccdc] border border-[#2c3235]">
              Space
            </span>
            <span className="text-[11px]">Play/Pause</span>
            <span className="px-1.5 py-0.5 bg-[#22252b] rounded-sm text-[10px] text-[#ccccdc] border border-[#2c3235] ml-1">
              ← / →
            </span>
            <span className="text-[11px]">Scrub</span>
            <span className="px-1.5 py-0.5 bg-[#22252b] rounded-sm text-[10px] text-[#ccccdc] border border-[#2c3235] ml-1">
              Esc
            </span>
            <span className="text-[11px]">Exit/Minimize</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-sm bg-[#22252b] text-[#ccccdc] hover:bg-[#2c3235] text-xs font-sans transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
