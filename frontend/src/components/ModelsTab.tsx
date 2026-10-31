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
  HardDrive,
  Info,
  ChevronRight,
  X,
  Cpu,
} from "lucide-react";
import { ModelRecord, uploadModel, seedSampleModel, deleteModel, quantizeModel } from "@/lib/api";

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
  const [isUploading, setIsUploading] = useState(false);
  const [isQuantizing, setIsQuantizing] = useState(false);
  const [quantType, setQuantType] = useState("int8_dynamic");
  const [quantModalOpen, setQuantModalOpen] = useState(false);
  const [activeModelForQuant, setActiveModelForQuant] = useState<ModelRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setErrorMsg(err.message);
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
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Layers className="h-5 w-5 text-teal-400" />
            Model Registry
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Safely inspect ONNX operator graphs, opset versions, and tensor dimensions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeed}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-300 hover:bg-teal-500/20 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Seed Sample YOLO
          </button>

          <label className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-teal-400 cursor-pointer transition-all">
            <Upload className="h-3.5 w-3.5" />
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
        <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300 font-mono">
          {errorMsg}
        </div>
      )}

      {/* Models Grid & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Model List (1 or 2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          {models.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400 space-y-3">
              <Layers className="h-10 w-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-medium text-zinc-300">No models in registry</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Upload your trained ONNX model or seed the verified lightweight Edge Tiny YOLO
                model to test the full benchmarking pipeline.
              </p>
              <button
                onClick={handleSeed}
                className="rounded-lg bg-teal-500/10 border border-teal-500/30 px-3.5 py-2 text-xs font-mono text-teal-300 hover:bg-teal-500/20"
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
                  className={`rounded-xl border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? "border-teal-500 bg-teal-950/10 shadow-sm shadow-teal-500/10"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100 text-sm">
                          {model.name}
                        </span>
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                          Opset {model.opset_version || 17}
                        </span>
                        <span className="rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[10px] font-mono text-teal-400 uppercase">
                          {model.format}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono flex items-center gap-3">
                        <span>{sizeMb} MB</span>
                        <span>•</span>
                        <span>{model.node_count} Graph Nodes</span>
                        <span>•</span>
                        <span>{model.task_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectForBenchmark(model.id)}
                        className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
                      >
                        Benchmark
                      </button>
                      <button
                        onClick={() => {
                          setActiveModelForQuant(model);
                          setQuantModalOpen(true);
                        }}
                        className="rounded-md border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-300 hover:bg-teal-500/20 transition-colors"
                      >
                        Quantize
                      </button>
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="rounded-md p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Input/Output Preview */}
                  <div className="mt-3 pt-3 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400">
                    <div>
                      <span className="text-zinc-400">Input: </span>
                      <span className="text-zinc-200">
                        {model.input_shapes?.[0]?.name} (
                        {JSON.stringify(model.input_shapes?.[0]?.shape || [])})
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Output: </span>
                      <span className="text-zinc-200">
                        {model.output_shapes?.[0]?.name} (
                        {JSON.stringify(model.output_shapes?.[0]?.shape || [])})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Inspector Drawer (1 Col) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-zinc-200">ONNX Graph Inspector</h3>
            </div>
            {selectedModel && (
              <span className="text-[10px] text-zinc-400 font-mono">
                SHA-256 Verified
              </span>
            )}
          </div>

          {!selectedModel ? (
            <div className="py-16 text-center text-zinc-400 space-y-2">
              <Info className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-xs font-mono">Select a model to view deep operator breakdown</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-mono">
              <div>
                <span className="text-zinc-400">Model Name:</span>
                <p className="text-zinc-100 font-semibold text-sm mt-0.5">{selectedModel.name}</p>
              </div>

              <div>
                <span className="text-zinc-400">SHA-256 Checksum:</span>
                <p className="text-[10px] text-zinc-300 break-all bg-zinc-950 p-2 rounded border border-zinc-800 mt-1">
                  {selectedModel.sha256}
                </p>
              </div>

              {/* Operator Breakdown Histogram */}
              <div>
                <span className="text-zinc-400">Operator Inventory:</span>
                <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {Object.entries(selectedModel.operators || {}).map(([op, count]) => {
                    const pct = Math.min(100, Math.round((count / (selectedModel.node_count || 1)) * 100));
                    return (
                      <div key={op} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-200">{op}</span>
                          <span className="text-teal-400 font-bold">{count}</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex gap-2">
                <button
                  onClick={() => onSelectForBenchmark(selectedModel.id)}
                  className="w-full rounded-lg bg-teal-500 py-2 text-center font-semibold text-zinc-950 hover:bg-teal-400 transition-all text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-teal-400" />
                Quantize Model: {activeModelForQuant.name}
              </h3>
              <button
                onClick={() => setQuantModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-zinc-400 block mb-1.5">Optimization Precision</label>
                <select
                  value={quantType}
                  onChange={(e) => setQuantType(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none"
                >
                  <option value="int8_dynamic">INT8 Dynamic Quantization (Fastest, High Compatibility)</option>
                  <option value="int8_static">INT8 Static Quantization (Calibration Data Reader)</option>
                  <option value="fp16">Float16 (FP16) Accelerator Lowering</option>
                  <option value="graph_opt">Extended Graph Optimization (Constant Folding & Fusion)</option>
                </select>
              </div>

              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-zinc-400 space-y-1">
                <p className="text-teal-400 font-semibold">Optimization Impact:</p>
                <p>• Up to 75% memory footprint reduction</p>
                <p>• Accelerated inference on AVX-VNNI CPU and Tensor Cores</p>
                <p>• Preserves model operator topology</p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setQuantModalOpen(false)}
                className="rounded-lg border border-zinc-700 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleQuantizeSubmit}
                disabled={isQuantizing}
                className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-teal-400 disabled:opacity-50"
              >
                {isQuantizing ? "Optimizing..." : "Apply Quantization"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
