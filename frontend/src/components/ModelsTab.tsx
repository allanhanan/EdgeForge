"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Upload,
  Sparkles,
  Trash2,
  Sliders,
  CheckCircle2,
  FileCode,
  HardDrive,
  Info,
  ChevronRight,
  X,
  Cpu,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  ModelRecord,
  uploadModel,
  seedSampleModel,
  deleteModel,
  quantizeModel,
  fetchCompatibilityMatrix,
  CompatibilityReport,
} from "@/lib/api";

interface ModelsTabProps {
  models: ModelRecord[];
  onRefresh: () => void;
  onSelectForBenchmark: (modelId: string) => void;
}

export const ModelsTab: React.FC<ModelsTabProps> = ({
  models,
  onRefresh,
  onSelectForBenchmark,
}) => {
  const [selectedModel, setSelectedModel] = useState<ModelRecord | null>(null);

  useEffect(() => {
    if (!selectedModel && models.length > 0) {
      setSelectedModel(models[0]);
    } else if (selectedModel && !models.some((m) => m.id === selectedModel.id)) {
      setSelectedModel(models[0] || null);
    }
  }, [models, selectedModel]);
  const [isUploading, setIsUploading] = useState(false);
  const [isQuantizing, setIsQuantizing] = useState(false);
  const [quantType, setQuantType] = useState("int8_dynamic");
  const [quantModalOpen, setQuantModalOpen] = useState(false);
  const [activeModelForQuant, setActiveModelForQuant] = useState<ModelRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [compatModalOpen, setCompatModalOpen] = useState(false);
  const [compatData, setCompatData] = useState<any>(null);
  const [isCheckingCompat, setIsCheckingCompat] = useState(false);

  const handleCheckCompatibility = async (modelId: string) => {
    setIsCheckingCompat(true);
    setErrorMsg(null);
    try {
      const data = await fetchCompatibilityMatrix(modelId);
      setCompatData(data);
      setCompatModalOpen(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to evaluate compatibility");
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
      await uploadModel(formData);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload model");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeed = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      await seedSampleModel();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to seed sample model");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    try {
      await deleteModel(id);
      if (selectedModel?.id === id) setSelectedModel(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete model");
    }
  };

  const handleQuantizeSubmit = async () => {
    if (!activeModelForQuant) return;
    setIsQuantizing(true);
    setErrorMsg(null);
    try {
      await quantizeModel({
        model_id: activeModelForQuant.id,
        optimization_type: quantType,
        register_as_new_model: true,
      });
      setQuantModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Quantization failed");
    } finally {
      setIsQuantizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <Layers className="h-5 w-5 text-teal-400" />
            Model Registry & ONNX Profiling
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Safely inspect ONNX operator graphs, opset versions, and tensor dimensions.
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Model List (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          {models.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400 space-y-3 bg-zinc-950/40">
              <Layers className="h-10 w-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">No models in registry</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Upload your trained ONNX model or seed the verified lightweight Edge Tiny YOLO
                model to test the full benchmarking pipeline.
              </p>
              <button
                onClick={handleSeed}
                className="rounded-xl bg-teal-500/10 border border-teal-500/30 px-4 py-2 text-xs font-mono text-teal-300 hover:bg-teal-500/20 transition-all font-semibold"
              >
                Seed Edge Tiny YOLO
              </button>
            </div>
          ) : (
            models.map((model) => {
              const isSelected = selectedModel?.id === model.id;
              const sizeMb = (model.file_size_bytes / (1024 * 1024)).toFixed(2);
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`rounded-2xl p-5 transition-all duration-200 cursor-pointer ${
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
                        <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-300 font-semibold">
                          Opset {model.opset_version || 17}
                        </span>
                        <span className="rounded-md bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] font-mono text-teal-300 uppercase font-semibold">
                          {model.format}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono flex items-center gap-3">
                        <span className="text-zinc-300">{sizeMb} MB</span>
                        <span>•</span>
                        <span>{model.node_count} Graph Nodes</span>
                        <span>•</span>
                        <span className="text-teal-400/90">{model.task_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectForBenchmark(model.id)}
                        className="rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all"
                      >
                        Benchmark
                      </button>
                      <button
                        onClick={() => {
                          setActiveModelForQuant(model);
                          setQuantModalOpen(true);
                        }}
                        className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-all"
                      >
                        Quantize
                      </button>
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="rounded-lg p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                        aria-label="Delete model"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* IO signatures */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/70 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400">
                    <div className="truncate">
                      <span className="text-zinc-500 font-medium">Input:</span>{" "}
                      <span className="text-zinc-300 font-semibold">
                        {Array.isArray(model.input_shapes) && model.input_shapes[0]
                          ? `${model.input_shapes[0].name} [${model.input_shapes[0].shape?.join(", ") ?? ""}]`
                          : typeof model.input_shapes === "object" && model.input_shapes !== null
                          ? Object.keys(model.input_shapes)[0] || "input"
                          : "none"}
                      </span>
                    </div>
                    <div className="truncate">
                      <span className="text-zinc-500 font-medium">Output:</span>{" "}
                      <span className="text-zinc-300 font-semibold">
                        {Array.isArray(model.output_shapes) && model.output_shapes[0]
                          ? `${model.output_shapes[0].name} [${model.output_shapes[0].shape?.join(", ") ?? ""}]`
                          : typeof model.output_shapes === "object" && model.output_shapes !== null
                          ? Object.keys(model.output_shapes)[0] || "output"
                          : "none"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Inspector Drawer (1 Col) */}
        <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-zinc-200">ONNX Graph Inspector</h3>
            </div>
            {selectedModel && (
              <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 border border-teal-500/20 rounded px-1.5 py-0.5">
                SHA-256 Verified
              </span>
            )}
          </div>

          {!selectedModel ? (
            <div className="py-20 text-center text-zinc-400 space-y-2">
              <Info className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-xs font-mono">Select a model to view deep operator breakdown</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-mono">
              <div>
                <span className="text-zinc-400 text-[11px]">Model Name:</span>
                <p className="text-zinc-100 font-bold text-sm mt-0.5 font-sans">{selectedModel.name}</p>
              </div>

              <div>
                <span className="text-zinc-400 text-[11px]">SHA-256 Checksum:</span>
                <p className="text-[10px] text-zinc-300 break-all bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/80 mt-1 font-mono">
                  {selectedModel.sha256}
                </p>
              </div>

              {/* Tensor IO Signatures */}
              <div>
                <span className="text-zinc-400 text-[11px] block mb-1.5">Tensor Signatures:</span>
                <div className="space-y-2 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80">
                  <div>
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Inputs</div>
                    {Array.isArray(selectedModel.input_shapes) && selectedModel.input_shapes.length > 0 ? (
                      <div className="space-y-1">
                        {selectedModel.input_shapes.map((inp, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800/50">
                            <span className="text-zinc-300 font-medium">{inp.name || `input_${idx}`}</span>
                            <span className="text-teal-400 font-mono">[{Array.isArray(inp.shape) ? inp.shape.join(", ") : ""}]</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-[10px]">None specified</span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-zinc-800/60">
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Outputs</div>
                    {Array.isArray(selectedModel.output_shapes) && selectedModel.output_shapes.length > 0 ? (
                      <div className="space-y-1">
                        {selectedModel.output_shapes.map((out, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800/50">
                            <span className="text-zinc-300 font-medium">{out.name || `output_${idx}`}</span>
                            <span className="text-teal-400 font-mono">[{Array.isArray(out.shape) ? out.shape.join(", ") : ""}]</span>
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
                  <span>Operator Inventory:</span>
                  <span className="text-zinc-500">{Object.keys(selectedModel.operators || {}).length} Unique Ops</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {Object.entries(selectedModel.operators || {}).map(([op, count]) => {
                    const pct = Math.min(100, Math.round((count / (selectedModel.node_count || 1)) * 100));
                    return (
                      <div key={op} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-200 font-semibold">{op}</span>
                          <span className="text-teal-400 font-bold">{count}</span>
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

              <div className="pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
                <button
                  onClick={() => handleCheckCompatibility(selectedModel.id)}
                  disabled={isCheckingCompat}
                  className="w-full rounded-xl bg-zinc-800/90 hover:bg-zinc-800 py-2.5 text-center font-semibold text-zinc-200 transition-all text-xs flex items-center justify-center gap-1.5 border border-zinc-700/80 disabled:opacity-50"
                >
                  <Cpu className="h-3.5 w-3.5 text-teal-400" />
                  {isCheckingCompat ? "Evaluating Matrix..." : "Check Hardware Compatibility Matrix"}
                </button>
                <button
                  onClick={() => onSelectForBenchmark(selectedModel.id)}
                  className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 py-2.5 text-center font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all text-xs"
                >
                  Benchmark in Workbench
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
              {compatData.device_evaluations?.map((devEval: any) => {
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
                      {devEval.findings?.map((f: any, idx: number) => {
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
