"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  Upload,
  Download,
  Trash2,
  Sliders,
  CheckCircle2,
  FileCode,
  X,
  Cpu,
  ArrowRight,
  Search,
  Copy,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GitBranch,
} from "lucide-react";
import {
  ModelRecord,
  uploadModel,
  seedSampleModel,
  deleteModel,
  quantizeModel,
  fetchCompatibilityMatrix,
} from "@/lib/api";
import { REPLAY_ONNX_NODES, type OnnxGraphNode } from "@/context/ReplayContext";

interface ModelsTabProps {
  models: ModelRecord[];
  onRefresh: () => void;
  onSelectForBenchmark: (modelId: string) => void;
  initialModelId?: string | null;
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

// Robust cross-browser clipboard copy
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
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
      {copied ? <Check className="h-3.5 w-3.5 text-[#73bf69]" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

export const ModelsTab: React.FC<ModelsTabProps> = ({
  models,
  onRefresh,
  onSelectForBenchmark,
  initialModelId,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(initialModelId || null);
  const [prevInitialId, setPrevInitialId] = useState(initialModelId);
  if (initialModelId !== prevInitialId) {
    setPrevInitialId(initialModelId);
    if (initialModelId) {
      setSelectedModelId(initialModelId);
    }
  }
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("ALL");
  const [taskFilter, setTaskFilter] = useState("ALL");

  const [isUploading, setIsUploading] = useState(false);
  const [isQuantizing, setIsQuantizing] = useState(false);
  const [quantType, setQuantType] = useState("int8_dynamic");
  const [quantModalOpen, setQuantModalOpen] = useState(false);
  const [activeModelForQuant, setActiveModelForQuant] = useState<ModelRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [compatModalOpen, setCompatModalOpen] = useState(false);
  const [compatData, setCompatData] = useState<CompatibilityMatrixData | null>(null);
  const [isCheckingCompat, setIsCheckingCompat] = useState(false);


  const [graphViewMode, setGraphViewMode] = useState<"flow" | "list">("flow");
  const [graphSearchQuery, setGraphSearchQuery] = useState("");
  const [graphCategoryFilter, setGraphCategoryFilter] = useState("ALL");
  const [selectedGraphNode, setSelectedGraphNode] = useState<OnnxGraphNode | null>(null);

  const filteredGraphNodes = useMemo(() => {
    return REPLAY_ONNX_NODES.filter((node) => {
      const matchesSearch =
        node.name.toLowerCase().includes(graphSearchQuery.toLowerCase()) ||
        node.opType.toLowerCase().includes(graphSearchQuery.toLowerCase());
      const matchesCategory =
        graphCategoryFilter === "ALL" || node.category === graphCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [graphSearchQuery, graphCategoryFilter]);


  // Helper to extract clean spatial resolution
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
    if (!taskType) return "Detection";
    const normalized = taskType.toLowerCase().replace(/_/g, " ");
    if (normalized.includes("detect")) return "Detection";
    if (normalized.includes("class")) return "Classification";
    if (normalized.includes("seg")) return "Segmentation";
    return taskType;
  };

  const formatShapeString = (shape: (number | string)[]): string => {
    if (!Array.isArray(shape)) return "[-]";
    return `[${shape.join(", ")}]`;
  };

  // Filtered models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (formatFilter !== "ALL" && m.format.toLowerCase() !== formatFilter.toLowerCase()) {
        return false;
      }
      if (taskFilter !== "ALL") {
        const friendly = getFriendlyTaskName(m.task_type).toLowerCase();
        if (!friendly.includes(taskFilter.toLowerCase())) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = m.name.toLowerCase().includes(q);
        const fileMatch = m.filename.toLowerCase().includes(q);
        const taskMatch = (m.task_type || "").toLowerCase().includes(q);
        const formatMatch = (m.format || "").toLowerCase().includes(q);
        return nameMatch || fileMatch || taskMatch || formatMatch;
      }
      return true;
    });
  }, [models, formatFilter, taskFilter, searchQuery]);

  const selectedModel = useMemo(() => {
    if (selectedModelId) {
      const found = filteredModels.find((m) => m.id === selectedModelId);
      if (found) return found;
    }
    return filteredModels[0] || null;
  }, [filteredModels, selectedModelId]);

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
        setDrawerCollapsed(false);
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
        setDrawerCollapsed(false);
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
        setDrawerCollapsed(false);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Quantization failed");
    } finally {
      setIsQuantizing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar - Grafana Panel Toolbar Style */}
      <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8e8e9e]" />
            <input
              type="text"
              placeholder="Search model inventory..."
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

          {/* Format Filter */}
          <div className="flex items-center gap-1.5 bg-[#111217] border border-[#2c3235] rounded-sm px-2.5 py-1 text-xs font-sans">
            <span className="text-[#8e8e9e] font-medium text-xs">Format:</span>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="bg-transparent text-[#ccccdc] text-xs focus:outline-none cursor-pointer font-sans"
            >
              <option value="ALL" className="bg-[#181b1f]">All Formats</option>
              <option value="ONNX" className="bg-[#181b1f]">ONNX</option>
              <option value="TensorRT" className="bg-[#181b1f]">TensorRT</option>
              <option value="OpenVINO" className="bg-[#181b1f]">OpenVINO</option>
              <option value="Hailo" className="bg-[#181b1f]">Hailo</option>
            </select>
          </div>

          {/* Task Filter */}
          <div className="flex items-center gap-1.5 bg-[#111217] border border-[#2c3235] rounded-sm px-2.5 py-1 text-xs font-sans">
            <span className="text-[#8e8e9e] font-medium text-xs">Task:</span>
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="bg-transparent text-[#ccccdc] text-xs focus:outline-none cursor-pointer font-sans"
            >
              <option value="ALL" className="bg-[#181b1f]">All Tasks</option>
              <option value="Detection" className="bg-[#181b1f]">Detection</option>
              <option value="Classification" className="bg-[#181b1f]">Classification</option>
              <option value="Segmentation" className="bg-[#181b1f]">Segmentation</option>
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSeed}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-3 py-1.5 text-xs font-sans font-medium text-[#ccccdc] transition-colors disabled:opacity-50"
            title="Register reference YOLOv8n sample model"
          >
            <Download className="h-3.5 w-3.5 text-[#5794f2]" />
            <span>{isUploading ? "Registering..." : "Seed Sample Model"}</span>
          </button>

          <label className="flex items-center gap-1.5 rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-3 py-1.5 text-xs font-sans font-semibold text-[#111217] cursor-pointer transition-colors">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload ONNX</span>
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

      {/* Error Banner */}
      {errorMsg && (
        <div className="rounded-sm border border-[#f2495c]/40 bg-[#f2495c]/10 p-3 text-xs text-[#f2495c] font-sans flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-[#8e8e9e] hover:text-[#ccccdc]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* PRIMARY VIEW: Model Inventory Data Table */}
      <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm overflow-hidden">
        {/* Table Panel Header */}
        <div className="bg-[#1f2328] px-4 py-2.5 border-b border-[#2c3235] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#5794f2]" />
            <span className="font-sans font-semibold text-xs text-white">
              Model Inventory &amp; Graph Registry
            </span>
            <span className="font-sans text-xs text-[#8e8e9e]">
              ({filteredModels.length} {filteredModels.length === 1 ? "model" : "models"})
            </span>
          </div>
          <span className="font-sans text-xs text-[#8e8e9e] hidden sm:inline">
            Select row to inspect tensor shapes and operator breakdown
          </span>
        </div>

        {/* Data Table */}
        {filteredModels.length === 0 ? (
          <div className="p-8 text-center text-[#8e8e9e] space-y-3 font-sans text-xs">
            <p>No models found matching criteria.</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={handleSeed}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22252b] border border-[#2c3235] rounded-sm text-[#ccccdc] hover:bg-[#2c3235] font-sans"
              >
                <Download className="h-3.5 w-3.5 text-[#5794f2]" />
                <span>Seed Reference Sample</span>
              </button>
              {(searchQuery || formatFilter !== "ALL" || taskFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFormatFilter("ALL");
                    setTaskFilter("ALL");
                  }}
                  className="px-3 py-1.5 bg-[#22252b] border border-[#2c3235] rounded-sm text-[#8e8e9e] hover:text-[#ccccdc] font-sans"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#ccccdc] border-collapse font-sans">
              <thead>
                <tr className="bg-[#141619] border-b border-[#2c3235] text-xs font-sans text-[#8e8e9e]">
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-white">Model Name</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Format</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Opset</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Task</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Input Tensor Shape</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">File Size</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Node Count</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Status</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2c3235]/60">
                {filteredModels.map((model) => {
                  const isSelected = selectedModel?.id === model.id;
                  const sizeMb = (model.file_size_bytes / (1024 * 1024)).toFixed(2);
                  const firstInput = model.input_shapes?.[0];
                  const shapeStr = firstInput ? formatShapeString(firstInput.shape) : getInputResolution(model);
                  const taskFriendly = getFriendlyTaskName(model.task_type);

                  return (
                    <tr
                      key={model.id}
                      onClick={() => {
                        setSelectedModelId(model.id);
                        setDrawerCollapsed(false);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#262c36] border-l-2 border-[#5794f2]"
                          : "hover:bg-[#20232a]"
                      }`}
                    >
                      {/* Name */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-sans font-medium text-white hover:text-[#5794f2] transition-colors">
                            {model.name}
                          </span>
                          <span className="font-mono text-[11px] text-[#8e8e9e] hidden sm:inline">
                            ({model.id.length > 16 ? `${model.id.substring(0, 16)}...` : model.id})
                          </span>
                        </div>
                      </td>

                      {/* Format */}
                      <td className="py-2.5 px-3">
                        <span className="rounded-sm bg-[#22252b] border border-[#2c3235] px-1.5 py-0.5 text-[10px] font-sans uppercase text-[#5794f2] font-semibold">
                          {model.format}
                        </span>
                      </td>

                      {/* Opset (Monospace strictly for opset number) */}
                      <td className="py-2.5 px-3 font-sans text-[#8e8e9e]">
                        Opset <span className="font-mono text-white font-medium">{model.opset_version || 17}</span>
                      </td>

                      {/* Task */}
                      <td className="py-2.5 px-3 font-sans text-[#ccccdc] capitalize">
                        {taskFriendly}
                      </td>

                      {/* Input Tensor Shape (Monospace strictly for tensor shapes) */}
                      <td className="py-2.5 px-3">
                        <code className="font-mono text-xs text-[#5794f2] bg-[#111217] px-1.5 py-0.5 rounded-sm border border-[#2c3235]/60">
                          {shapeStr}
                        </code>
                      </td>

                      {/* File Size */}
                      <td className="py-2.5 px-3 font-sans text-[#ccccdc]">
                        {sizeMb} MB
                      </td>

                      {/* Node Count */}
                      <td className="py-2.5 px-3 font-sans text-[#8e8e9e]">
                        <span className="font-mono text-white font-medium">{model.node_count}</span> ops
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 rounded-sm bg-[#73bf69]/10 border border-[#73bf69]/30 px-1.5 py-0.5 text-[10px] font-sans text-[#73bf69] font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified / Ready
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedModelId(model.id);
                              setDrawerCollapsed(false);
                            }}
                            className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2 py-1 text-[11px] font-sans text-[#ccccdc] transition-colors"
                            title="Inspect tensor and operator breakdown"
                          >
                            Inspect
                          </button>

                          <button
                            onClick={() => onSelectForBenchmark(model.id)}
                            className="rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-2.5 py-1 text-[11px] font-sans font-semibold text-[#111217] transition-colors"
                            title="Directly configure benchmark for this model"
                          >
                            Benchmark
                          </button>

                          <button
                            onClick={() => {
                              setActiveModelForQuant(model);
                              setQuantModalOpen(true);
                            }}
                            className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2 py-1 text-[11px] font-sans text-[#8e8e9e] hover:text-[#ccccdc] transition-colors"
                            title="Quantize to INT8 precision"
                          >
                            INT8
                          </button>

                          <button
                            onClick={() => handleDelete(model.id)}
                            className="p-1 rounded-sm text-[#8e8e9e] hover:text-[#f2495c] hover:bg-[#f2495c]/10 transition-colors"
                            title="Delete model"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* DETAIL / INSPECTION PANEL (Split-View / Collapsible Drawer) */}
      {selectedModel && (
        <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm overflow-hidden space-y-0 transition-all">
          {/* Detail Panel Header */}
          <div className="bg-[#1f2328] px-4 py-2.5 border-b border-[#2c3235] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <FileCode className="h-4 w-4 text-[#5794f2]" />
              <span className="font-sans font-semibold text-xs text-white">
                Model Specification &amp; Graph Inspection
              </span>
              <span className="text-[#8e8e9e]">•</span>
              <span className="font-sans font-bold text-xs text-white">
                {selectedModel.name}
              </span>
              <span className="font-mono text-[11px] text-[#8e8e9e]">
                ({selectedModel.id})
              </span>
              <span className="rounded-sm bg-[#22252b] border border-[#2c3235] px-1.5 py-0.5 text-[10px] font-sans uppercase text-[#5794f2] font-semibold">
                {selectedModel.format}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Direct Benchmark Model Button */}
              <button
                onClick={() => onSelectForBenchmark(selectedModel.id)}
                className="rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-3 py-1.5 text-xs font-sans font-semibold text-[#111217] flex items-center gap-1.5 transition-colors shadow-sm"
                title="Directly benchmark this model"
              >
                <span>Benchmark Model</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => {
                  setActiveModelForQuant(selectedModel);
                  setQuantModalOpen(true);
                }}
                className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2.5 py-1.5 text-xs font-sans font-medium text-[#ccccdc] transition-colors"
              >
                Quantize (INT8)
              </button>

              <button
                onClick={() => handleCheckCompatibility(selectedModel.id)}
                disabled={isCheckingCompat}
                className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2.5 py-1.5 text-xs font-sans font-medium text-[#ccccdc] transition-colors disabled:opacity-50"
              >
                {isCheckingCompat ? "Evaluating..." : "Compatibility Matrix"}
              </button>

              {/* Collapse / Expand Toggle */}
              <button
                onClick={() => setDrawerCollapsed(!drawerCollapsed)}
                className="p-1.5 rounded-sm border border-[#2c3235] bg-[#22252b] text-[#8e8e9e] hover:text-white transition-colors"
                title={drawerCollapsed ? "Expand inspection drawer" : "Collapse inspection drawer"}
              >
                {drawerCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>

              {/* Close Drawer Button */}
              <button
                onClick={() => setSelectedModelId(null)}
                className="p-1.5 rounded-sm border border-[#2c3235] bg-[#22252b] text-[#8e8e9e] hover:text-[#f2495c] transition-colors"
                title="Close inspection drawer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!drawerCollapsed && (
            <div className="p-4 space-y-5 text-xs font-sans">
              {/* Metadata Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                  <span className="font-sans font-semibold text-xs text-[#8e8e9e] block">Graph Nodes</span>
                  <span className="font-sans text-sm font-bold text-[#ccccdc]">
                    <span className="font-mono text-white">{selectedModel.node_count}</span> Operators
                  </span>
                </div>
                <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                  <span className="font-sans font-semibold text-xs text-[#8e8e9e] block">ONNX Opset</span>
                  <span className="font-sans text-sm font-bold text-[#ccccdc]">
                    Opset <span className="font-mono text-white">{selectedModel.opset_version || 17}</span>
                  </span>
                </div>
                <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                  <span className="font-sans font-semibold text-xs text-[#8e8e9e] block">File Size</span>
                  <span className="font-sans text-sm font-bold text-[#ccccdc]">
                    {(selectedModel.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                  <span className="font-sans font-semibold text-xs text-[#8e8e9e] block">Spatial Input</span>
                  <code className="font-mono text-sm font-bold text-[#5794f2] block">
                    {getInputResolution(selectedModel)}
                  </code>
                </div>
              </div>

              {/* Checksum & Path (Monospace strictly for hashes and paths) */}
              <div className="bg-[#111217] border border-[#2c3235] p-3 rounded-sm space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-sans font-semibold text-xs text-[#8e8e9e]">Filepath:</span>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-xs text-[#ccccdc] truncate max-w-md">{selectedModel.filepath}</code>
                    <CopySnippet text={selectedModel.filepath} />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs pt-1 border-t border-[#2c3235]/60">
                  <span className="font-sans font-semibold text-xs text-[#8e8e9e]">SHA-256 Checksum:</span>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-xs text-[#8e8e9e] select-all truncate max-w-md">{selectedModel.sha256}</code>
                    <CopySnippet text={selectedModel.sha256} />
                  </div>
                </div>
              </div>

              {/* Split Tables: Tensor Dimensions & Operator Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Tensor Dimensions Table (6 cols) */}
                <div className="lg:col-span-6 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#2c3235]">
                    <span className="font-sans font-semibold text-xs text-white">
                      Input &amp; Output Tensor Signatures
                    </span>
                    <span className="font-sans text-xs text-[#8e8e9e]">
                      {(selectedModel.input_shapes?.length || 0) + (selectedModel.output_shapes?.length || 0)} total
                    </span>
                  </div>

                  <div className="border border-[#2c3235] rounded-sm overflow-hidden bg-[#111217]">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-[#141619] border-b border-[#2c3235] text-xs font-sans text-[#8e8e9e]">
                          <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc]">Direction</th>
                          <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc]">Tensor Name</th>
                          <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc]">Shape / Dimensions</th>
                          <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc]">Data Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2c3235]/60">
                        {/* Inputs */}
                        {Array.isArray(selectedModel.input_shapes) &&
                          selectedModel.input_shapes.map((inp, idx) => (
                            <tr key={`in-${idx}`} className="hover:bg-[#181b1f]">
                              <td className="py-1.5 px-2.5">
                                <span className="rounded-sm bg-[#5794f2]/10 border border-[#5794f2]/30 px-1 py-0.2 text-[9px] font-sans text-[#5794f2] font-semibold">
                                  INPUT
                                </span>
                              </td>
                              <td className="py-1.5 px-2.5 font-sans text-[#ccccdc] font-medium">{inp.name || `input_${idx}`}</td>
                              <td className="py-1.5 px-2.5">
                                <code className="font-mono text-xs text-[#5794f2] font-semibold">{formatShapeString(inp.shape)}</code>
                              </td>
                              <td className="py-1.5 px-2.5">
                                <code className="font-mono text-xs text-[#8e8e9e]">{inp.dtype || "float32"}</code>
                              </td>
                            </tr>
                          ))}
                        {/* Outputs */}
                        {Array.isArray(selectedModel.output_shapes) &&
                          selectedModel.output_shapes.map((out, idx) => (
                            <tr key={`out-${idx}`} className="hover:bg-[#181b1f]">
                              <td className="py-1.5 px-2.5">
                                <span className="rounded-sm bg-[#73bf69]/10 border border-[#73bf69]/30 px-1 py-0.2 text-[9px] font-sans text-[#73bf69] font-semibold">
                                  OUTPUT
                                </span>
                              </td>
                              <td className="py-1.5 px-2.5 font-sans text-[#ccccdc] font-medium">{out.name || `output_${idx}`}</td>
                              <td className="py-1.5 px-2.5">
                                <code className="font-mono text-xs text-[#73bf69] font-semibold">{formatShapeString(out.shape)}</code>
                              </td>
                              <td className="py-1.5 px-2.5">
                                <code className="font-mono text-xs text-[#8e8e9e]">{out.dtype || "float32"}</code>
                              </td>
                            </tr>
                          ))}
                        {(!selectedModel.input_shapes?.length && !selectedModel.output_shapes?.length) && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-[#8e8e9e] font-sans">
                              No tensor shapes defined
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Operator Breakdown Table (6 cols) */}
                <div className="lg:col-span-6 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#2c3235]">
                    <span className="font-sans font-semibold text-xs text-white">
                      Operator Frequency Breakdown
                    </span>
                    <span className="font-sans text-xs text-[#8e8e9e]">
                      {Object.keys(selectedModel.operators || {}).length} Unique Op Types
                    </span>
                  </div>

                  <div className="border border-[#2c3235] rounded-sm overflow-hidden bg-[#111217] max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-[#141619] border-b border-[#2c3235] text-xs font-sans text-[#8e8e9e] sticky top-0">
                          <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc]">Operator Type</th>
                          <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc] text-right">Count</th>
                          <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc] text-right">Frequency</th>
                          <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc] w-28">Distribution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2c3235]/60">
                        {Object.entries(selectedModel.operators || {})
                          .sort(([, a], [, b]) => b - a)
                          .map(([op, count]) => {
                            const pct = Math.min(
                              100,
                              Math.round((count / (selectedModel.node_count || 1)) * 100)
                            );
                            return (
                              <tr key={op} className="hover:bg-[#181b1f]">
                                <td className="py-1.5 px-2.5 font-mono text-xs text-[#ccccdc] font-medium">{op}</td>
                                <td className="py-1.5 px-2.5 text-right font-mono text-white font-bold">{count}</td>
                                <td className="py-1.5 px-2.5 text-right font-mono text-[#5794f2]">{pct}%</td>
                                <td className="py-1.5 px-2.5">
                                  <div className="h-1.5 w-full bg-[#22252b] rounded-none overflow-hidden">
                                    <div
                                      className="h-full bg-[#5794f2]"
                                      style={{ width: `${Math.max(4, pct)}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        {!Object.keys(selectedModel.operators || {}).length && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-[#8e8e9e] font-sans">
                              No operator data recorded
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Supported Runtime Backends & Execution Providers */}
              <div className="space-y-2 pt-2 border-t border-[#2c3235]">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-semibold text-xs text-white">
                    Supported Runtime Backends &amp; Execution Providers
                  </span>
                  <span className="font-sans text-xs text-[#73bf69] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Benchmark
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-semibold text-[#ccccdc]">ONNX Runtime CPU</span>
                      <span className="text-[9px] bg-[#73bf69]/10 text-[#73bf69] border border-[#73bf69]/30 px-1 rounded-sm font-sans font-medium">
                        ACTIVE
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-[#8e8e9e]">CPUExecutionProvider (Native AVX / VNNI)</p>
                    <p className="font-sans text-[11px] text-[#5794f2]">FP32, INT8 Dynamic</p>
                  </div>

                  <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-semibold text-[#ccccdc]">TensorRT Execution</span>
                      <span className="text-[9px] bg-[#5794f2]/10 text-[#5794f2] border border-[#5794f2]/30 px-1 rounded-sm font-sans font-medium">
                        ACCELERATED
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-[#8e8e9e]">TensorrtExecutionProvider (CUDA Cores)</p>
                    <p className="font-sans text-[11px] text-[#5794f2]">FP32, FP16, INT8 Static</p>
                  </div>

                  <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-semibold text-[#ccccdc]">Intel OpenVINO</span>
                      <span className="text-[9px] bg-[#22252b] text-[#8e8e9e] border border-[#2c3235] px-1 rounded-sm font-sans font-medium">
                        SUPPORTED
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-[#8e8e9e]">OpenVINOExecutionProvider (Intel CPU/iGPU/NPU)</p>
                    <p className="font-sans text-[11px] text-[#5794f2]">FP32, FP16, INT8</p>
                  </div>

                  <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-semibold text-[#ccccdc]">HailoRT Engine</span>
                      <span className="text-[9px] bg-[#f59f00]/10 text-[#f59f00] border border-[#f59f00]/30 px-1 rounded-sm font-sans font-medium">
                        COMPILATION
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-[#8e8e9e]">Hailo Dataflow Compiler (Hailo-8 M.2 NPU)</p>
                    <p className="font-sans text-[11px] text-[#5794f2]">INT8 Quantized HAR</p>
                  </div>
                </div>
              </div>

              {/* ONNX Graph Visualizer & Operator Topology */}
              <div className="space-y-3 pt-3 border-t border-[#2c3235]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-[#5794f2]" />
                    <span className="font-sans font-semibold text-xs text-white">
                      ONNX Operator Graph &amp; Execution Topology
                    </span>
                    <span className="text-[10px] bg-[#5794f2]/10 text-[#5794f2] border border-[#5794f2]/30 px-1.5 py-0.5 rounded-sm font-mono">
                      {REPLAY_ONNX_NODES.length} nodes
                    </span>
                  </div>

                  {/* View Controls & Filter */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[#111217] border border-[#2c3235] rounded-sm p-0.5 text-[11px] font-sans">
                      <button
                        onClick={() => setGraphViewMode("flow")}
                        className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
                          graphViewMode === "flow" ? "bg-[#22252b] text-white" : "text-[#8e8e9e] hover:text-[#ccccdc]"
                        }`}
                      >
                        Flowchart
                      </button>
                      <button
                        onClick={() => setGraphViewMode("list")}
                        className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
                          graphViewMode === "list" ? "bg-[#22252b] text-white" : "text-[#8e8e9e] hover:text-[#ccccdc]"
                        }`}
                      >
                        Table
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-[#8e8e9e] absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search nodes..."
                        value={graphSearchQuery}
                        onChange={(e) => setGraphSearchQuery(e.target.value)}
                        className="bg-[#111217] border border-[#2c3235] text-white text-[11px] font-sans pl-7 pr-2 py-1 rounded-sm focus:outline-none focus:border-[#5794f2] w-32"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-sans text-[#8e8e9e] mr-1">Filter Op:</span>
                  {["ALL", "conv", "norm", "activation", "pooling", "fusion", "output"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setGraphCategoryFilter(cat)}
                      className={`text-[10px] px-2 py-0.5 rounded-sm uppercase font-mono font-medium border transition-colors ${
                        graphCategoryFilter === cat
                          ? "bg-[#5794f2] border-[#5794f2] text-white"
                          : "bg-[#111217] border-[#2c3235] text-[#8e8e9e] hover:text-[#ccccdc] hover:border-[#384047]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Flowchart Visualizer */}
                {graphViewMode === "flow" ? (
                  <div className="bg-[#111217] border border-[#2c3235] rounded-sm p-4 overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-max py-2">
                      {/* Input Node */}
                      <div className="flex flex-col items-center justify-center p-2.5 rounded-sm bg-[#181b1f] border border-[#5794f2]/40 text-center min-w-[110px]">
                        <span className="text-[10px] font-mono text-[#5794f2] uppercase tracking-wider font-semibold">
                          Graph Input
                        </span>
                        <span className="text-xs font-mono text-white font-medium">images</span>
                        <span className="text-[10px] font-mono text-[#8e8e9e] mt-0.5">[1, 3, 640, 640]</span>
                      </div>

                      <ArrowRight className="h-4 w-4 text-[#464c54] shrink-0" />

                      {/* Filtered Nodes */}
                      {filteredGraphNodes.map((node, idx) => {
                        const isSelected = selectedGraphNode?.id === node.id;
                        let badgeColor = "bg-[#5794f2]/10 text-[#5794f2] border-[#5794f2]/30";
                        if (node.category === "activation") badgeColor = "bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/30";
                        if (node.category === "pooling") badgeColor = "bg-[#f59f00]/10 text-[#f59f00] border-[#f59f00]/30";
                        if (node.category === "fusion") badgeColor = "bg-[#d470a1]/10 text-[#d470a1] border-[#d470a1]/30";
                        if (node.category === "norm") badgeColor = "bg-[#8e8e9e]/10 text-[#ccccdc] border-[#8e8e9e]/30";
                        if (node.category === "output") badgeColor = "bg-[#73bf69]/10 text-[#73bf69] border-[#73bf69]/30";

                        return (
                          <React.Fragment key={node.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedGraphNode(node)}
                              className={`flex flex-col items-start p-2.5 rounded-sm text-left transition-all min-w-[130px] border cursor-pointer ${
                                isSelected
                                  ? "bg-[#22252b] border-[#5794f2] shadow-md shadow-[#5794f2]/10"
                                  : "bg-[#181b1f] border-[#2c3235] hover:border-[#464c54]"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-sm border ${badgeColor}`}>
                                  {node.opType}
                                </span>
                                <span className="text-[9px] font-mono text-[#8e8e9e]">#{node.id.replace("node_", "")}</span>
                              </div>
                              <span className="text-xs font-mono text-white truncate max-w-[120px] font-medium" title={node.name}>
                                {node.name.split("/").pop() || node.name}
                              </span>
                              <span className="text-[10px] font-mono text-[#8e8e9e] truncate max-w-[120px] mt-0.5">
                                {node.outputs[0]?.split("/").pop()}
                              </span>
                            </button>
                            {idx < filteredGraphNodes.length - 1 && (
                              <ArrowRight className="h-3.5 w-3.5 text-[#464c54] shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}

                      <ArrowRight className="h-4 w-4 text-[#464c54] shrink-0" />

                      {/* Output Node */}
                      <div className="flex flex-col items-center justify-center p-2.5 rounded-sm bg-[#181b1f] border border-[#73bf69]/40 text-center min-w-[110px]">
                        <span className="text-[10px] font-mono text-[#73bf69] uppercase tracking-wider font-semibold">
                          Graph Output
                        </span>
                        <span className="text-xs font-mono text-white font-medium">output0</span>
                        <span className="text-[10px] font-mono text-[#8e8e9e] mt-0.5">[1, 84, 8400]</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Table / List View */
                  <div className="bg-[#111217] border border-[#2c3235] rounded-sm overflow-hidden">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-[#181b1f] text-[#8e8e9e] border-b border-[#2c3235]">
                        <tr>
                          <th className="py-2 px-3 font-semibold">ID</th>
                          <th className="py-2 px-3 font-semibold">Op Type</th>
                          <th className="py-2 px-3 font-semibold">Node Name</th>
                          <th className="py-2 px-3 font-semibold">Inputs</th>
                          <th className="py-2 px-3 font-semibold">Outputs</th>
                          <th className="py-2 px-3 font-semibold">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2c3235] text-[#ccccdc]">
                        {filteredGraphNodes.map((n) => {
                          const isSelected = selectedGraphNode?.id === n.id;
                          return (
                            <tr
                              key={n.id}
                              onClick={() => setSelectedGraphNode(n)}
                              className={`cursor-pointer hover:bg-[#1f2328] transition-colors ${
                                isSelected ? "bg-[#22252b] text-white" : ""
                              }`}
                            >
                              <td className="py-1.5 px-3 text-[#5794f2]">{n.id}</td>
                              <td className="py-1.5 px-3 font-semibold">{n.opType}</td>
                              <td className="py-1.5 px-3 text-white truncate max-w-[200px]">{n.name}</td>
                              <td className="py-1.5 px-3 text-[#8e8e9e] truncate max-w-[180px]">{n.inputs.join(", ")}</td>
                              <td className="py-1.5 px-3 text-[#73bf69] truncate max-w-[180px]">{n.outputs.join(", ")}</td>
                              <td className="py-1.5 px-3 uppercase text-[10px] text-[#ccccdc]">{n.category}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Node Inspector Panel */}
                {selectedGraphNode && (
                  <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#2c3235] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-[#5794f2]/20 text-[#5794f2] px-1.5 py-0.5 rounded-sm font-semibold">
                          NODE INSPECTOR
                        </span>
                        <span className="text-xs font-mono text-white font-semibold">{selectedGraphNode.name}</span>
                        <span className="text-xs font-mono text-[#8e8e9e]">({selectedGraphNode.opType})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#8e8e9e]">Category:</span>
                        <span className="text-[10px] font-mono text-[#5794f2] uppercase font-medium">{selectedGraphNode.category}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                      {/* Inputs */}
                      <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm space-y-1">
                        <span className="text-[10px] uppercase text-[#8e8e9e] font-semibold block">Input Tensors</span>
                        <ul className="space-y-1 text-[11px] text-[#ccccdc]">
                          {selectedGraphNode.inputs.map((inp, idx) => (
                            <li key={idx} className="truncate text-[#5794f2] flex items-center gap-1">
                              <span>•</span>
                              <span title={inp}>{inp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Outputs */}
                      <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm space-y-1">
                        <span className="text-[10px] uppercase text-[#8e8e9e] font-semibold block">Output Tensors</span>
                        <ul className="space-y-1 text-[11px] text-[#ccccdc]">
                          {selectedGraphNode.outputs.map((out, idx) => (
                            <li key={idx} className="truncate text-[#73bf69] flex items-center gap-1">
                              <span>•</span>
                              <span title={out}>{out}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Attributes & Hardware Kernel Mapping */}
                      <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm space-y-1">
                        <span className="text-[10px] uppercase text-[#8e8e9e] font-semibold block">Attributes &amp; Kernel</span>
                        <div className="text-[11px] text-[#ccccdc] space-y-1">
                          {Object.keys(selectedGraphNode.attributes).length > 0 ? (
                            Object.entries(selectedGraphNode.attributes).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-[#8e8e9e]">{k}:</span>
                                <span className="text-white font-mono">{JSON.stringify(v)}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[#8e8e9e] italic">No custom attributes</span>
                          )}
                          <div className="pt-1.5 border-t border-[#2c3235] text-[10px] text-[#f59f00]">
                            ⚡ Mapped to: {selectedGraphNode.opType === "Conv" ? "cuDNN implicit GEMM / VNNI Conv" : selectedGraphNode.opType === "BatchNormalization" ? "Fused Conv+BN Scale kernel" : selectedGraphNode.opType === "MaxPool" ? "TensorRT pooling kernel" : "Element-wise SIMD kernel"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quantization Modal (Grafana Panel Style) */}
      {quantModalOpen && activeModelForQuant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-sm border border-[#2c3235] bg-[#181b1f] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2c3235] pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#5794f2]" />
                <h3 className="font-sans font-semibold text-xs text-white">
                  Quantize Model: {activeModelForQuant.name}
                </h3>
              </div>
              <button
                onClick={() => setQuantModalOpen(false)}
                className="text-[#8e8e9e] hover:text-[#ccccdc] p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="font-sans font-semibold text-xs text-[#8e8e9e] block mb-1.5">
                  Optimization Precision Strategy
                </label>
                <select
                  value={quantType}
                  onChange={(e) => setQuantType(e.target.value)}
                  className="w-full rounded-sm border border-[#2c3235] bg-[#111217] p-2 text-[#ccccdc] focus:border-[#5794f2] focus:outline-none font-sans"
                >
                  <option value="int8_dynamic">INT8 Dynamic Quantization (Fastest, High Compatibility)</option>
                  <option value="int8_static">INT8 Static Quantization (Calibration Data Reader)</option>
                  <option value="fp16">Float16 (FP16) Accelerator Lowering</option>
                  <option value="graph_opt">Extended Graph Optimization (Constant Folding &amp; Fusion)</option>
                </select>
              </div>

              <div className="rounded-sm bg-[#111217] border border-[#2c3235] p-3 text-[#8e8e9e] space-y-1 text-xs font-sans">
                <p className="text-[#5794f2] font-semibold">Telemetry &amp; Footprint Impact:</p>
                <p>• Up to 75% memory RSS footprint reduction</p>
                <p>• Accelerates execution on AVX-VNNI CPU and Tensor Cores</p>
                <p>• Preserves node topology and input/output tensor signature</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2c3235]">
              <button
                onClick={() => setQuantModalOpen(false)}
                className="rounded-sm border border-[#2c3235] bg-[#22252b] px-3 py-1.5 text-xs font-sans font-medium text-[#ccccdc] hover:bg-[#2c3235] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuantizeSubmit}
                disabled={isQuantizing}
                className="rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-4 py-1.5 text-xs font-sans font-semibold text-[#111217] disabled:opacity-50 transition-colors"
              >
                {isQuantizing ? "Optimizing..." : "Apply Quantization"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compatibility Matrix Modal (Grafana Panel Style) */}
      {compatModalOpen && compatData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-sm border border-[#2c3235] bg-[#181b1f] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2c3235] p-4 bg-[#141619]">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-[#5794f2]" />
                <div>
                  <h3 className="font-sans font-semibold text-xs text-white">
                    Edge Hardware Compatibility Matrix
                  </h3>
                  <p className="text-xs text-[#8e8e9e] font-sans">
                    Model: {compatData.model_name} <span className="font-mono">({compatData.model_id})</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompatModalOpen(false)}
                className="text-[#8e8e9e] hover:text-[#ccccdc] p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs font-sans">
              {compatData.device_evaluations?.map((devEval: DeviceEvaluation) => {
                const statusBadge =
                  devEval.overall_status === "COMPATIBLE"
                    ? "border-[#73bf69]/30 bg-[#73bf69]/10 text-[#73bf69]"
                    : devEval.overall_status === "CONDITIONAL"
                    ? "border-[#f59f00]/30 bg-[#f59f00]/10 text-[#f59f00]"
                    : "border-[#f2495c]/30 bg-[#f2495c]/10 text-[#f2495c]";

                return (
                  <div
                    key={devEval.hardware_id}
                    className="rounded-sm border border-[#2c3235] bg-[#111217] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-semibold text-white">
                          {devEval.hardware_name}
                        </span>
                        <span className="text-xs text-[#8e8e9e] font-sans">
                          ({devEval.runtime} • {devEval.precision?.toUpperCase()})
                        </span>
                      </div>
                      <span className={`text-[10px] font-sans font-bold px-1.5 py-0.2 rounded-sm border ${statusBadge}`}>
                        {devEval.overall_status}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      {devEval.findings?.map((f: DeviceFinding, idx: number) => {
                        const sevBadge =
                          f.severity === "ERROR"
                            ? "text-[#f2495c] bg-[#f2495c]/10 border-[#f2495c]/30"
                            : f.severity === "WARNING"
                            ? "text-[#f59f00] bg-[#f59f00]/10 border-[#f59f00]/30"
                            : "text-[#8e8e9e] bg-[#22252b] border-[#2c3235]";

                        return (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded-sm bg-[#181b1f] border border-[#2c3235] space-y-1 font-sans"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-sans font-bold px-1 py-0.2 rounded-sm border ${sevBadge}`}>
                                {f.severity}
                              </span>
                              <span className="text-[#ccccdc] font-sans">{f.message}</span>
                            </div>
                            <p className="text-[11px] text-[#5794f2] pl-1 font-sans">
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

            <div className="border-t border-[#2c3235] p-3 bg-[#141619] flex justify-end">
              <button
                onClick={() => setCompatModalOpen(false)}
                className="rounded-sm bg-[#22252b] hover:bg-[#2c3235] border border-[#2c3235] px-4 py-1.5 text-xs font-sans font-semibold text-[#ccccdc] transition-colors"
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
