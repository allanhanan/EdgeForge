"use client";

import React, { useState } from "react";
import {
  Layers,
  Upload,
  Sparkles,
  Trash2,
  Sliders,
  CheckCircle2,
  FileCode,
  Info,
  ChevronRight,
  ChevronDown,
  X,
  Cpu,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import {
  ModelRecord,
  uploadModel,
  seedSampleModel,
  deleteModel,
  quantizeModel,
  fetchCompatibilityMatrix,
} from "@/lib/api";

interface ModelsTabProps {
  models: ModelRecord[];
  onRefresh: () => void;
  onSelectForBenchmark: (modelId: string) => void;
}

interface DeviceFinding {
  severity: string;
  message: string;
  remediation: string;
}

interface DeviceEvaluation {
  hardware_id: string;
  hardware_name: string;
  runtime: string;
  precision: string;
  overall_status: "COMPATIBLE" | "CONDITIONAL" | "INCOMPATIBLE";
  findings?: DeviceFinding[];
}

interface CompatibilityMatrixData {
  model_id: string;
  model_name: string;
  device_evaluations?: DeviceEvaluation[];
}

export const ModelsTab: React.FC<ModelsTabProps> = ({
  models,
  onRefresh,
  onSelectForBenchmark,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [techDrawerOpen, setTechDrawerOpen] = useState(false);

  const selectedModel =
    models.find((m) => m.id === selectedModelId) || models[0] || null;

  const [isUploading, setIsUploading] = useState(false);
  const [isQuantizing, setIsQuantizing] = useState(false);
  const [quantType, setQuantType] = useState("int8_dynamic");
  const [quantModalOpen, setQuantModalOpen] = useState(false);
  const [activeModelForQuant, setActiveModelForQuant] = useState<ModelRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [compatModalOpen, setCompatModalOpen] = useState(false);
  const [compatData, setCompatData] = useState<CompatibilityMatrixData | null>(null);
  const [isCheckingCompat, setIsCheckingCompat] = useState(false);

  const handleCheckCompatibility = async (modelId: string) => {
    setIsCheckingCompat(true);
    setErrorMsg(null);
    try {
      const data = await fetchCompatibilityMatrix(modelId);
      setCompatData(data);
      setCompatModalOpen(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to evaluate compatibility");
    } finally {
      setIsCheckingCompat(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await uploadModel(formData);
      onRefresh();
      if (uploaded?.id) {
        setSelectedModelId(uploaded.id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload model");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSeed = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const seeded = await seedSampleModel();
      onRefresh();
      if (seeded?.id) {
        setSelectedModelId(seeded.id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to seed sample model");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    try {
      await deleteModel(id);
      if (selectedModelId === id) setSelectedModelId(null);
      onRefresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete model");
    }
  };

  const handleQuantizeSubmit = async () => {
    if (!activeModelForQuant) return;
    setIsQuantizing(true);
    setErrorMsg(null);
    try {
      const opt = await quantizeModel({
        model_id: activeModelForQuant.id,
        optimization_type: quantType,
        register_as_new_model: true,
      });
      setQuantModalOpen(false);
      onRefresh();
      if (opt?.id) {
        setSelectedModelId(opt.id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Quantization failed");
    } finally {
      setIsQuantizing(false);
    }
  };

  // Helper to extract clean spatial resolution for natural language summaries
  const getInputResolution = (model: ModelRecord): string => {
    if (Array.isArray(model.input_shapes) && model.input_shapes.length > 0) {
      const shape = model.input_shapes[0]?.shape;
      if (Array.isArray(shape) && shape.length >= 2) {
        let h: unknown;
        let w: unknown;
        if (shape.length === 4) {
          const lastDim = Number(shape[3]);
          if ((lastDim === 1 || lastDim === 3 || lastDim === 4) && isNaN(Number(shape[1]))) {
            h = shape[1];
            w = shape[2];
          } else {
            h = shape[2];
            w = shape[3];
          }
        } else {
          h = shape[shape.length - 2];
          w = shape[shape.length - 1];
        }

        if (h != null && w != null && !isNaN(Number(h)) && !isNaN(Number(w)) && Number(h) > 0 && Number(w) > 0) {
          return `${h} × ${w}`;
        }
        if (typeof h === "string" && typeof w === "string" && h.trim() && w.trim()) {
          return `${h} × ${w}`;
        }
      }
    }
    return "640 × 640";
  };

  const getFriendlyTaskName = (taskType?: string): string => {
    if (!taskType) return "object detection";
    const normalized = taskType.toLowerCase().replace(/_/g, " ");
    if (normalized.includes("detect")) return "object detection";
    if (normalized.includes("class")) return "image classification";
    if (normalized.includes("seg")) return "image segmentation";
    return normalized;
  };

  const selectedResolution = selectedModel ? getInputResolution(selectedModel) : "640 × 640";
  const selectedTaskName = selectedModel ? getFriendlyTaskName(selectedModel.task_type) : "object detection";
  const selectedArticle = /^[aeiou]/i.test(selectedTaskName) ? "an" : "a";
  const selectedSizeMb = selectedModel
    ? (selectedModel.file_size_bytes / (1024 * 1024)).toFixed(2)
    : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <Layers className="h-5 w-5 text-teal-400" />
            Model Registry & Automatic Inspection
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Automatic input shape detection, operator graph profiling, and edge deployment readiness.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeed}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3.5 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-all duration-150 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Seed Sample YOLO
          </button>

          <label className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 cursor-pointer shadow-md shadow-teal-500/20 transition-all duration-150">
            <Upload className="h-3.5 w-3.5 fill-zinc-950" />
            Upload ONNX
            <input
              type="file"
              accept=".onnx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
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

      {/* Models Grid & Detail View */}
      {models.length === 0 ? (
        /* Clean Professional Empty State */
        <div className="rounded-2xl border border-dashed border-zinc-800/90 bg-zinc-950/40 p-8 sm:p-12 text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Layers className="h-7 w-7" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-zinc-100">
              No models registered
            </h3>
            <p className="text-xs text-zinc-400">
              Upload an ONNX model file or register the reference YOLOv8n model to begin profiling.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleSeed}
              disabled={isUploading}
              className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isUploading ? "Registering..." : "Register Sample YOLOv8n"}</span>
            </button>

            <label className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:brightness-110 cursor-pointer shadow-md shadow-teal-500/20 transition-all">
              <Upload className="h-3.5 w-3.5 fill-zinc-950" />
              Upload ONNX
              <input
                type="file"
                accept=".onnx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Model List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pb-1">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Registered Models ({models.length})
              </span>
              <span className="text-[10px] text-zinc-500">Click to inspect</span>
            </div>

            {models.map((model) => {
              const isSelected = selectedModel?.id === model.id;
              const sizeMb = (model.file_size_bytes / (1024 * 1024)).toFixed(2);
              const resolution = getInputResolution(model);
              const friendlyTask = getFriendlyTaskName(model.task_type);

              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border border-teal-500/80 bg-teal-950/20 shadow-lg shadow-teal-500/10 ring-1 ring-teal-500/40"
                      : "glass-card hover:border-zinc-700/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100 text-sm font-sans">
                          {model.name}
                        </span>
                        <span className="rounded-md bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] font-mono text-teal-300 uppercase font-semibold">
                          {model.format}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono flex items-center gap-2.5 flex-wrap">
                        <span className="text-zinc-300 font-semibold">{sizeMb} MB</span>
                        <span>•</span>
                        <span className="text-teal-400/90 capitalize">{friendlyTask}</span>
                        <span>•</span>
                        <span className="text-zinc-400">{resolution}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectForBenchmark(model.id)}
                        className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-2.5 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-all"
                        title="Proceed to hardware selection and benchmarking"
                      >
                        Test Model
                      </button>
                      <button
                        onClick={() => {
                          setActiveModelForQuant(model);
                          setQuantModalOpen(true);
                        }}
                        className="rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"
                        title="Compress model to INT8 precision"
                      >
                        Quantize
                      </button>
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                        aria-label="Delete model"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Clean Human-Friendly Card Footer */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/70 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="text-zinc-500">
                      Verified Graph • {model.node_count} nodes • Opset {model.opset_version || 17}
                    </span>
                    {isSelected && (
                      <span className="text-teal-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Inspected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Natural Language Summary Card & Progressive Drawer (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {!selectedModel ? (
              <div className="glass-panel rounded-2xl p-12 text-center text-zinc-400 space-y-3 shadow-xl">
                <Info className="h-8 w-8 text-zinc-600 mx-auto" />
                <p className="text-sm font-semibold text-zinc-200">Select a model to view inspection</p>
                <p className="text-xs text-zinc-400 font-mono">
                  Choose a model from the left column to view its high-level deployment summary and technical details.
                </p>
              </div>
            ) : (
              <>
                {/* 1. MODEL TECHNICAL PROFILE & SPECIFICATION CARD */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:p-6 space-y-5 shadow-xl">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-100 font-sans">
                          {selectedModel.name}
                        </h3>
                        <span className="rounded bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] font-mono text-teal-300 uppercase font-semibold">
                          {selectedModel.format}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">
                        Architecture Profile: {selectedTaskName} • Opset {selectedModel.opset_version || 17}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-1 rounded-lg">
                      {selectedSizeMb} MB
                    </span>
                  </div>

                  {/* Dense Specification Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">
                        Input Signature
                      </div>
                      <div className="text-xs font-bold text-teal-300 mt-1">
                        {selectedResolution}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">
                        Graph Nodes
                      </div>
                      <div className="text-xs font-bold text-zinc-200 mt-1">
                        {selectedModel.node_count} Operators
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">
                        Task Type
                      </div>
                      <div className="text-xs font-bold text-zinc-200 mt-1 capitalize">
                        {selectedTaskName}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">
                        Status
                      </div>
                      <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Ready
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      onClick={() => onSelectForBenchmark(selectedModel.id)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 py-2.5 px-4 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all cursor-pointer font-sans"
                    >
                      <span>Configure Benchmark</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveModelForQuant(selectedModel);
                        setQuantModalOpen(true);
                      }}
                      className="rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 px-4 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all font-sans"
                    >
                      Quantize (INT8)
                    </button>
                    <button
                      onClick={() => handleCheckCompatibility(selectedModel.id)}
                      disabled={isCheckingCompat}
                      className="rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 px-4 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all font-sans disabled:opacity-50"
                    >
                      {isCheckingCompat ? "Evaluating..." : "Compatibility Matrix"}
                    </button>
                  </div>
                </div>

                {/* 2. EXPANDABLE DETAILED TECHNICAL INSPECTION (LEVEL 3) DRAWER */}
                <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/40 overflow-hidden shadow-xl transition-all">
                  <button
                    type="button"
                    onClick={() => setTechDrawerOpen(!techDrawerOpen)}
                    className="w-full flex items-center justify-between p-4 bg-zinc-900/80 hover:bg-zinc-900 transition-colors text-left"
                    aria-expanded={techDrawerOpen}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <FileCode className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200 text-sm">
                            Detailed Technical Inspection (Level 3)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-medium">
                            Opsets, Tensors & Graph
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          Deep operator breakdown, raw tensor dimensions, and checksums
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                      <span>{techDrawerOpen ? "Hide Details" : "Show Details"}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          techDrawerOpen ? "rotate-180 text-teal-400" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {techDrawerOpen && (
                    <div className="p-5 border-t border-zinc-800/80 space-y-4 text-xs font-mono bg-zinc-950/80">
                      {/* Opset & Graph nodes */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/70">
                          <span className="text-zinc-500 block text-[10px] uppercase font-semibold">ONNX Opset Version</span>
                          <span className="text-zinc-200 font-bold text-sm">Opset {selectedModel.opset_version || 17}</span>
                        </div>
                        <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/70">
                          <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Total Graph Nodes</span>
                          <span className="text-zinc-200 font-bold text-sm">{selectedModel.node_count} Ops</span>
                        </div>
                      </div>

                      {/* SHA-256 Checksum */}
                      <div>
                        <span className="text-zinc-400 text-[11px] block">Cryptographic Checksum (SHA-256):</span>
                        <p className="text-[10px] text-zinc-400 break-all bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800/80 mt-1 font-mono select-all">
                          {selectedModel.sha256}
                        </p>
                      </div>

                      {/* Raw Tensor Signatures (Inputs & Outputs) */}
                      <div>
                        <span className="text-zinc-400 text-[11px] block mb-1.5">Raw Tensor Dimensions:</span>
                        <div className="space-y-2 bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/80">
                          <div>
                            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">
                              Input Tensors
                            </div>
                            {Array.isArray(selectedModel.input_shapes) && selectedModel.input_shapes.length > 0 ? (
                              <div className="space-y-1">
                                {selectedModel.input_shapes.map((inp, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-[11px] bg-zinc-950/80 px-2.5 py-1.5 rounded border border-zinc-800/60"
                                  >
                                    <span className="text-zinc-300 font-medium">{inp.name || `input_${idx}`}</span>
                                    <span className="text-teal-400 font-mono">
                                      [{Array.isArray(inp.shape) ? inp.shape.join(", ") : ""}]
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-500 text-[10px]">None specified</span>
                            )}
                          </div>
                          <div className="pt-2 border-t border-zinc-800/60">
                            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">
                              Output Tensors
                            </div>
                            {Array.isArray(selectedModel.output_shapes) && selectedModel.output_shapes.length > 0 ? (
                              <div className="space-y-1">
                                {selectedModel.output_shapes.map((out, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-[11px] bg-zinc-950/80 px-2.5 py-1.5 rounded border border-zinc-800/60"
                                  >
                                    <span className="text-zinc-300 font-medium">{out.name || `output_${idx}`}</span>
                                    <span className="text-teal-400 font-mono">
                                      [{Array.isArray(out.shape) ? out.shape.join(", ") : ""}]
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-500 text-[10px]">None specified</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Operator Breakdown Histogram */}
                      <div>
                        <div className="flex items-center justify-between text-zinc-400 text-[11px] mb-2">
                          <span>Operator Breakdown Histogram:</span>
                          <span className="text-zinc-500">{Object.keys(selectedModel.operators || {}).length} Unique Ops</span>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {Object.entries(selectedModel.operators || {}).map(([op, count]) => {
                            const pct = Math.min(
                              100,
                              Math.round((count / (selectedModel.node_count || 1)) * 100)
                            );
                            return (
                              <div key={op} className="space-y-1">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-zinc-200 font-semibold">{op}</span>
                                  <span className="text-teal-400 font-bold">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(5, pct)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quantization Modal */}
      {quantModalOpen && activeModelForQuant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-teal-400" />
                Quantize Model: {activeModelForQuant.name}
              </h3>
              <button
                onClick={() => setQuantModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-sans font-medium">Optimization Precision</label>
                <select
                  value={quantType}
                  onChange={(e) => setQuantType(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none"
                >
                  <option value="int8_dynamic">INT8 Dynamic Quantization (Fastest, High Compatibility)</option>
                  <option value="int8_static">INT8 Static Quantization (Calibration Data Reader)</option>
                  <option value="fp16">Float16 (FP16) Accelerator Lowering</option>
                  <option value="graph_opt">Extended Graph Optimization (Constant Folding & Fusion)</option>
                </select>
              </div>

              <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-3.5 text-zinc-400 space-y-1">
                <p className="text-teal-400 font-semibold">Optimization Impact:</p>
                <p>• Up to 75% memory footprint reduction</p>
                <p>• Accelerated inference on AVX-VNNI CPU and Tensor Cores</p>
                <p>• Preserves model operator topology</p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setQuantModalOpen(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleQuantizeSubmit}
                disabled={isQuantizing}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all"
              >
                {isQuantizing ? "Optimizing..." : "Apply Quantization"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compatibility Matrix Modal */}
      {compatModalOpen && compatData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5 bg-zinc-950/80">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-teal-400" />
                  Edge Hardware Compatibility Matrix
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Model: {compatData.model_name}
                </p>
              </div>
              <button
                onClick={() => setCompatModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {compatData.device_evaluations?.map((devEval: DeviceEvaluation) => {
                const statusColor =
                  devEval.overall_status === "COMPATIBLE"
                    ? "border-teal-500/40 bg-teal-500/10 text-teal-300"
                    : devEval.overall_status === "CONDITIONAL"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300";

                return (
                  <div
                    key={devEval.hardware_id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4 space-y-3 font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200 text-xs">
                          {devEval.hardware_name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          ({devEval.runtime} • {devEval.precision?.toUpperCase()})
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}
                      >
                        {devEval.overall_status}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {devEval.findings?.map((f: DeviceFinding, idx: number) => {
                        const sevBadge =
                          f.severity === "ERROR"
                            ? "text-rose-400 bg-rose-950/50 border-rose-800"
                            : f.severity === "WARNING"
                            ? "text-amber-400 bg-amber-950/50 border-amber-800"
                            : "text-zinc-400 bg-zinc-900 border-zinc-800";

                        return (
                          <div
                            key={idx}
                            className="text-[11px] p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${sevBadge}`}
                              >
                                {f.severity}
                              </span>
                              <span className="text-zinc-300 font-medium">{f.message}</span>
                            </div>
                            <p className="text-[10px] text-teal-400/90 pl-1">
                              Action: {f.remediation}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-zinc-800 p-4 bg-zinc-950/80 flex justify-end">
              <button
                onClick={() => setCompatModalOpen(false)}
                className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition-all"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
