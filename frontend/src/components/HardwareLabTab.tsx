"use client";

import React, { useState } from "react";
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
  DollarSign,
  Box,
} from "lucide-react";
import { HardwareDevice, detectHardware } from "@/lib/api";

interface HardwareLabTabProps {
  hardware: HardwareDevice[];
  onRefresh: () => void;
}

export const HardwareLabTab: React.FC<HardwareLabTabProps> = ({
  hardware,
  onRefresh,
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedDevice, setSelectedDevice] = useState<HardwareDevice | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRedetect = async () => {
    setIsDetecting(true);
    setMessage(null);
    try {
      const detected = await detectHardware();
      setMessage(`Hardware detection completed. ${detected.length} targets active.`);
      onRefresh();
    } catch (err: any) {
      setMessage(`Hardware detection error: ${err.message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const localDevices = hardware.filter((h) => h.is_local);
  const simulatedDevices = hardware.filter((h) => !h.is_local);

  const filteredHardware = hardware.filter((h) => {
    if (filterType === "all") return true;
    if (filterType === "local") return h.is_local;
    if (filterType === "soc") return h.device_type === "soc";
    if (filterType === "npu") return h.device_type === "npu" || h.device_type === "accelerator";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Re-detect Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-teal-400" />
            Hardware Acceleration Lab & Edge Fleet
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Physical local host silicon (Intel i7 & RTX 4060) and profiled edge deployment targets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded px-2.5 py-1 ${
                filterType === "all" ? "bg-teal-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All ({hardware.length})
            </button>
            <button
              onClick={() => setFilterType("local")}
              className={`rounded px-2.5 py-1 ${
                filterType === "local" ? "bg-teal-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Local Silicon ({localDevices.length})
            </button>
            <button
              onClick={() => setFilterType("soc")}
              className={`rounded px-2.5 py-1 ${
                filterType === "soc" ? "bg-teal-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Edge SoCs
            </button>
            <button
              onClick={() => setFilterType("npu")}
              className={`rounded px-2.5 py-1 ${
                filterType === "npu" ? "bg-teal-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Dedicated NPUs
            </button>
          </div>

          <button
            onClick={handleRedetect}
            disabled={isDetecting}
            className="flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-300 hover:bg-teal-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isDetecting ? "animate-spin" : ""}`} />
            {isDetecting ? "Scanning Hardware..." : "Re-detect Local Hardware"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-teal-500/30 bg-teal-950/40 p-3 text-xs text-teal-300 font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
            {message}
          </span>
          <button onClick={() => setMessage(null)} className="text-zinc-400 hover:text-zinc-200">
            &times;
          </button>
        </div>
      )}

      {/* Honest Status Philosophy Banner */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3.5 text-xs text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong className="text-zinc-200 font-medium">Verified Execution Integrity:</strong>{" "}
            Benchmarks on local CPU & NVIDIA GPU execute physically in-memory. Profiled edge hardware devices are accurately modeled using verified silicon TDP curves and Roofline constraints.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> ONLINE (Physical)
          </span>
          <span className="flex items-center gap-1 text-purple-400 ml-2">
            <span className="h-2 w-2 rounded-full bg-purple-400" /> SIMULATED (Profile)
          </span>
        </div>
      </div>

      {/* Hardware Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHardware.map((hw) => {
          const isSelected = selectedDevice?.id === hw.id;
          const isOnline = hw.status === "ONLINE";
          return (
            <div
              key={hw.id}
              onClick={() => setSelectedDevice(hw)}
              className={`rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "border-teal-500 bg-teal-950/15 shadow-sm shadow-teal-500/10"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
              }`}
            >
              <div className="space-y-3">
                {/* Header: Name & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                      {hw.vendor} • {hw.device_type.toUpperCase()}
                    </span>
                    <h3 className="font-semibold text-zinc-100 text-sm mt-0.5 leading-snug">
                      {hw.name}
                    </h3>
                  </div>

                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase font-semibold whitespace-nowrap ${
                      isOnline
                        ? "bg-emerald-950/80 border border-emerald-500/30 text-emerald-300"
                        : "bg-purple-950/80 border border-purple-500/30 text-purple-300"
                    }`}
                  >
                    {hw.status}
                  </span>
                </div>

                {/* Architecture Subtitle */}
                <p className="text-xs text-zinc-400 font-mono line-clamp-2">
                  {hw.architecture}
                </p>

                {/* Key Spec Badges */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-xs font-mono">
                  <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">INT8 TOPS</span>
                    <span className="text-zinc-100 font-bold">
                      {hw.compute_tops ? `${hw.compute_tops} TOPS` : "N/A"}
                    </span>
                  </div>

                  <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">MEMORY / VRAM</span>
                    <span className="text-zinc-100 font-bold">
                      {hw.memory_mb >= 1024
                        ? `${(hw.memory_mb / 1024).toFixed(1)} GB`
                        : `${hw.memory_mb} MB`}
                    </span>
                  </div>

                  <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">TDP / POWER</span>
                    <span className="text-zinc-100 font-bold">
                      {hw.tdp_watts ? `${hw.tdp_watts} Watts` : "N/A"}
                    </span>
                  </div>

                  <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">EST. HARDWARE COST</span>
                    <span className="text-zinc-100 font-bold">
                      {hw.cost_usd ? `$${hw.cost_usd}` : "Included"}
                    </span>
                  </div>
                </div>

                {/* Telemetry info if local */}
                {hw.is_local && hw.details_json && (
                  <div className="rounded bg-emerald-950/20 border border-emerald-500/20 p-2.5 text-[11px] font-mono text-zinc-300 space-y-1">
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Live Telemetry
                      </span>
                      <span>Physically Active</span>
                    </div>
                    {hw.details_json.driver_version && (
                      <div>Driver: {hw.details_json.driver_version}</div>
                    )}
                    {hw.details_json.cores_logical && (
                      <div>Cores: {hw.details_json.cores_physical} Physical / {hw.details_json.cores_logical} Logical</div>
                    )}
                    {hw.details_json.has_vnni && (
                      <div className="text-teal-300">AVX-VNNI Neural Vector Engine Enabled</div>
                    )}
                  </div>
                )}
              </div>

              {/* Supported Precisions & Runtimes */}
              <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1">
                  {hw.supported_precisions.map((p) => (
                    <span
                      key={p}
                      className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300 uppercase text-[9px]"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                <span className="text-teal-400 font-medium">
                  {hw.supported_runtimes.join(", ")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Hardware Modal / Inspector Drawer */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase">
                  {selectedDevice.vendor} • {selectedDevice.device_type}
                </span>
                <h3 className="text-base font-semibold text-zinc-100">
                  {selectedDevice.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-zinc-400 hover:text-zinc-200 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status:</span>
                  <span
                    className={
                      selectedDevice.status === "ONLINE"
                        ? "text-emerald-400 font-bold"
                        : "text-purple-400 font-bold"
                    }
                  >
                    {selectedDevice.status} ({selectedDevice.is_local ? "Physical Local Host" : "Hardware Lab Model"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Architecture:</span>
                  <span className="text-zinc-200">{selectedDevice.architecture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Compute INT8 TOPS:</span>
                  <span className="text-teal-400 font-bold">{selectedDevice.compute_tops || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Thermal Design Power (TDP):</span>
                  <span className="text-zinc-200">{selectedDevice.tdp_watts} Watts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Memory / VRAM:</span>
                  <span className="text-zinc-200">
                    {selectedDevice.memory_mb >= 1024
                      ? `${(selectedDevice.memory_mb / 1024).toFixed(1)} GB`
                      : `${selectedDevice.memory_mb} MB`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Unit Cost (USD):</span>
                  <span className="text-zinc-200">${selectedDevice.cost_usd || 0}</span>
                </div>
              </div>

              {/* Extended Details */}
              {selectedDevice.details_json && Object.keys(selectedDevice.details_json).length > 0 && (
                <div>
                  <span className="text-zinc-400 block mb-1">Architecture Details & Capabilities:</span>
                  <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 max-h-40 overflow-y-auto space-y-1 text-[11px]">
                    {Object.entries(selectedDevice.details_json).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-zinc-400">{k}:</span>
                        <span className="text-zinc-200">
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
                className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-teal-400"
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
