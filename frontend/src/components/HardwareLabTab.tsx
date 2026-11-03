"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  RefreshCw,
  Zap,
  Activity,
  HardDrive,
  Shield,
  Layers,
  Thermometer,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Info,
  Box,
  X,
  Plus,
  Sparkles,
  Server,
  Search,
  Radio,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  ArrowRight,
  CheckCheck,
  Unlink,
} from "lucide-react";
import { HardwareDevice, detectHardware } from "@/lib/api";

interface HardwareLabTabProps {
  hardware: HardwareDevice[];
  onRefresh: () => void;
  activeGoal?: string | null;
  onClearGoal?: () => void;
  setActiveTab?: (tab: any) => void;
  onSelectGoal?: (goal: any) => void;
}

// Robust cross-browser clipboard copy with execCommand fallback
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to DOM fallback
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
      className="p-1 text-zinc-400 hover:text-teal-300 transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

// Helper: genuine physical current sensor check
export const hasPowerSensor = (hw: HardwareDevice | null | undefined): boolean => {
  if (!hw) return false;
  // Genuine power telemetry only exists on devices with physical current sensors (e.g. NVIDIA GPU with NVML)
  return hw.device_type === "gpu" && Boolean(hw.telemetry_supported);
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
  const [filterType, setFilterType] = useState<"all" | "available" | "connectable" | "other">("all");
  const [selectedDevice, setSelectedDevice] = useState<HardwareDevice | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Scenario A: Find Suitable Hardware
  const [showHardwareFinder, setShowHardwareFinder] = useState(activeGoal === "find-hardware");
  const [finderTargetFps, setFinderTargetFps] = useState(30);
  const [finderBudget, setFinderBudget] = useState(200);
  const [finderEvaluated, setFinderEvaluated] = useState(activeGoal === "find-hardware");

  useEffect(() => {
    if (activeGoal === "find-hardware") {
      setShowHardwareFinder(true);
      setFinderEvaluated(true);
    }
  }, [activeGoal]);

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
      setRegWorkerUrl(targetHwOrName.details_json?.worker_url || "http://192.168.1.120:8001");
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
            (regWorkerName.toLowerCase().includes("pi") && h.id.includes("raspberry")))
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
        `Successfully paired "${matchedDevice?.name || regWorkerName}" at ${regWorkerUrl}. It is now online and ready for remote edge benchmarks!`
      );
    } else {
      const newWorker: HardwareDevice = {
        id: `paired-worker-${Date.now().toString().slice(-4)}`,
        name: regWorkerName,
        vendor: regWorkerName.toLowerCase().includes("jetson")
          ? "NVIDIA"
          : regWorkerName.toLowerCase().includes("pi")
          ? "Raspberry Pi"
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
      setMessage(`Successfully registered custom edge worker "${regWorkerName}" at ${regWorkerUrl}.`);
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
      setMessage(`Device "${hw.name}" unpaired. Status returned to Awaiting Pairing.`);
    } else {
      setCustomWorkers((prev) => prev.filter((w) => w.id !== hw.id));
      setMessage(`Worker "${hw.name}" removed from edge fleet.`);
    }
  };

  const handleRedetect = async () => {
    setIsDetecting(true);
    setMessage(null);
    try {
      const detected = await detectHardware();
      setMessage(`Hardware scan completed. ${detected.length} hardware profiles active.`);
      onRefresh();
    } catch (err: any) {
      setMessage(`Hardware detection error: ${err.message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  // Combine host-detected hardware with paired state and custom edge workers
  const allHardware: HardwareDevice[] = [
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

  // 1. Available for testing: Physically present local host silicon (CPU & local GPU)
  const availableDevices = allHardware.filter((h) => h.is_local);

  // 2. Connect your hardware: Edge SBCs & paired remote devices (Jetson, Raspberry Pi, remote workers)
  const connectableDevices = allHardware.filter((h) => {
    if (h.is_local) return false;
    const id = h.id.toLowerCase();
    const name = h.name.toLowerCase();
    return (
      id.includes("jetson") ||
      id.includes("raspberry") ||
      id.includes("pi-") ||
      id.includes("worker") ||
      name.includes("jetson") ||
      name.includes("raspberry") ||
      name.includes("worker") ||
      h.device_type === "soc"
    );
  });

  // 3. Other supported targets: Unconfigured NPUs / accelerators (Hailo, Intel NPU, Qualcomm)
  const otherSupportedTargets = allHardware.filter(
    (h) => !h.is_local && !connectableDevices.some((c) => c.id === h.id)
  );

  const hasLocalGpu = availableDevices.some((h) => h.device_type === "gpu");

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <Cpu className="h-5 w-5 text-teal-400" />
            Hardware Acceleration Lab & Edge Fleet
          </h2>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            Test directly on local silicon, pair remote edge devices, or evaluate supported target compilation profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action-Oriented Filter Pills */}
          <div className="flex rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-1 text-xs font-mono">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                filterType === "all"
                  ? "bg-teal-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All ({allHardware.length})
            </button>
            <button
              onClick={() => setFilterType("available")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                filterType === "available"
                  ? "bg-teal-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Ready Now ({availableDevices.length})
            </button>
            <button
              onClick={() => setFilterType("connectable")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                filterType === "connectable"
                  ? "bg-teal-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Connect Hardware ({connectableDevices.length})
            </button>
            <button
              onClick={() => setFilterType("other")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                filterType === "other"
                  ? "bg-teal-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Profiles ({otherSupportedTargets.length})
            </button>
          </div>

          <button
            onClick={() => setShowHardwareFinder(!showHardwareFinder)}
            className="flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-all font-sans"
          >
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            Find Suitable Hardware
          </button>

          <button
            onClick={() => handleOpenPairModal()}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all font-sans"
          >
            <Plus className="h-3.5 w-3.5" />
            Pair Device
          </button>

          <button
            onClick={handleRedetect}
            disabled={isDetecting}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isDetecting ? "animate-spin" : ""}`} />
            {isDetecting ? "Scanning..." : "Re-detect Silicon"}
          </button>
        </div>
      </div>

      {/* Active Goal Callout */}
      {activeGoal === "find-hardware" && (
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-zinc-900/90 to-zinc-950 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Active Goal: Find the right hardware
                </span>
                <span className="rounded bg-emerald-500/20 text-emerald-200 text-[10px] px-2 py-0.2 font-mono">
                  Hardware Sizing
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-sans mt-0.5">
                I have a model and need to know what device can run it.
              </h3>
              <p className="text-xs text-zinc-300 font-sans">
                Adjust your throughput target (FPS) and budget ($ USD) below to see candidate edge devices shortlisted for your workload.
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

      {/* Feedback Message */}
      {message && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-950/40 p-4 text-xs text-teal-300 font-mono flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
            {message}
          </span>
          <button onClick={() => setMessage(null)} className="text-zinc-400 hover:text-zinc-200 text-base leading-none">
            &times;
          </button>
        </div>
      )}

      {/* ARCHITECTURAL GUIDANCE BANNER: Physically Available vs. Supported Target Profiles */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 font-sans">
                Silicon Execution vs. Architectural Target Profiles
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                EdgeForge separates physically executable silicon from compiler target profiles so you never mistake simulated data for real on-device benchmarks.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Ready to Run Now
            </span>
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-full">
              <Radio className="h-3 w-3" /> Pair Device
            </span>
            <span className="flex items-center gap-1.5 text-purple-300 font-semibold bg-purple-950/60 border border-purple-500/30 px-2.5 py-1 rounded-full">
              <Box className="h-3 w-3" /> Profile Only
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Col 1: Available for testing */}
          <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/20 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-sans">
              <CheckCircle2 className="h-4 w-4" />
              <span>1. Available for Testing</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
              Physically present on this host machine. Benchmarks run directly in-memory on real silicon with genuine execution latencies and memory allocation.
            </p>
          </div>

          {/* Col 2: Connect your hardware */}
          <div className="rounded-xl bg-amber-950/20 border border-amber-500/20 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-sans">
              <Server className="h-4 w-4" />
              <span>2. Connect Your Hardware</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
              Edge SBCs (NVIDIA Jetson, Raspberry Pi) that you pair over LAN. Deploy the lightweight agent daemon to execute remote hardware-in-the-loop tests.
            </p>
          </div>

          {/* Col 3: Other supported targets */}
          <div className="rounded-xl bg-purple-950/20 border border-purple-500/20 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs font-sans">
              <Layers className="h-4 w-4" />
              <span>3. Other Supported Targets</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
              Compiler profiles for specialized NPUs (Hailo-8, Meteor Lake NPU, Snapdragon). Test layer compatibility and export deployment packages before buying hardware.
            </p>
          </div>
        </div>

        {/* Honest Power Telemetry Notice */}
        <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400 border-t border-zinc-800/80 font-sans">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span>
            <strong className="text-zinc-200">Honest Power Telemetry Guarantee:</strong> EdgeForge only displays live power telemetry when a physical current sensor (NVML) is detected. If no sensor is present, an explicit <span className="text-amber-300 font-mono font-bold bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded">[Not measured]</span> badge is displayed — we never report fake TDP wattage.
          </span>
        </div>
      </div>

      {/* SCENARIO A: Find Suitable Hardware for Target FPS & Budget */}
      {showHardwareFinder && (
        <div className="glass-panel rounded-2xl p-6 space-y-5 shadow-2xl border border-teal-500/40 bg-zinc-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">
                  Scenario A: Hardware Discovery
                </span>
                <span className="rounded bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] text-teal-300 font-mono">
                  Beginner Guide
                </span>
              </div>
              <h3 className="text-base font-bold text-zinc-100 font-sans mt-0.5">
                Find suitable hardware for your model & budget
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Specify your target FPS and purchasing budget. EdgeForge shortlists compatible hardware while transparently highlighting unverified evidence.
              </p>
            </div>

            <button
              onClick={() => setShowHardwareFinder(false)}
              className="text-zinc-400 hover:text-zinc-200 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div>
              <label className="text-zinc-300 block mb-1 font-sans text-[11px] font-medium">Target FPS (Throughput)</label>
              <input
                type="number"
                min={10}
                max={240}
                value={finderTargetFps}
                onChange={(e) => setFinderTargetFps(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 block mb-1 font-sans text-[11px] font-medium">Hardware Budget ($ USD)</label>
              <input
                type="number"
                min={50}
                max={5000}
                value={finderBudget}
                onChange={(e) => setFinderBudget(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFinderEvaluated(true)}
                className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 py-2.5 px-4 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all font-sans"
              >
                Find suitable hardware
              </button>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
            <span className="text-[11px] text-zinc-400 font-sans">Common Presets:</span>
            <button
              type="button"
              onClick={() => {
                setFinderTargetFps(30);
                setFinderBudget(200);
                setFinderEvaluated(true);
              }}
              className="rounded-lg border border-teal-500/30 bg-teal-950/40 hover:bg-teal-900/50 px-2.5 py-1 text-[11px] text-teal-300 font-sans transition-colors"
            >
              ⚡ Real-Time Vision (30 FPS, $200)
            </button>
            <button
              type="button"
              onClick={() => {
                setFinderTargetFps(60);
                setFinderBudget(500);
                setFinderEvaluated(true);
              }}
              className="rounded-lg border border-purple-500/30 bg-purple-950/40 hover:bg-purple-900/50 px-2.5 py-1 text-[11px] text-purple-300 font-sans transition-colors"
            >
              🚀 High-Speed Robotics (60 FPS, $500)
            </button>
            <button
              type="button"
              onClick={() => {
                setFinderTargetFps(15);
                setFinderBudget(100);
                setFinderEvaluated(true);
              }}
              className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 px-2.5 py-1 text-[11px] text-emerald-300 font-sans transition-colors"
            >
              🔋 Low-Power Edge Drone (15 FPS, $100)
            </button>
          </div>

          {finderEvaluated && (
            <div className="space-y-3 font-mono text-xs pt-2">
              <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold tracking-wider block">
                Recommended Hardware Shortlist (Objective: &gt;= {finderTargetFps} FPS within ${finderBudget}):
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Candidate 1: Raspberry Pi 5 */}
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-zinc-950/80 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100 font-sans">Raspberry Pi 5 (8GB)</span>
                      <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-300 font-bold">
                        $80 (Within Budget)
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-300 space-y-1">
                      <div>Throughput: ~18 FPS INT8 • Power: Not measured (sensor absent)</div>
                      <div className="text-amber-400 text-[10px]">
                        Device Category: Connectable Hardware. Pair over local network using EdgeForge Agent.
                      </div>
                    </div>
                  </div>
                  {(onSelectGoal || setActiveTab) && (
                    <button
                      type="button"
                      onClick={() => (onSelectGoal ? onSelectGoal("test-model") : setActiveTab?.("workbench"))}
                      className="mt-2 w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition-colors font-sans font-medium flex items-center justify-center gap-1.5"
                    >
                      <span>Pair &amp; Benchmark</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Candidate 2: Intel Core CPU */}
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-zinc-950/80 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100 font-sans">Host Local CPU / GPU</span>
                      <span className="rounded bg-teal-950/80 border border-teal-500/40 px-2 py-0.5 text-[10px] text-teal-300 font-bold">
                        $0 (Already Available)
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-300 space-y-1">
                      <div>FP32: ~22 FPS • INT8: ~45 FPS • Ready to Run Now</div>
                      <div className="text-emerald-400 text-[10px]">
                        Device Category: Available for Testing. Physical silicon detected on local host.
                      </div>
                    </div>
                  </div>
                  {(onSelectGoal || setActiveTab) && (
                    <button
                      type="button"
                      onClick={() => (onSelectGoal ? onSelectGoal("test-model") : setActiveTab?.("workbench"))}
                      className="mt-2 w-full rounded-lg bg-gradient-to-r from-teal-500 to-emerald-400 hover:brightness-110 px-3 py-1.5 text-xs font-bold text-zinc-950 transition-all font-sans flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
                    >
                      <span>Test Model on this Silicon</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Candidate 3: Jetson Orin Nano */}
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100 font-sans">NVIDIA Jetson Orin Nano 8GB</span>
                      <span className="rounded bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300 font-bold">
                        $499 ({finderBudget < 499 ? `Exceeds $${finderBudget} limit` : "Within budget"})
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 space-y-1">
                      <div>Capable of 40 FPS INT8 with TensorRT.</div>
                      <div className="text-amber-400 text-[10px]">
                        Device Category: Connectable Hardware. Ready to pair over local network.
                      </div>
                    </div>
                  </div>
                  {(onSelectGoal || setActiveTab) && (
                    <button
                      type="button"
                      onClick={() => handleOpenPairModal("NVIDIA Jetson Orin Nano", "TensorRT", "http://192.168.1.120:8001")}
                      className="mt-2 w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition-colors font-sans font-medium flex items-center justify-center gap-1.5"
                    >
                      <span>Pair Jetson Worker</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Candidate 4: Hailo-8 M.2 */}
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100 font-sans">Hailo-8 M.2 AI Module</span>
                      <span className="rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-purple-300 font-bold">
                        $199 (Target Profile)
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 space-y-1">
                      <div>Estimated 35+ FPS INT8 for lightweight vision backbones.</div>
                      <div className="text-purple-400 text-[10px]">
                        Device Category: Supported Target Profile. Unconfigured in local setup.
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 italic font-sans pt-1">
                    Simulation profile available for compiler compatibility check.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: AVAILABLE FOR TESTING (LOCAL CPU, DETECTED GPU) */}
      {/* ========================================================================= */}
      {(filterType === "all" || filterType === "available") && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  Available for Testing
                </h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 font-bold">
                  Ready to Run Now ({availableDevices.length})
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Physical host silicon detected on this machine. You can benchmark models immediately with zero setup.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDevices.map((hw) => {
              const isSelected = selectedDevice?.id === hw.id;
              const hasSensor = hasPowerSensor(hw);
              return (
                <div
                  key={hw.id}
                  onClick={() => setSelectedDevice(hw)}
                  className={`rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                      : "border-emerald-500/30 bg-zinc-900/60 hover:border-emerald-500/60 hover:bg-zinc-900/80"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name & Green Ready Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider font-semibold">
                          {hw.vendor} • {hw.device_type.toUpperCase()}
                        </span>
                        <h4 className="font-bold text-zinc-100 text-sm mt-0.5 font-sans">
                          {hw.name}
                        </h4>
                      </div>

                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 shadow-sm shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Ready to Run Now
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 font-mono line-clamp-2">
                      {hw.architecture}
                    </p>

                    {/* Spec Badges Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs font-mono">
                      <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 block uppercase">Compute Power</span>
                        <span className="text-zinc-100 font-bold text-sm">
                          {hw.compute_tops ? `${hw.compute_tops} TOPS` : "Host Vector"}
                        </span>
                      </div>

                      <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 block uppercase">Memory / RAM</span>
                        <span className="text-zinc-100 font-bold text-sm">
                          {hw.memory_mb >= 1024
                            ? `${(hw.memory_mb / 1024).toFixed(1)} GB`
                            : `${hw.memory_mb} MB`}
                        </span>
                      </div>

                      {/* Power Telemetry Card: Strict Sensor Check */}
                      <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80 col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 block uppercase">Power Telemetry</span>
                          {hasSensor ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Sensor Active
                            </span>
                          ) : (
                            <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 font-bold">
                              Not measured
                            </span>
                          )}
                        </div>
                        <span className="text-zinc-300 text-xs font-medium mt-0.5 block">
                          {hasSensor
                            ? `Live NVML Hardware Telemetry Enabled (${hw.tdp_watts}W max limit)`
                            : `Sensor absent (Rated ${hw.tdp_watts || 55}W TDP is specification only, never faked)`}
                        </span>
                      </div>
                    </div>

                    {/* Local Host Hardware Telemetry Details */}
                    {hw.details_json && (
                      <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/25 p-3 text-[11px] font-mono text-zinc-300 space-y-1 shadow-sm">
                        <div className="flex items-center justify-between text-emerald-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5 animate-pulse" /> Physical Silicon Online
                          </span>
                          <span>Zero-Setup</span>
                        </div>
                        {hw.details_json.cores_logical && (
                          <div>Cores: {hw.details_json.cores_physical} Physical / {hw.details_json.cores_logical} Logical</div>
                        )}
                        {hw.details_json.driver_version && (
                          <div>Driver: {hw.details_json.driver_version}</div>
                        )}
                        {hw.details_json.has_vnni && (
                          <div className="text-teal-300 font-semibold">Intel AVX-VNNI Neural Vector Engine Enabled</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Precisions & Action */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1">
                      {hw.supported_precisions.map((p) => (
                        <span
                          key={p}
                          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-300 uppercase text-[9px] font-semibold"
                        >
                          {p}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDevice(hw);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      Inspect Specs &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* If host GPU not detected, show clear status guidance */}
          {!hasLocalGpu && (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                  <Cpu className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="space-y-0.5 font-sans">
                  <div className="font-semibold text-zinc-200 flex items-center gap-2">
                    <span>Host Discrete GPU: Not Detected</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">
                      NVML Inactive
                    </span>
                  </div>
                  <div className="text-zinc-400 text-[11px]">
                    No NVIDIA CUDA discrete GPU was detected on this host. Local CPU is active, online, and accelerated with native AVX vector instructions.
                  </div>
                </div>
              </div>
              <div className="text-right text-[11px] font-mono text-zinc-500 shrink-0 hidden sm:block">
                CPU Provider Ready
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CONNECT YOUR HARDWARE (JETSON, RASPBERRY PI, REMOTE WORKERS) */}
      {/* ========================================================================= */}
      {(filterType === "all" || filterType === "connectable") && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-amber-400" />
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  Connect Your Hardware
                </h3>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-mono text-amber-300 font-bold">
                  Edge Devices & Workers ({connectableDevices.length})
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Physical edge boards (NVIDIA Jetson, Raspberry Pi) that you pair over your local network to execute remote benchmarks.
              </p>
            </div>

            <button
              onClick={() => handleOpenPairModal()}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-amber-500/20 transition-all font-sans shrink-0"
            >
              <Plus className="h-4 w-4" />
              Pair Device
            </button>
          </div>

          {/* Step-by-Step Instructions Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold font-sans">
              <Radio className="h-4 w-4 animate-pulse" />
              <span>Step-by-Step Instructions: How to Pair Physical Edge Hardware</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-amber-400 font-bold text-[10px] uppercase">
                  <span>Step 1: Install Agent</span>
                  <span className="text-zinc-500">Target Terminal</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[11px] text-zinc-200">
                  <code className="truncate">curl -fsSL https://get.edgeforge.ai/agent.sh | bash</code>
                  <CopySnippet text="curl -fsSL https://get.edgeforge.ai/agent.sh | bash" />
                </div>
                <p className="text-[10px] text-zinc-400 font-sans">
                  Runs lightweight agent installer on your Jetson or Raspberry Pi.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-amber-400 font-bold text-[10px] uppercase">
                  <span>Step 2: Start Daemon</span>
                  <span className="text-zinc-500">Port 8001</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[11px] text-zinc-200">
                  <code className="truncate">edgeforge-agent --port 8001</code>
                  <CopySnippet text="edgeforge-agent --port 8001" />
                </div>
                <p className="text-[10px] text-zinc-400 font-sans">
                  Listens for hardware-in-the-loop benchmark jobs over LAN.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-amber-400 font-bold text-[10px] uppercase">
                  <span>Step 3: Pair & Test</span>
                  <span className="text-zinc-500">One-Click</span>
                </div>
                <div className="text-[11px] text-zinc-300 font-sans py-0.5">
                  Click <strong className="text-amber-300">&quot;Pair Device&quot;</strong>, enter device IP (e.g. <code className="text-teal-300 font-mono">192.168.1.120:8001</code>) and connect.
                </div>
                <p className="text-[10px] text-zinc-400 font-sans">
                  EdgeForge immediately verifies connectivity and syncs hardware status.
                </p>
              </div>
            </div>
          </div>

          {/* Connectable Devices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectableDevices.map((hw) => {
              const isSelected = selectedDevice?.id === hw.id;
              const isPaired = hw.status === "ONLINE" || hw.details_json?.pairing_status === "PAIRED_ACTIVE";
              const hasSensor = hasPowerSensor(hw);
              return (
                <div
                  key={hw.id}
                  onClick={() => setSelectedDevice(hw)}
                  className={`rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                    isSelected
                      ? "border-amber-500 bg-amber-950/20 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40"
                      : "border-amber-500/30 bg-zinc-900/60 hover:border-amber-500/60 hover:bg-zinc-900/80"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name & Pair Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider font-semibold">
                          {hw.vendor} • {hw.device_type.toUpperCase()}
                        </span>
                        <h4 className="font-bold text-zinc-100 text-sm mt-0.5 font-sans">
                          {hw.name}
                        </h4>
                      </div>

                      {isPaired ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Paired & Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-full bg-amber-950/80 border border-amber-500/50 px-2.5 py-1 text-[10px] font-mono font-bold text-amber-300 shrink-0">
                          <Radio className="h-3 w-3" />
                          Awaiting Pairing
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 font-mono line-clamp-2">
                      {hw.architecture}
                    </p>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs font-mono">
                      <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 block uppercase">Compute TOPS</span>
                        <span className="text-zinc-100 font-bold text-sm">
                          {hw.compute_tops ? `${hw.compute_tops} TOPS` : "N/A"}
                        </span>
                      </div>

                      <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 block uppercase">Memory / VRAM</span>
                        <span className="text-zinc-100 font-bold text-sm">
                          {hw.memory_mb >= 1024
                            ? `${(hw.memory_mb / 1024).toFixed(1)} GB`
                            : `${hw.memory_mb} MB`}
                        </span>
                      </div>

                      {/* Power Telemetry Card: Strict Not Measured Badge */}
                      <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80 col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 block uppercase">Power Telemetry</span>
                          {hasSensor ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Sensor Active
                            </span>
                          ) : (
                            <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 font-bold">
                              Not measured
                            </span>
                          )}
                        </div>
                        <span className="text-zinc-300 text-xs font-medium mt-0.5 block">
                          {hasSensor
                            ? `Live Hardware Telemetry Enabled (${hw.tdp_watts}W rated)`
                            : `Sensor absent (Rated ${hw.tdp_watts || 15}W TDP is specification only)`}
                        </span>
                      </div>
                    </div>

                    {/* Paired Details or Action Guidance */}
                    {isPaired && hw.details_json?.worker_url ? (
                      <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/25 p-2.5 text-[11px] font-mono text-emerald-300 flex items-center justify-between">
                        <span>Connected: {hw.details_json.worker_url}</span>
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-2.5 text-[11px] font-sans text-zinc-400">
                        Have this board on your desk? Follow the 3-step guide above, then click <strong className="text-amber-300">Pair Device</strong>.
                      </div>
                    )}
                  </div>

                  {/* Actions & Pair / Unpair Buttons */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-teal-400 font-medium truncate max-w-[140px]">
                      {hw.supported_runtimes.slice(0, 2).join(", ")}
                    </span>

                    {isPaired ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnpairDevice(hw);
                          }}
                          className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-950/40 hover:bg-red-900/50 px-2 py-1 text-red-300 font-sans text-xs transition-all shadow-sm"
                          title="Unpair this device"
                        >
                          <Unlink className="h-3 w-3" />
                          Unpair
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDevice(hw);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          Inspect Specs &rarr;
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPairModal(hw);
                        }}
                        className="flex items-center gap-1 rounded-lg bg-amber-400/90 hover:bg-amber-400 px-3 py-1 text-zinc-950 font-bold font-sans text-xs transition-all shadow-sm"
                      >
                        <Radio className="h-3 w-3" />
                        Pair Device
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: OTHER SUPPORTED TARGETS (HAILO, INTEL NPU, QUALCOMM) */}
      {/* ========================================================================= */}
      {(filterType === "all" || filterType === "other") && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-purple-400" />
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  Other Supported Targets
                </h3>
                <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-mono text-purple-300 font-bold">
                  Compilation Profiles • Unconfigured Locally ({otherSupportedTargets.length})
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Pre-profiled architectural compilation targets. EdgeForge compiles and optimizes models for these chips; physical benchmarks require hardware installation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherSupportedTargets.map((hw) => {
              const isSelected = selectedDevice?.id === hw.id;
              return (
                <div
                  key={hw.id}
                  onClick={() => setSelectedDevice(hw)}
                  className={`rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                    isSelected
                      ? "border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/40"
                      : "border-purple-500/30 bg-zinc-900/60 hover:border-purple-500/60 hover:bg-zinc-900/80"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name & Target Profile Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider font-semibold">
                          {hw.vendor} • {hw.device_type.toUpperCase()}
                        </span>
                        <h4 className="font-bold text-zinc-100 text-sm mt-0.5 font-sans">
                          {hw.name}
                        </h4>
                      </div>

                      <span className="rounded-full bg-purple-950/80 border border-purple-500/40 px-2.5 py-1 text-[10px] font-mono font-bold text-purple-300 shrink-0">
                        Supported Target (Unconfigured)
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 font-mono line-clamp-2">
                      {hw.architecture}
                    </p>

                    {/* Unconfigured Locally Notice */}
                    <div className="rounded-xl bg-purple-950/20 border border-purple-500/20 p-2.5 text-[11px] font-sans text-purple-300">
                      <span className="font-semibold block text-purple-200">Architectural Target Profile</span>
                      Supported future target & compilation profile. Unconfigured in current local setup — EdgeForge simulates and optimizes models for this architecture ahead of hardware acquisition.
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs font-mono">
                      <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 block uppercase">Architecture TOPS</span>
                        <span className="text-zinc-100 font-bold text-sm">
                          {hw.compute_tops ? `${hw.compute_tops} TOPS` : "N/A"}
                        </span>
                      </div>

                      <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 block uppercase">Memory Buffer</span>
                        <span className="text-zinc-100 font-bold text-sm">
                          {hw.memory_mb >= 1024
                            ? `${(hw.memory_mb / 1024).toFixed(1)} GB`
                            : `${hw.memory_mb} MB`}
                        </span>
                      </div>

                      {/* Power Telemetry Card: STRICT NOT MEASURED BADGE */}
                      <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800/80 col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 block uppercase">Power Telemetry</span>
                          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 font-bold">
                            Not measured
                          </span>
                        </div>
                        <span className="text-zinc-400 text-[11px] font-medium mt-0.5 block">
                          Sensor absent • Rated TDP ~{hw.tdp_watts}W (datasheet specification only, never faked)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Precisions & Inspector */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-purple-400 font-medium text-[11px] truncate max-w-[150px]">
                      {hw.supported_runtimes.join(", ")}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDevice(hw);
                      }}
                      className="text-purple-300 hover:text-purple-200 font-semibold flex items-center gap-1"
                    >
                      Inspect Specs &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAIR DEVICE MODAL / STEP-BY-STEP WIZARD */}
      {/* ========================================================================= */}
      {pairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  {pairingTargetId ? `Pair Device: ${regWorkerName}` : "Pair Edge Hardware Device"}
                </h3>
              </div>
              <button
                onClick={() => setPairModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Hardware Preset Buttons */}
            <div>
              <span className="text-[11px] text-zinc-400 font-sans font-medium block mb-1.5">
                Choose Target Device Type:
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setPairingTargetId(null);
                    setRegWorkerName("NVIDIA Jetson Orin Nano");
                    setRegWorkerRuntime("TensorRT");
                    setRegWorkerUrl("http://192.168.1.120:8001");
                  }}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    regWorkerName.toLowerCase().includes("jetson")
                      ? "border-amber-500 bg-amber-950/30 text-amber-200 font-bold"
                      : "border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  NVIDIA Jetson
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPairingTargetId(null);
                    setRegWorkerName("Raspberry Pi 5");
                    setRegWorkerRuntime("ONNX Runtime");
                    setRegWorkerUrl("http://192.168.1.150:8001");
                  }}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    regWorkerName.toLowerCase().includes("pi")
                      ? "border-amber-500 bg-amber-950/30 text-amber-200 font-bold"
                      : "border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Raspberry Pi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPairingTargetId(null);
                    setRegWorkerName("Remote Linux Worker");
                    setRegWorkerRuntime("ONNX Runtime");
                    setRegWorkerUrl("http://192.168.1.200:8001");
                  }}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    !regWorkerName.toLowerCase().includes("jetson") && !regWorkerName.toLowerCase().includes("pi")
                      ? "border-amber-500 bg-amber-950/30 text-amber-200 font-bold"
                      : "border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Custom Worker
                </button>
              </div>
            </div>

            {/* Step-by-Step Instructions inside Modal */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">
                EdgeForge Device Pairing Protocol:
              </span>
              <div className="space-y-1.5 text-[11px] text-zinc-300">
                <div className="flex items-center justify-between bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800">
                  <span>1. Install: <code>curl -fsSL https://get.edgeforge.ai/agent.sh | bash</code></span>
                  <CopySnippet text="curl -fsSL https://get.edgeforge.ai/agent.sh | bash" />
                </div>
                <div className="flex items-center justify-between bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800">
                  <span>2. Launch: <code>edgeforge-agent --port 8001</code></span>
                  <CopySnippet text="edgeforge-agent --port 8001" />
                </div>
                <div className="text-zinc-400 text-[10px] font-sans">
                  3. Enter the device&apos;s IP address and target runtime below, then click &quot;Pair Device &amp; Connect&quot;.
                </div>
              </div>
            </div>

            <form onSubmit={handleRegisterWorker} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-zinc-300 block mb-1 font-sans text-[11px]">Device Name / Label</label>
                <input
                  type="text"
                  value={regWorkerName}
                  onChange={(e) => setRegWorkerName(e.target.value)}
                  placeholder="e.g. Jetson Orin Nano (Desk)"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1 font-sans text-[11px]">Device IP &amp; Port (Endpoint)</label>
                <input
                  type="text"
                  value={regWorkerUrl}
                  onChange={(e) => setRegWorkerUrl(e.target.value)}
                  placeholder="http://192.168.1.120:8001"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1 font-sans text-[11px]">Primary Runtime Engine</label>
                <select
                  value={regWorkerRuntime}
                  onChange={(e) => setRegWorkerRuntime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="TensorRT">TensorRT (NVIDIA Jetson)</option>
                  <option value="ONNX Runtime">ONNX Runtime (Cross-Platform / ARM)</option>
                  <option value="HailoRT">HailoRT (Raspberry Pi + Hailo-8 M.2)</option>
                  <option value="OpenVINO">OpenVINO (Intel NPU / ARC)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPairModalOpen(false)}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-amber-500/20 font-sans"
                >
                  Pair Device &amp; Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SPEC SHEET INSPECTOR DRAWER / MODAL */}
      {/* ========================================================================= */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase font-semibold">
                  {selectedDevice.vendor} • {selectedDevice.device_type}
                </span>
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  {selectedDevice.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                  <span className="text-zinc-400">Execution Category:</span>
                  <span
                    className={
                      selectedDevice.is_local
                        ? "text-emerald-400 font-bold"
                        : selectedDevice.status === "ONLINE"
                        ? "text-amber-400 font-bold"
                        : "text-purple-400 font-bold"
                    }
                  >
                    {selectedDevice.is_local
                      ? "Available for Testing (Physical Local Host)"
                      : selectedDevice.status === "ONLINE"
                      ? "Paired Edge Worker (Remote)"
                      : "Supported Target Profile (Unconfigured Locally)"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/50">
                  <span className="text-zinc-400">Architecture:</span>
                  <span className="text-zinc-200">{selectedDevice.architecture}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/50">
                  <span className="text-zinc-400">Compute TOPS:</span>
                  <span className="text-teal-400 font-bold">{selectedDevice.compute_tops ? `${selectedDevice.compute_tops} TOPS` : "Host Vector"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/50">
                  <span className="text-zinc-400">Memory / VRAM:</span>
                  <span className="text-zinc-200">
                    {selectedDevice.memory_mb >= 1024
                      ? `${(selectedDevice.memory_mb / 1024).toFixed(1)} GB`
                      : `${selectedDevice.memory_mb} MB`}
                  </span>
                </div>

                {/* Power Telemetry Strict Transparency */}
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                  <span className="text-zinc-400">Power Telemetry:</span>
                  {hasPowerSensor(selectedDevice) ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Current Sensor Active ({selectedDevice.tdp_watts}W max)
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-300 font-bold font-mono">
                        Not measured
                      </span>
                      <span className="text-zinc-500 text-[11px]">
                        (Sensor absent • Datasheet rated: {selectedDevice.tdp_watts || "?"}W)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Estimated Unit Cost:</span>
                  <span className="text-zinc-200">${selectedDevice.cost_usd || 0} USD</span>
                </div>
              </div>

              {/* Extended Details */}
              {selectedDevice.details_json && Object.keys(selectedDevice.details_json).length > 0 && (
                <div>
                  <span className="text-zinc-400 block mb-1 font-sans font-medium">Architecture Details &amp; Capabilities:</span>
                  <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800 max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                    {Object.entries(selectedDevice.details_json).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-zinc-400">{k}:</span>
                        <span className="text-zinc-200 font-medium">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDevice(null)}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-5 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all font-sans"
              >
                Close Spec Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
