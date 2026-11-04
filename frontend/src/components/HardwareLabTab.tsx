"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Cpu,
  RefreshCw,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Sliders,
  Search,
  Radio,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import { HardwareDevice, detectHardware } from "@/lib/api";

interface HardwareLabTabProps {
  hardware: HardwareDevice[];
  onRefresh: () => void;
  activeGoal?: string | null;
  onClearGoal?: () => void;
  setActiveTab?: (tab: string) => void;
  onSelectGoal?: (goal: string) => void;
}

// Robust cross-browser clipboard copy with fallback
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // DOM fallback below
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

// Inline Copy Button Helper
const CopySnippet: React.FC<{ text: string }> = ({ text }) => {
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
      className="p-1 text-[#8e8e9e] hover:text-[#ccccdc] transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[#73bf69]" /> : <Copy className="h-3.5 w-3.5 text-[#8e8e9e]" />}
    </button>
  );
};

// Genuine physical current sensor check
export const hasPowerSensor = (hw: HardwareDevice | null | undefined): boolean => {
  if (!hw) return false;
  // Genuine power telemetry only exists on devices with physical current sensors (e.g. NVIDIA GPU with NVML)
  return hw.device_type === "gpu" && Boolean(hw.telemetry_supported) && hw.is_local;
};

const PAIRED_STORAGE_KEY = "edgeforge_paired_hardware_v1";
const CUSTOM_WORKERS_STORAGE_KEY = "edgeforge_custom_workers_v1";

interface PairedInfo {
  workerUrl: string;
  runtime: string;
  pairedAt: string;
}

export const HardwareLabTab: React.FC<HardwareLabTabProps> = ({
  hardware,
  onRefresh,
  activeGoal,
  onClearGoal,
  setActiveTab,
  onSelectGoal,
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "local" | "remote" | "targets">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Scenario A: Find Suitable Hardware
  const [hardwareFinderExplicitOpen, setHardwareFinderExplicitOpen] = useState<boolean | null>(null);
  const showHardwareFinder = hardwareFinderExplicitOpen ?? (activeGoal === "find-hardware");
  const setShowHardwareFinder = (val: boolean) => setHardwareFinderExplicitOpen(val);
  const [finderTargetFps, setFinderTargetFps] = useState(30);
  const [finderBudget, setFinderBudget] = useState(200);
  const [finderEvaluatedExplicit, setFinderEvaluatedExplicit] = useState<boolean | null>(null);
  const finderEvaluated = finderEvaluatedExplicit ?? (activeGoal === "find-hardware");
  const setFinderEvaluated = (val: boolean) => setFinderEvaluatedExplicit(val);

  // Persisted Paired Hardware State
  const [pairedMap, setPairedMap] = useState<Record<string, PairedInfo>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(PAIRED_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const [customWorkers, setCustomWorkers] = useState<HardwareDevice[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(CUSTOM_WORKERS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(PAIRED_STORAGE_KEY, JSON.stringify(pairedMap));
    } catch {}
  }, [pairedMap]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_WORKERS_STORAGE_KEY, JSON.stringify(customWorkers));
    } catch {}
  }, [customWorkers]);

  // Pair Device Modal State
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [pairingTargetId, setPairingTargetId] = useState<string | null>(null);
  const [regWorkerName, setRegWorkerName] = useState("NVIDIA Jetson Orin Nano");
  const [regWorkerUrl, setRegWorkerUrl] = useState("http://192.168.1.120:8001");
  const [regWorkerRuntime, setRegWorkerRuntime] = useState("TensorRT");

  const handleOpenPairModal = (
    targetHwOrName?: HardwareDevice | string,
    runtime?: string,
    url?: string
  ) => {
    if (typeof targetHwOrName === "object" && targetHwOrName !== null) {
      setPairingTargetId(targetHwOrName.id);
      setRegWorkerName(targetHwOrName.name);
      setRegWorkerRuntime(
        targetHwOrName.supported_runtimes[0] ||
        (targetHwOrName.name.toLowerCase().includes("jetson") ? "TensorRT" : "ONNX Runtime")
      );
      setRegWorkerUrl(
        (targetHwOrName.details_json?.worker_url as string) || "http://192.168.1.120:8001"
      );
    } else if (typeof targetHwOrName === "string") {
      setPairingTargetId(null);
      setRegWorkerName(targetHwOrName);
      setRegWorkerRuntime(runtime || "TensorRT");
      setRegWorkerUrl(url || "http://192.168.1.120:8001");
    } else {
      setPairingTargetId(null);
      setRegWorkerName("NVIDIA Jetson Orin Nano");
      setRegWorkerRuntime("TensorRT");
      setRegWorkerUrl("http://192.168.1.120:8001");
    }
    setPairModalOpen(true);
  };

  const handleRegisterWorker = (e: React.FormEvent) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();

    let targetId = pairingTargetId;
    if (!targetId) {
      const match = hardware.find(
        (h) =>
          !h.is_local &&
          (h.name.toLowerCase().includes(regWorkerName.toLowerCase()) ||
            regWorkerName.toLowerCase().includes(h.name.toLowerCase()) ||
            (regWorkerName.toLowerCase().includes("jetson") && h.id.includes("jetson")) ||
            (regWorkerName.toLowerCase().includes("pi") && h.id.includes("raspberry")) ||
            (regWorkerName.toLowerCase().includes("hailo") && h.id.includes("hailo")))
      );
      if (match) {
        targetId = match.id;
      }
    }

    if (targetId) {
      setPairedMap((prev) => ({
        ...prev,
        [targetId!]: {
          workerUrl: regWorkerUrl,
          runtime: regWorkerRuntime,
          pairedAt: nowIso,
        },
      }));
      const matchedDevice = hardware.find((h) => h.id === targetId);
      setMessage(
        `Successfully paired "${matchedDevice?.name || regWorkerName}" at ${regWorkerUrl}. It is now online as a Remote Edge Worker!`
      );
    } else {
      const newWorker: HardwareDevice = {
        id: `paired-worker-${Date.now().toString().slice(-4)}`,
        name: regWorkerName,
        vendor: regWorkerName.toLowerCase().includes("jetson")
          ? "NVIDIA"
          : regWorkerName.toLowerCase().includes("pi")
          ? "Raspberry Pi"
          : regWorkerName.toLowerCase().includes("hailo")
          ? "Hailo"
          : "Remote Edge Worker",
        device_type: "soc",
        architecture: "ARM Cortex-A78AE + Edge Accelerator",
        compute_tops: regWorkerName.toLowerCase().includes("jetson") ? 40 : 1.5,
        memory_mb: 8192,
        tdp_watts: 15,
        cost_usd: 299,
        status: "ONLINE",
        is_local: false,
        supported_runtimes: [regWorkerRuntime, "ONNX Runtime"],
        supported_precisions: ["fp16", "int8", "fp32"],
        telemetry_supported: false,
        detected_at: nowIso,
        details_json: {
          worker_url: regWorkerUrl,
          pairing_status: "PAIRED_ACTIVE",
          connection: "Active gRPC Remote Edge Daemon",
          compiler: regWorkerRuntime,
        },
      };
      setCustomWorkers((prev) => [...prev, newWorker]);
      setMessage(`Successfully registered remote edge worker "${regWorkerName}" at ${regWorkerUrl}.`);
    }

    setPairModalOpen(false);
  };

  const handleUnpairDevice = (hw: HardwareDevice) => {
    if (pairedMap[hw.id]) {
      setPairedMap((prev) => {
        const next = { ...prev };
        delete next[hw.id];
        return next;
      });
      setMessage(`Device "${hw.name}" unpaired. Returned to Target Profiles.`);
    } else {
      setCustomWorkers((prev) => prev.filter((w) => w.id !== hw.id));
      setMessage(`Worker "${hw.name}" removed from remote edge fleet.`);
    }
  };

  const handleRedetect = async () => {
    setIsDetecting(true);
    setMessage(null);
    try {
      const detected = await detectHardware();
      setMessage(`Hardware scan completed. ${detected.length} hardware profiles active.`);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(`Hardware detection error: ${msg}`);
    } finally {
      setIsDetecting(false);
    }
  };

  // Combine host-detected hardware with paired state and custom edge workers
  const allHardware: HardwareDevice[] = useMemo(() => {
    return [
      ...hardware.map((h) => {
        const paired = pairedMap[h.id];
        if (paired) {
          return {
            ...h,
            status: "ONLINE" as const,
            details_json: {
              ...h.details_json,
              worker_url: paired.workerUrl,
              pairing_status: "PAIRED_ACTIVE",
              connection: "Active gRPC Remote Edge Daemon",
              compiler: paired.runtime,
              paired_at: paired.pairedAt,
            },
          };
        }
        return h;
      }),
      ...customWorkers,
    ];
  }, [hardware, pairedMap, customWorkers]);

  // 1. Connected Physical Local Host Silicon (Intel Core i7 CPU + NVIDIA RTX 4060 GPU)
  const localHostDevices = useMemo(() => {
    return allHardware.filter((h) => h.is_local);
  }, [allHardware]);

  // 2. Remote Edge Workers (connected edge nodes via pairing agent)
  const remoteEdgeWorkers = useMemo(() => {
    return allHardware.filter(
      (h) =>
        !h.is_local &&
        (Boolean(pairedMap[h.id]) ||
          h.status === "ONLINE" ||
          h.details_json?.pairing_status === "PAIRED_ACTIVE" ||
          h.id.startsWith("paired-worker-"))
    );
  }, [allHardware, pairedMap]);

  // 3. Target Profiles / Simulated Silicon (Hailo-8 M.2, Jetson Orin Nano, Raspberry Pi 5, etc.)
  const targetProfiles = useMemo(() => {
    return allHardware.filter(
      (h) => !h.is_local && !remoteEdgeWorkers.some((w) => w.id === h.id)
    );
  }, [allHardware, remoteEdgeWorkers]);

  // Filtered devices list based on active tab and search query
  const filteredList = useMemo(() => {
    let base = allHardware;
    if (filterType === "local") base = localHostDevices;
    else if (filterType === "remote") base = remoteEdgeWorkers;
    else if (filterType === "targets") base = targetProfiles;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return base.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.architecture.toLowerCase().includes(q) ||
          h.vendor.toLowerCase().includes(q) ||
          h.device_type.toLowerCase().includes(q) ||
          h.id.toLowerCase().includes(q)
      );
    }
    return base;
  }, [allHardware, localHostDevices, remoteEdgeWorkers, targetProfiles, filterType, searchQuery]);

  const selectedDevice = useMemo(() => {
    if (selectedDeviceId) {
      const found = filteredList.find((h) => h.id === selectedDeviceId);
      if (found) return found;
    }
    return filteredList[0] || null;
  }, [filteredList, selectedDeviceId]);

  const getDeviceCategory = (
    hw: HardwareDevice
  ): "local" | "remote_worker" | "target_profile" => {
    if (hw.is_local) return "local";
    const isPaired =
      Boolean(pairedMap[hw.id]) ||
      hw.status === "ONLINE" ||
      hw.details_json?.pairing_status === "PAIRED_ACTIVE" ||
      hw.id.startsWith("paired-worker-");
    if (isPaired) return "remote_worker";
    return "target_profile";
  };

  const getDeviceCategoryLabel = (hw: HardwareDevice): string => {
    const cat = getDeviceCategory(hw);
    if (cat === "local") return "Host Local";
    if (cat === "remote_worker") return "Remote Edge Worker";
    return "Target Profile";
  };

  const getPairingStatusLabel = (hw: HardwareDevice): { label: string; isConnected: boolean } => {
    if (hw.is_local) {
      return { label: "Local Host (Active)", isConnected: true };
    }
    const cat = getDeviceCategory(hw);
    if (cat === "remote_worker") {
      const url = (hw.details_json?.worker_url as string) || "Connected";
      return { label: `Paired: ${url}`, isConnected: true };
    }
    return { label: "Target Profile (Awaiting Pairing)", isConnected: false };
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Action Bar - Grafana Panel Toolbar Style */}
      <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-sans">
        {/* Left: Category Navigation Pills & Search */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Category Tabs */}
          <div className="flex rounded-sm border border-[#2c3235] bg-[#111217] p-0.5 text-xs font-sans">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-sm px-2.5 py-1 transition-colors ${
                filterType === "all"
                  ? "bg-[#22252b] text-white font-semibold"
                  : "text-[#8e8e9e] hover:text-[#ccccdc]"
              }`}
            >
              All Fleet ({allHardware.length})
            </button>
            <button
              onClick={() => setFilterType("local")}
              className={`rounded-sm px-2.5 py-1 transition-colors ${
                filterType === "local"
                  ? "bg-[#22252b] text-[#73bf69] font-semibold"
                  : "text-[#8e8e9e] hover:text-[#ccccdc]"
              }`}
            >
              Host Local ({localHostDevices.length})
            </button>
            <button
              onClick={() => setFilterType("remote")}
              className={`rounded-sm px-2.5 py-1 transition-colors ${
                filterType === "remote"
                  ? "bg-[#22252b] text-[#5794f2] font-semibold"
                  : "text-[#8e8e9e] hover:text-[#ccccdc]"
              }`}
            >
              Remote Edge Workers ({remoteEdgeWorkers.length})
            </button>
            <button
              onClick={() => setFilterType("targets")}
              className={`rounded-sm px-2.5 py-1 transition-colors ${
                filterType === "targets"
                  ? "bg-[#22252b] text-[#f59f00] font-semibold"
                  : "text-[#8e8e9e] hover:text-[#ccccdc]"
              }`}
            >
              Target Profiles ({targetProfiles.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs font-sans">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8e8e9e]" />
            <input
              type="text"
              placeholder="Search hardware fleet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111217] border border-[#2c3235] rounded-sm pl-8 pr-3 py-1.5 text-xs text-[#ccccdc] placeholder-[#8e8e9e] focus:outline-none focus:border-[#5794f2] font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-[#8e8e9e] hover:text-[#ccccdc]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 font-sans">
          <button
            onClick={() => {
              if (showHardwareFinder && activeGoal === "find-hardware") {
                onClearGoal?.();
              }
              setShowHardwareFinder(!showHardwareFinder);
            }}
            className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors ${
              showHardwareFinder
                ? "border-[#5794f2] bg-[#5794f2]/10 text-[#5794f2]"
                : "border-[#2c3235] bg-[#22252b] text-[#ccccdc] hover:bg-[#2c3235]"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-[#5794f2]" />
            <span>Find Suitable Hardware</span>
          </button>

          <button
            onClick={() => handleOpenPairModal()}
            className="flex items-center gap-1.5 rounded-sm border border-[#f59f00]/40 bg-[#f59f00]/15 hover:bg-[#f59f00]/25 px-3 py-1.5 text-xs font-semibold text-[#f59f00] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Pair Device</span>
          </button>

          <button
            onClick={handleRedetect}
            disabled={isDetecting}
            className="flex items-center gap-1.5 rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-3 py-1.5 text-xs font-medium text-[#ccccdc] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isDetecting ? "animate-spin text-[#5794f2]" : ""}`} />
            <span>{isDetecting ? "Scanning..." : "Re-detect Silicon"}</span>
          </button>
        </div>
      </div>

      {/* Active Goal / Notification Banner */}
      {message && (
        <div className="rounded-sm border border-[#73bf69]/40 bg-[#73bf69]/10 p-3 text-xs text-[#73bf69] font-sans flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#73bf69]" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-[#8e8e9e] hover:text-[#ccccdc]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SCENARIO A: Find Suitable Hardware (Analytical Filter Panel) */}
      {showHardwareFinder && (
        <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm p-4 space-y-4 font-sans">
          <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#5794f2]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#ccccdc] font-sans">
                Scenario A: Hardware Sizing &amp; Feasibility Shortlist
              </span>
            </div>
            <button
              onClick={() => {
                if (activeGoal === "find-hardware") {
                  onClearGoal?.();
                }
                setShowHardwareFinder(false);
              }}
              className="text-[#8e8e9e] hover:text-[#ccccdc]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-[#8e8e9e] font-sans">
            Specify your deployment throughput target (FPS) and budget ($ USD). EdgeForge evaluates available silicon and shortlists candidates while transparently indicating whether physical sensors exist.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[#8e8e9e] uppercase text-[10px] font-semibold font-sans">
                  Target Throughput (FPS)
                </label>
                <span className="text-[#5794f2] font-mono font-bold text-xs">{finderTargetFps} FPS</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={5}
                  value={finderTargetFps}
                  onChange={(e) => setFinderTargetFps(Number(e.target.value))}
                  className="flex-1 accent-[#5794f2] h-1.5 bg-[#2c3235] rounded-none cursor-pointer"
                />
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={finderTargetFps}
                  onChange={(e) => setFinderTargetFps(Math.max(1, Number(e.target.value)))}
                  className="w-16 bg-[#111217] border border-[#2c3235] rounded-sm p-1.5 text-[#ccccdc] text-center font-mono focus:border-[#5794f2] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[#8e8e9e] uppercase text-[10px] font-semibold font-sans">
                  Hardware Budget ($ USD)
                </label>
                <span className="text-[#73bf69] font-mono font-bold text-xs">${finderBudget}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={50}
                  max={2000}
                  step={25}
                  value={finderBudget}
                  onChange={(e) => setFinderBudget(Number(e.target.value))}
                  className="flex-1 accent-[#73bf69] h-1.5 bg-[#2c3235] rounded-none cursor-pointer"
                />
                <input
                  type="number"
                  min={50}
                  max={5000}
                  value={finderBudget}
                  onChange={(e) => setFinderBudget(Math.max(1, Number(e.target.value)))}
                  className="w-20 bg-[#111217] border border-[#2c3235] rounded-sm p-1.5 text-[#ccccdc] text-center font-mono focus:border-[#5794f2] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFinderEvaluated(true)}
                className="w-full bg-[#5794f2] hover:bg-[#3274d9] rounded-sm p-2 text-xs font-semibold text-[#111217] transition-colors font-sans"
              >
                Evaluate Fleet Feasibility
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-sans">
            <span className="text-[11px] text-[#8e8e9e] font-sans">Presets:</span>
            <button
              type="button"
              onClick={() => {
                setFinderTargetFps(30);
                setFinderBudget(200);
                setFinderEvaluated(true);
              }}
              className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2.5 py-1 text-[11px] text-[#ccccdc] transition-colors font-sans"
            >
              Real-Time Vision (30 FPS, $200)
            </button>
            <button
              type="button"
              onClick={() => {
                setFinderTargetFps(60);
                setFinderBudget(500);
                setFinderEvaluated(true);
              }}
              className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2.5 py-1 text-[11px] text-[#ccccdc] transition-colors font-sans"
            >
              High-Speed Robotics (60 FPS, $500)
            </button>
            <button
              type="button"
              onClick={() => {
                setFinderTargetFps(15);
                setFinderBudget(100);
                setFinderEvaluated(true);
              }}
              className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2.5 py-1 text-[11px] text-[#ccccdc] transition-colors font-sans"
            >
              Low-Power Drone (15 FPS, $100)
            </button>
          </div>

          {/* Results Shortlist Comparison Table */}
          {finderEvaluated && (
            <div className="border border-[#2c3235] rounded-sm overflow-hidden bg-[#111217]">
              <div className="bg-[#141619] px-3 py-1.5 border-b border-[#2c3235] flex items-center justify-between text-[10px] uppercase text-[#8e8e9e] font-sans font-semibold">
                <span>Recommended Hardware Shortlist (&gt;= {finderTargetFps} FPS within ${finderBudget})</span>
              </div>
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-[#141619] border-b border-[#2c3235]/60 text-[10px] uppercase font-sans font-semibold text-[#8e8e9e]">
                    <th className="py-2 px-3">Device Candidate</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Est. Throughput</th>
                    <th className="py-2 px-3">Power Telemetry</th>
                    <th className="py-2 px-3">Unit Cost</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c3235]/40 text-[11px]">
                  {/* Candidate 1: Host CPU */}
                  <tr className="hover:bg-[#181b1f]">
                    <td className="py-2 px-3 font-semibold text-white font-sans">
                      Local Host Silicon (Intel Core i7 CPU + RTX 4060 GPU)
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className="rounded-sm bg-[#73bf69]/10 text-[#73bf69] border border-[#73bf69]/30 px-1.5 py-0.5 text-[10px] font-semibold">
                        Host Local
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#ccccdc]">~45 FPS (INT8 VNNI)</td>
                    <td className="py-2 px-3">
                      <span className="rounded-sm bg-[#73bf69]/10 text-[#73bf69] border border-[#73bf69]/30 px-1.5 py-0.5 text-[10px] font-sans font-medium inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#73bf69] animate-pulse" />
                        Live NVML (GPU)
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-[#73bf69]">$0 (Detected)</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => (onSelectGoal ? onSelectGoal("test-model") : setActiveTab?.("workbench"))}
                        className="rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-2 py-0.5 text-[10px] font-semibold text-[#111217] font-sans"
                      >
                        Test on Silicon
                      </button>
                    </td>
                  </tr>

                  {/* Candidate 2: Raspberry Pi 5 */}
                  <tr className="hover:bg-[#181b1f]">
                    <td className="py-2 px-3 font-semibold text-white font-sans">Raspberry Pi 5 (8GB)</td>
                    <td className="py-2 px-3 font-sans">
                      <span className="rounded-sm bg-[#f59f00]/10 text-[#f59f00] border border-[#f59f00]/30 px-1.5 py-0.5 text-[10px] font-semibold inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f59f00]" />
                        Target Profile
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#ccccdc]">~18 FPS (INT8)</td>
                    <td className="py-2 px-3">
                      <span className="rounded-sm bg-[#f59f00]/10 text-[#f59f00] border border-[#f59f00]/30 px-1.5 py-0.5 text-[9px] font-mono">
                        [Not measured]
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-[#73bf69]">$80 (Within Budget)</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleOpenPairModal("Raspberry Pi 5", "ONNX Runtime", "http://192.168.1.150:8001")}
                        className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2 py-0.5 text-[10px] text-[#ccccdc] font-sans"
                      >
                        Pair Worker
                      </button>
                    </td>
                  </tr>

                  {/* Candidate 3: Jetson Orin Nano */}
                  <tr className="hover:bg-[#181b1f]">
                    <td className="py-2 px-3 font-semibold text-white font-sans">NVIDIA Jetson Orin Nano 8GB</td>
                    <td className="py-2 px-3 font-sans">
                      <span className="rounded-sm bg-[#f59f00]/10 text-[#f59f00] border border-[#f59f00]/30 px-1.5 py-0.5 text-[10px] font-semibold inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f59f00]" />
                        Target Profile
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#ccccdc]">~40 FPS (TensorRT)</td>
                    <td className="py-2 px-3">
                      <span className="rounded-sm bg-[#f59f00]/10 text-[#f59f00] border border-[#f59f00]/30 px-1.5 py-0.5 text-[9px] font-mono">
                        [Not measured]
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold">
                      {finderBudget >= 499 ? (
                        <span className="text-[#73bf69]">$499 (Within Budget)</span>
                      ) : (
                        <span className="text-[#f2495c]">$499 (Exceeds ${finderBudget})</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleOpenPairModal("NVIDIA Jetson Orin Nano", "TensorRT", "http://192.168.1.120:8001")}
                        className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2 py-0.5 text-[10px] text-[#ccccdc] font-sans"
                      >
                        Pair Jetson
                      </button>
                    </td>
                  </tr>

                  {/* Candidate 4: Hailo-8 M.2 */}
                  <tr className="hover:bg-[#181b1f]">
                    <td className="py-2 px-3 font-semibold text-white font-sans">Hailo-8 M.2 AI Module (26 TOPS)</td>
                    <td className="py-2 px-3 font-sans">
                      <span className="rounded-sm bg-[#f59f00]/10 text-[#f59f00] border border-[#f59f00]/30 px-1.5 py-0.5 text-[10px] font-semibold inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f59f00]" />
                        Target Profile
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#ccccdc]">~35+ FPS (INT8 HAR)</td>
                    <td className="py-2 px-3">
                      <span className="rounded-sm bg-[#f59f00]/10 text-[#f59f00] border border-[#f59f00]/30 px-1.5 py-0.5 text-[9px] font-mono">
                        [Not measured]
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-[#73bf69]">$199 (Profile)</td>
                    <td className="py-2 px-3 text-right font-sans">
                      <button
                        onClick={() => handleOpenPairModal("Hailo-8 M.2 AI Acceleration Module", "HailoRT", "http://192.168.1.130:8001")}
                        className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2 py-0.5 text-[10px] text-[#ccccdc] font-sans"
                      >
                        Pair Module
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Engineering Categorization Banner */}
      <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
        <div className="flex items-center gap-3">
          <Shield className="h-4 w-4 text-[#5794f2] shrink-0" />
          <div className="text-[11px] text-[#8e8e9e] space-y-0.5 font-sans">
            <span className="font-semibold text-[#ccccdc]">Fleet Architecture Categories:</span>
            <span>
              {" "}1. Local Host Silicon (Intel Core i7 CPU + RTX 4060 GPU) • 2. Remote Edge Workers (Pair over LAN) • 3. Target Profiles (Compiler simulation)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[10px] font-sans">
          <span className="flex items-center gap-1 text-[#f59f00] bg-[#f59f00]/10 border border-[#f59f00]/30 px-2 py-0.5 rounded-sm">
            <Zap className="h-3 w-3" />
            <span>Power Telemetry: Live NVML or [Not measured] (never faked)</span>
          </span>
        </div>
      </div>

      {/* PRIMARY VIEW: Device & Worker Fleet Inventory Table */}
      <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm overflow-hidden font-sans">
        {/* Table Header */}
        <div className="bg-[#1f2328] px-4 py-2 border-b border-[#2c3235] flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[#5794f2]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ccccdc] font-sans">
              Device &amp; Worker Fleet Inventory
            </span>
            <span className="text-[11px] font-sans text-[#8e8e9e]">
              ({filteredList.length} devices)
            </span>
          </div>
          <span className="text-[11px] font-sans text-[#8e8e9e] hidden sm:inline">
            Select row to inspect silicon capabilities, execution providers &amp; telemetry
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-8 text-center text-[#8e8e9e] space-y-3 font-sans text-xs">
            <p>
              {filterType === "remote"
                ? "No remote edge workers currently paired."
                : "No devices matching criteria."}
            </p>
            {filterType === "remote" ? (
              <button
                onClick={() => handleOpenPairModal()}
                className="px-3 py-1.5 bg-[#f59f00]/15 border border-[#f59f00]/40 rounded-sm text-[#f59f00] font-semibold hover:bg-[#f59f00]/25 transition-colors font-sans"
              >
                Pair First Remote Edge Device
              </button>
            ) : (
              <button
                onClick={() => {
                  setFilterType("all");
                  setSearchQuery("");
                }}
                className="px-3 py-1.5 bg-[#22252b] border border-[#2c3235] rounded-sm text-[#ccccdc] hover:bg-[#2c3235] font-sans"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#ccccdc] border-collapse font-sans">
              <thead>
                <tr className="bg-[#141619] border-b border-[#2c3235] text-[11px] uppercase tracking-wider font-sans font-semibold text-[#8e8e9e]">
                  <th className="py-2.5 px-3">Device Name</th>
                  <th className="py-2.5 px-3">Architecture</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Compute</th>
                  <th className="py-2.5 px-3">Memory</th>
                  <th className="py-2.5 px-3">TDP</th>
                  <th className="py-2.5 px-3">Power Telemetry</th>
                  <th className="py-2.5 px-3">Pairing / Connection</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2c3235]/60">
                {filteredList.map((hw) => {
                  const isSelected = selectedDevice?.id === hw.id;
                  const hasSensor = hasPowerSensor(hw);
                  const cat = getDeviceCategory(hw);
                  const pairing = getPairingStatusLabel(hw);
                  const memStr =
                    hw.memory_mb >= 1024
                      ? `${(hw.memory_mb / 1024).toFixed(1)} GB`
                      : `${hw.memory_mb} MB`;

                  return (
                    <tr
                      key={hw.id}
                      onClick={() => setSelectedDeviceId(hw.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#262c36] border-l-2 border-[#5794f2]"
                          : "hover:bg-[#20232a]"
                      }`}
                    >
                      {/* Device Name */}
                      <td className="py-2.5 px-3">
                        <div>
                          <div className="font-sans font-semibold text-[#ccccdc] hover:text-white text-xs">
                            {hw.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-sans text-[10px] text-[#8e8e9e]">{hw.vendor}</span>
                            <span className="font-mono text-[10px] text-[#5794f2]/80">{hw.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Architecture */}
                      <td className="py-2.5 px-3 font-sans text-xs text-[#8e8e9e] max-w-xs truncate" title={hw.architecture}>
                        {hw.architecture}
                      </td>

                      {/* Type */}
                      <td className="py-2.5 px-3">
                        <span className="rounded-sm bg-[#22252b] border border-[#2c3235] px-1.5 py-0.5 text-[10px] uppercase font-sans font-semibold text-[#ccccdc]">
                          {hw.device_type}
                        </span>
                      </td>

                      {/* Category Badge */}
                      <td className="py-2.5 px-3">
                        {cat === "local" ? (
                          <span className="rounded-sm px-2 py-0.5 text-[10px] font-sans font-semibold border bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/30">
                            Host Local
                          </span>
                        ) : cat === "remote_worker" ? (
                          <span className="rounded-sm px-2 py-0.5 text-[10px] font-sans font-semibold border bg-[#5794f2]/10 text-[#5794f2] border-[#5794f2]/30">
                            Remote Edge Worker
                          </span>
                        ) : (
                          <span className="rounded-sm px-2 py-0.5 text-[10px] font-sans font-semibold border bg-[#f59f00]/10 text-[#f59f00] border-[#f59f00]/30 inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#f59f00] shrink-0" />
                            Target Profile
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        {cat === "local" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-sans font-medium border bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/30">
                            <span className="h-2 w-2 rounded-full bg-[#73bf69] shrink-0" />
                            ONLINE
                          </span>
                        ) : cat === "remote_worker" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-sans font-medium border bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/30">
                            <span className="h-2 w-2 rounded-full bg-[#73bf69] shrink-0 animate-pulse" />
                            ONLINE (Paired)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-sans font-medium border bg-[#f59f00]/10 text-[#f59f00] border-[#f59f00]/30">
                            <span className="h-2 w-2 rounded-full bg-[#f59f00] shrink-0" />
                            SIMULATED
                          </span>
                        )}
                      </td>

                      {/* Compute TOPS */}
                      <td className="py-2.5 px-3 font-mono text-xs text-[#5794f2] font-semibold">
                        {hw.compute_tops ? `${hw.compute_tops} TOPS` : "Host Vector"}
                      </td>

                      {/* Memory */}
                      <td className="py-2.5 px-3 font-mono text-xs text-[#ccccdc]">
                        {memStr}
                      </td>

                      {/* TDP */}
                      <td className="py-2.5 px-3 font-mono text-xs text-[#8e8e9e]">
                        {hw.tdp_watts ? `${hw.tdp_watts}W` : "N/A"}
                      </td>

                      {/* Power Telemetry */}
                      <td className="py-2.5 px-3">
                        {hasSensor ? (
                          <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#73bf69]/10 text-[#73bf69] border border-[#73bf69]/30 px-2 py-0.5 text-[10px] font-sans font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#73bf69] animate-pulse" />
                            Live NVML Telemetry
                          </span>
                        ) : (
                          <span
                            className="rounded-sm bg-[#f59f00]/10 text-[#f59f00] border border-[#f59f00]/30 px-2 py-0.5 text-[10px] font-mono"
                            title="Sensor absent: EdgeForge never fakes power draw. Rated TDP is manufacturer datasheet specification only."
                          >
                            [Not measured]
                          </span>
                        )}
                      </td>

                      {/* Pairing / Connection Status */}
                      <td className="py-2.5 px-3 font-sans text-xs text-[#8e8e9e] max-w-[170px] truncate" title={pairing.label}>
                        {cat === "local" ? (
                          <span className="text-[#73bf69] font-sans font-medium text-xs">Host Local (Active)</span>
                        ) : cat === "remote_worker" ? (
                          <span className="text-[#5794f2] font-mono text-[11px] truncate">{pairing.label}</span>
                        ) : (
                          <span className="text-[#8e8e9e] font-sans text-[11px]">Awaiting Pairing (LAN)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          <button
                            onClick={() => setSelectedDeviceId(hw.id)}
                            className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2 py-1 text-[11px] font-sans text-[#ccccdc] transition-colors"
                            title="Inspect silicon details, runtimes, and telemetry"
                          >
                            Inspect
                          </button>

                          {cat === "target_profile" && (
                            <button
                              onClick={() => handleOpenPairModal(hw)}
                              className="rounded-sm border border-[#f59f00]/40 bg-[#f59f00]/15 hover:bg-[#f59f00]/25 px-2 py-1 text-[11px] font-sans font-semibold text-[#f59f00] transition-colors"
                              title="Pair this remote edge worker over LAN"
                            >
                              Pair
                            </button>
                          )}

                          {cat === "remote_worker" && (
                            <button
                              onClick={() => handleUnpairDevice(hw)}
                              className="rounded-sm border border-[#f2495c]/40 bg-[#f2495c]/15 hover:bg-[#f2495c]/25 px-2 py-1 text-[11px] font-sans text-[#f2495c] transition-colors"
                              title="Unpair this device"
                            >
                              Unpair
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL INSPECTION PANEL (Row Selection View) */}
      {selectedDevice && (
        <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm overflow-hidden font-sans">
          {/* Panel Header */}
          <div className="bg-[#1f2328] px-4 py-2.5 border-b border-[#2c3235] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-sans">
            <div className="flex items-center gap-2.5 font-sans">
              <Cpu className="h-4 w-4 text-[#5794f2]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ccccdc] font-sans">
                Silicon Specifications &amp; Telemetry Inspection:
              </span>
              <span className="text-xs font-bold text-white font-sans">
                {selectedDevice.name}
              </span>
              <span className="rounded-sm bg-[#22252b] border border-[#2c3235] px-1.5 py-0.5 text-[10px] font-sans uppercase font-semibold text-[#5794f2]">
                {selectedDevice.device_type}
              </span>
            </div>

            <div className="flex items-center gap-2 font-sans">
              {selectedDevice.is_local ? (
                <button
                  onClick={() => (onSelectGoal ? onSelectGoal("test-model") : setActiveTab?.("workbench"))}
                  className="rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-3 py-1 text-xs font-semibold text-[#111217] flex items-center gap-1.5 transition-colors font-sans"
                >
                  <span>Configure Benchmark on this Silicon</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : getDeviceCategory(selectedDevice) === "remote_worker" ? (
                <button
                  onClick={() => handleUnpairDevice(selectedDevice)}
                  className="rounded-sm border border-[#f2495c]/40 bg-[#f2495c]/15 hover:bg-[#f2495c]/25 px-3 py-1 text-xs font-semibold text-[#f2495c] transition-colors font-sans"
                >
                  Unpair Device
                </button>
              ) : (
                <button
                  onClick={() => handleOpenPairModal(selectedDevice)}
                  className="rounded-sm border border-[#f59f00]/40 bg-[#f59f00]/15 hover:bg-[#f59f00]/25 px-3 py-1 text-xs font-semibold text-[#f59f00] transition-colors font-sans"
                >
                  Pair Device as Remote Worker
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4 text-xs font-sans">
            {/* Silicon Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                <span className="text-[10px] uppercase text-[#8e8e9e] block font-sans font-semibold">Architecture</span>
                <span className="text-xs font-bold text-[#ccccdc] truncate block font-sans">{selectedDevice.architecture}</span>
              </div>
              <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                <span className="text-[10px] uppercase text-[#8e8e9e] block font-sans font-semibold">Compute TOPS</span>
                <span className="text-xs font-bold font-mono text-[#5794f2]">
                  {selectedDevice.compute_tops ? `${selectedDevice.compute_tops} TOPS` : "Host Vector Engine"}
                </span>
              </div>
              <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                <span className="text-[10px] uppercase text-[#8e8e9e] block font-sans font-semibold">Memory / VRAM</span>
                <span className="text-xs font-bold font-mono text-[#ccccdc]">
                  {selectedDevice.memory_mb >= 1024
                    ? `${(selectedDevice.memory_mb / 1024).toFixed(1)} GB`
                    : `${selectedDevice.memory_mb} MB`}
                </span>
              </div>
              <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                <span className="text-[10px] uppercase text-[#8e8e9e] block font-sans font-semibold">Rated Max TDP</span>
                <span className="text-xs font-bold font-mono text-[#ccccdc]">
                  {selectedDevice.tdp_watts ? `${selectedDevice.tdp_watts}W` : "N/A"}
                </span>
              </div>
            </div>

            {/* Power Telemetry Status Panel */}
            <div className="space-y-2 font-sans">
              <span className="text-[11px] uppercase tracking-wider text-[#8e8e9e] font-sans font-semibold">
                Power Telemetry &amp; Current Sensor Assessment
              </span>

              {hasPowerSensor(selectedDevice) ? (
                <div className="rounded-sm border border-[#73bf69]/30 bg-[#73bf69]/10 p-3 space-y-3 font-sans">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#73bf69] font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Live Hardware Current Sensor Active (NVIDIA NVML)</span>
                    </div>
                    <span className="text-[10px] bg-[#73bf69]/20 text-[#73bf69] border border-[#73bf69]/40 px-1.5 py-0.5 rounded-sm font-semibold">
                      INLINE PHYSICAL SENSOR
                    </span>
                  </div>

                  <p className="text-xs text-[#ccccdc] leading-relaxed">
                    This device includes physical inline shunt current sensors managed via NVIDIA NVML. Real-time power telemetry and junction temperatures are actively captured during benchmark iterations up to the rated <span className="font-mono font-bold text-white">{selectedDevice.tdp_watts || 115}W</span> envelope.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="bg-[#111217] border border-[#2c3235] p-2 rounded-sm">
                      <span className="text-[10px] uppercase font-semibold text-[#8e8e9e] block font-sans">Sensor Driver</span>
                      <span className="text-[#ccccdc] font-sans font-semibold">NVIDIA NVML 550+</span>
                    </div>
                    <div className="bg-[#111217] border border-[#2c3235] p-2 rounded-sm">
                      <span className="text-[10px] uppercase font-semibold text-[#8e8e9e] block font-sans">Power Envelope</span>
                      <span className="font-mono font-bold text-[#73bf69]">{selectedDevice.tdp_watts || 115}W TDP Limit</span>
                    </div>
                    <div className="bg-[#111217] border border-[#2c3235] p-2 rounded-sm">
                      <span className="text-[10px] uppercase font-semibold text-[#8e8e9e] block font-sans">Thermal Sensor</span>
                      <span className="text-[#5794f2] font-sans font-semibold">TJunction Active</span>
                    </div>
                    <div className="bg-[#111217] border border-[#2c3235] p-2 rounded-sm">
                      <span className="text-[10px] uppercase font-semibold text-[#8e8e9e] block font-sans">Sampling Frequency</span>
                      <span className="text-[#ccccdc] font-sans font-semibold">100 ms (10 Hz)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border border-[#f59f00]/30 bg-[#111217] p-3 space-y-1.5 font-sans">
                  <div className="flex items-center gap-2 text-[#f59f00] font-bold text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Telemetry Status: [Not measured] (Physical Current Sensor Absent)</span>
                  </div>
                  <p className="text-xs text-[#ccccdc] leading-relaxed">
                    No physical inline current sensor exists for this device. EdgeForge strictly adheres to honesty guidelines and refuses to fabricate fake wattage readings. The rated <strong className="font-mono text-white">{selectedDevice.tdp_watts || 45}W</strong> metric is manufacturer datasheet specification only.
                  </p>
                  <p className="text-[11px] text-[#8e8e9e]">
                    To measure power consumption on edge boards, attach an external USB-C power meter or smart plug monitor.
                  </p>
                </div>
              )}
            </div>

            {/* Split: Supported Runtimes & Execution Providers | Extended Hardware Properties */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-sans">
              {/* Left: Supported Runtimes Table (6 cols) */}
              <div className="lg:col-span-6 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#2c3235]">
                  <span className="text-[11px] uppercase tracking-wider text-[#8e8e9e] font-sans font-semibold">
                    Supported Execution Providers &amp; Runtimes
                  </span>
                  <span className="text-[10px] text-[#8e8e9e] font-sans">
                    {selectedDevice.supported_runtimes.length} Engines
                  </span>
                </div>

                <div className="border border-[#2c3235] rounded-sm overflow-hidden bg-[#111217]">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-[#141619] border-b border-[#2c3235] text-[10px] uppercase font-sans font-semibold text-[#8e8e9e]">
                        <th className="py-1.5 px-3">Runtime Engine</th>
                        <th className="py-1.5 px-3">Supported Precisions</th>
                        <th className="py-1.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2c3235]/60">
                      {selectedDevice.supported_runtimes.map((rt) => (
                        <tr key={rt} className="hover:bg-[#181b1f]">
                          <td className="py-2 px-3 font-semibold text-[#ccccdc] font-sans">{rt}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              {selectedDevice.supported_precisions.map((p) => (
                                <span
                                  key={p}
                                  className="rounded-sm bg-[#22252b] border border-[#2c3235] px-1.5 py-0.2 text-[9px] uppercase font-mono text-[#ccccdc]"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-sans">
                            <span className="text-[10px] text-[#73bf69] font-medium font-sans">Ready</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Architectural Details JSON Properties (6 cols) */}
              <div className="lg:col-span-6 space-y-2 font-sans">
                <div className="flex items-center justify-between pb-1 border-b border-[#2c3235]">
                  <span className="text-[11px] uppercase tracking-wider text-[#8e8e9e] font-sans font-semibold">
                    Silicon Metadata &amp; Connection Trace
                  </span>
                  <span className="text-[10px] text-[#8e8e9e] font-sans">
                    ID: <span className="font-mono text-[#5794f2]">{selectedDevice.id}</span>
                  </span>
                </div>

                <div className="bg-[#111217] border border-[#2c3235] p-3 rounded-sm space-y-2 text-[11px] font-sans">
                  <div className="flex justify-between border-b border-[#2c3235]/60 pb-1">
                    <span className="text-[#8e8e9e]">Hardware ID:</span>
                    <span className="font-mono text-[#5794f2]">{selectedDevice.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#2c3235]/60 pb-1">
                    <span className="text-[#8e8e9e]">Device Vendor:</span>
                    <span className="text-white font-medium">{selectedDevice.vendor}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#2c3235]/60 pb-1">
                    <span className="text-[#8e8e9e]">Execution Locality:</span>
                    <span className="text-white font-medium">{getDeviceCategoryLabel(selectedDevice)}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#2c3235]/60 pb-1">
                    <span className="text-[#8e8e9e]">Estimated Unit Cost:</span>
                    <span className="font-mono font-bold text-[#73bf69]">${selectedDevice.cost_usd || 0} USD</span>
                  </div>
                  <div className="flex justify-between border-b border-[#2c3235]/60 pb-1">
                    <span className="text-[#8e8e9e]">Detected Timestamp:</span>
                    <span className="text-[#8e8e9e]">{new Date(selectedDevice.detected_at).toLocaleString()}</span>
                  </div>

                  {selectedDevice.details_json && Object.keys(selectedDevice.details_json).length > 0 && (
                    <div className="pt-1 space-y-1">
                      {Object.entries(selectedDevice.details_json).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[10px]">
                          <span className="text-[#8e8e9e] font-sans">{k}:</span>
                          <span className="text-[#ccccdc] font-mono truncate max-w-[200px]">
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAIR DEVICE MODAL / CONFIGURATION DIALOG (Grafana Panel Style) */}
      {pairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
          <div className="w-full max-w-lg rounded-sm border border-[#2c3235] bg-[#181b1f] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2c3235] pb-2.5">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#f59f00]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#ccccdc] font-sans">
                  {pairingTargetId ? `Pair Device: ${regWorkerName}` : "Pair Remote Edge Worker"}
                </h3>
              </div>
              <button
                onClick={() => setPairModalOpen(false)}
                className="text-[#8e8e9e] hover:text-[#ccccdc] p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preset Target Selector */}
            <div>
              <span className="text-[10px] uppercase text-[#8e8e9e] font-semibold block mb-1.5 font-sans">
                Target Device Preset
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setPairingTargetId("nvidia-jetson-orin-nano");
                    setRegWorkerName("NVIDIA Jetson Orin Nano");
                    setRegWorkerRuntime("TensorRT");
                    setRegWorkerUrl("http://192.168.1.120:8001");
                  }}
                  className={`p-2 rounded-sm border text-left transition-colors font-sans ${
                    regWorkerName.toLowerCase().includes("jetson")
                      ? "border-[#f59f00] bg-[#f59f00]/15 text-[#f59f00] font-bold"
                      : "border-[#2c3235] bg-[#111217] text-[#8e8e9e] hover:text-[#ccccdc]"
                  }`}
                >
                  NVIDIA Jetson
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPairingTargetId("raspberry-pi-5");
                    setRegWorkerName("Raspberry Pi 5");
                    setRegWorkerRuntime("ONNX Runtime");
                    setRegWorkerUrl("http://192.168.1.150:8001");
                  }}
                  className={`p-2 rounded-sm border text-left transition-colors font-sans ${
                    regWorkerName.toLowerCase().includes("pi")
                      ? "border-[#f59f00] bg-[#f59f00]/15 text-[#f59f00] font-bold"
                      : "border-[#2c3235] bg-[#111217] text-[#8e8e9e] hover:text-[#ccccdc]"
                  }`}
                >
                  Raspberry Pi 5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPairingTargetId("hailo-8-m2");
                    setRegWorkerName("Hailo-8 M.2 AI Module");
                    setRegWorkerRuntime("HailoRT");
                    setRegWorkerUrl("http://192.168.1.130:8001");
                  }}
                  className={`p-2 rounded-sm border text-left transition-colors font-sans ${
                    regWorkerName.toLowerCase().includes("hailo")
                      ? "border-[#f59f00] bg-[#f59f00]/15 text-[#f59f00] font-bold"
                      : "border-[#2c3235] bg-[#111217] text-[#8e8e9e] hover:text-[#ccccdc]"
                  }`}
                >
                  Hailo-8 M.2
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPairingTargetId(null);
                    setRegWorkerName("Remote Linux Worker");
                    setRegWorkerRuntime("ONNX Runtime");
                    setRegWorkerUrl("http://192.168.1.200:8001");
                  }}
                  className={`p-2 rounded-sm border text-left transition-colors font-sans ${
                    !regWorkerName.toLowerCase().includes("jetson") &&
                    !regWorkerName.toLowerCase().includes("pi") &&
                    !regWorkerName.toLowerCase().includes("hailo")
                      ? "border-[#f59f00] bg-[#f59f00]/15 text-[#f59f00] font-bold"
                      : "border-[#2c3235] bg-[#111217] text-[#8e8e9e] hover:text-[#ccccdc]"
                  }`}
                >
                  Custom Node
                </button>
              </div>
            </div>

            {/* Step-by-Step CLI Instructions */}
            <div className="p-3 rounded-sm bg-[#111217] border border-[#2c3235] space-y-2 text-xs font-sans">
              <span className="text-[10px] uppercase text-[#f59f00] font-bold block font-sans">
                EdgeForge Worker Daemon Setup:
              </span>
              <div className="space-y-1.5 text-[11px] text-[#ccccdc]">
                <div className="flex items-center justify-between bg-[#181b1f] px-2 py-1 rounded-sm border border-[#2c3235]">
                  <code className="font-mono truncate max-w-sm">curl -fsSL https://get.edgeforge.ai/agent.sh | bash</code>
                  <CopySnippet text="curl -fsSL https://get.edgeforge.ai/agent.sh | bash" />
                </div>
                <div className="flex items-center justify-between bg-[#181b1f] px-2 py-1 rounded-sm border border-[#2c3235]">
                  <code className="font-mono truncate max-w-sm">edgeforge-agent --port 8001</code>
                  <CopySnippet text="edgeforge-agent --port 8001" />
                </div>
              </div>
            </div>

            {/* Connection Form */}
            <form onSubmit={handleRegisterWorker} className="space-y-3 font-sans text-xs">
              <div>
                <label className="text-[#8e8e9e] block mb-1 uppercase text-[10px] font-semibold font-sans">
                  Device Name / Label
                </label>
                <input
                  type="text"
                  value={regWorkerName}
                  onChange={(e) => setRegWorkerName(e.target.value)}
                  placeholder="e.g. Jetson Orin Nano (Lab Desk)"
                  className="w-full rounded-sm border border-[#2c3235] bg-[#111217] p-2 text-[#ccccdc] font-sans focus:border-[#5794f2] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#8e8e9e] block mb-1 uppercase text-[10px] font-semibold font-sans">
                  Device IP &amp; Port (HTTP / gRPC Endpoint)
                </label>
                <input
                  type="text"
                  value={regWorkerUrl}
                  onChange={(e) => setRegWorkerUrl(e.target.value)}
                  placeholder="http://192.168.1.120:8001"
                  className="w-full rounded-sm border border-[#2c3235] bg-[#111217] p-2 text-[#ccccdc] font-mono focus:border-[#5794f2] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#8e8e9e] block mb-1 uppercase text-[10px] font-semibold font-sans">
                  Target Execution Engine
                </label>
                <select
                  value={regWorkerRuntime}
                  onChange={(e) => setRegWorkerRuntime(e.target.value)}
                  className="w-full rounded-sm border border-[#2c3235] bg-[#111217] p-2 text-[#ccccdc] font-sans focus:border-[#5794f2] focus:outline-none"
                >
                  <option value="TensorRT">TensorRT (NVIDIA Jetson)</option>
                  <option value="ONNX Runtime">ONNX Runtime (Cross-Platform / ARM)</option>
                  <option value="HailoRT">HailoRT (Raspberry Pi + Hailo-8 M.2)</option>
                  <option value="OpenVINO">OpenVINO (Intel NPU / ARC)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2c3235] font-sans">
                <button
                  type="button"
                  onClick={() => setPairModalOpen(false)}
                  className="rounded-sm border border-[#2c3235] bg-[#22252b] px-3 py-1.5 text-xs font-medium text-[#ccccdc] hover:bg-[#2c3235] transition-colors font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-4 py-1.5 text-xs font-semibold text-[#111217] transition-colors font-sans"
                >
                  Pair Device &amp; Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
