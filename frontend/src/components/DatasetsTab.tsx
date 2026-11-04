"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Database,
  Upload,
  Download,
  Image as ImageIcon,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  X,
  Search,
  ArrowRight,
  BarChart3,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode,
} from "lucide-react";
import {
  DatasetRecord,
  seedSampleDataset,
  uploadDataset,
  fetchDatasetPreview,
} from "@/lib/api";

interface DatasetsTabProps {
  datasets: DatasetRecord[];
  onRefresh: () => void;
  onSelectForBenchmark?: (datasetId: string) => void;
}

interface SampleBox {
  class_id: number;
  box: [number, number, number, number]; // [x1, y1, x2, y2]
}

interface SampleItem {
  filename: string;
  width: number;
  height: number;
  boxes: SampleBox[];
  image_url: string;
}

interface PreviewData {
  dataset_id: string;
  classes: string[];
  total_samples: number;
  samples: SampleItem[];
}

// Neutral, crisp Grafana palette for computer vision annotations (no purple/neon)
const GRAFANA_BOX_PALETTE = [
  { border: "border-[#5794f2]", bg: "bg-[#5794f2]/15", text: "text-[#5794f2]", badgeBg: "bg-[#181b1f] border-[#5794f2]/50 text-[#5794f2]", swatchBg: "bg-[#5794f2]" },
  { border: "border-[#73bf69]", bg: "bg-[#73bf69]/15", text: "text-[#73bf69]", badgeBg: "bg-[#181b1f] border-[#73bf69]/50 text-[#73bf69]", swatchBg: "bg-[#73bf69]" },
  { border: "border-[#f59f00]", bg: "bg-[#f59f00]/15", text: "text-[#f59f00]", badgeBg: "bg-[#181b1f] border-[#f59f00]/50 text-[#f59f00]", swatchBg: "bg-[#f59f00]" },
  { border: "border-[#f2495c]", bg: "bg-[#f2495c]/15", text: "text-[#f2495c]", badgeBg: "bg-[#181b1f] border-[#f2495c]/50 text-[#f2495c]", swatchBg: "bg-[#f2495c]" },
  { border: "border-[#ccccdc]", bg: "bg-[#ccccdc]/15", text: "text-[#ccccdc]", badgeBg: "bg-[#181b1f] border-[#ccccdc]/50 text-[#ccccdc]", swatchBg: "bg-[#ccccdc]" },
  { border: "border-[#8e8e9e]", bg: "bg-[#8e8e9e]/15", text: "text-[#8e8e9e]", badgeBg: "bg-[#181b1f] border-[#8e8e9e]/50 text-[#8e8e9e]", swatchBg: "bg-[#8e8e9e]" },
];

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

export const DatasetsTab: React.FC<DatasetsTabProps> = ({
  datasets,
  onRefresh,
  onSelectForBenchmark,
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [annotationViewTab, setAnnotationViewTab] = useState<"table" | "coco">("table");
  const [copiedCoco, setCopiedCoco] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("ALL");
  const [taskFilter, setTaskFilter] = useState("ALL");

  const [isUploading, setIsUploading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const [showBoxes, setShowBoxes] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload Form state
  const [datasetName, setDatasetName] = useState("");
  const [taskType, setTaskType] = useState("object_detection");
  const [formatType, setFormatType] = useState("yolo");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewError, setPreviewError] = useState<{ id: string; error: string } | null>(null);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  // Filter datasets
  const filteredDatasets = useMemo(() => {
    return datasets.filter((d) => {
      if (formatFilter !== "ALL" && d.format.toLowerCase() !== formatFilter.toLowerCase()) {
        return false;
      }
      if (taskFilter !== "ALL") {
        const normTask = d.task_type.toLowerCase();
        if (!normTask.includes(taskFilter.toLowerCase())) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = d.name.toLowerCase().includes(q);
        const formatMatch = d.format.toLowerCase().includes(q);
        const taskMatch = d.task_type.toLowerCase().includes(q);
        const classMatch = Array.isArray(d.classes) && d.classes.some((c) => c.toLowerCase().includes(q));
        return nameMatch || formatMatch || taskMatch || classMatch;
      }
      return true;
    });
  }, [datasets, formatFilter, taskFilter, searchQuery]);

  const activeDatasetId = useMemo(() => {
    if (selectedDatasetId && filteredDatasets.some((d) => d.id === selectedDatasetId)) {
      return selectedDatasetId;
    }
    return filteredDatasets[0]?.id || null;
  }, [selectedDatasetId, filteredDatasets]);

  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === activeDatasetId) || null;
  }, [datasets, activeDatasetId]);

  const hasErrorForActive = previewError?.id === activeDatasetId;
  const previewLoading = Boolean(
    activeDatasetId && !hasErrorForActive && previewData?.dataset_id !== activeDatasetId
  );

  // Load preview data when activeDatasetId changes
  useEffect(() => {
    if (!activeDatasetId) {
      return;
    }
    let isMounted = true;
    fetchDatasetPreview(activeDatasetId)
      .then((data) => {
        if (isMounted) {
          setPreviewData(data);
          setActiveSampleIndex(0);
          setPreviewError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.error("Failed to load dataset preview:", err);
          setPreviewError({
            id: activeDatasetId,
            error: err instanceof Error ? err.message : "Failed to load dataset preview",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeDatasetId]);

  const handleSeed = async () => {
    setIsSeeding(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const seeded = await seedSampleDataset();
      setSuccessMsg(`Sample dataset "${seeded.name}" seeded successfully.`);
      onRefresh();
      setSelectedDatasetId(seeded.id);
      setDrawerCollapsed(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to seed sample dataset");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please select a ZIP file archive to upload.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (datasetName.trim()) {
        formData.append("name", datasetName.trim());
      }
      formData.append("task_type", taskType);
      formData.append("format", formatType);

      const created = await uploadDataset(formData);
      setSuccessMsg(`Dataset "${created.name}" uploaded successfully.`);
      setUploadModalOpen(false);
      setSelectedFile(null);
      setDatasetName("");
      onRefresh();
      setSelectedDatasetId(created.id);
      setDrawerCollapsed(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload dataset");
    } finally {
      setIsUploading(false);
    }
  };

  const currentSample = activeDatasetId ? previewData?.samples?.[activeSampleIndex] : null;

  // Calculate class distribution across all preview samples
  const classDistribution = useMemo(() => {
    if (!previewData || !Array.isArray(previewData.samples)) return [];

    const counts: Record<number, number> = {};
    let totalBoxes = 0;

    previewData.samples.forEach((sample) => {
      if (Array.isArray(sample.boxes)) {
        sample.boxes.forEach((box) => {
          counts[box.class_id] = (counts[box.class_id] || 0) + 1;
          totalBoxes++;
        });
      }
    });

    const classList = previewData.classes || [];
    return Object.entries(counts).map(([classIdStr, count]) => {
      const classId = Number(classIdStr);
      const name = classList[classId] || `Class ${classId}`;
      const pct = totalBoxes > 0 ? Math.round((count / totalBoxes) * 100) : 0;
      return { classId, name, count, pct, totalBoxes };
    }).sort((a, b) => b.count - a.count);
  }, [previewData]);

  const totalAnnotationsInPreview = useMemo(() => {
    if (!previewData?.samples) return 0;
    return previewData.samples.reduce((acc, s) => acc + (s.boxes?.length || 0), 0);
  }, [previewData]);

  // Generate COCO annotation JSON object for the current sample frame
  const currentCocoJson = useMemo(() => {
    if (!currentSample) return null;
    const imgWidth = currentSample.width || 640;
    const imgHeight = currentSample.height || 640;

    const annotations = (currentSample.boxes || []).map((b, idx) => {
      const x = Math.round(b.box[0]);
      const y = Math.round(b.box[1]);
      const w = Math.round(b.box[2] - b.box[0]);
      const h = Math.round(b.box[3] - b.box[1]);
      const className = previewData?.classes?.[b.class_id] || `class_${b.class_id}`;
      return {
        id: idx + 1,
        image_id: activeSampleIndex + 1,
        category_id: b.class_id,
        category_name: className,
        bbox: [x, y, w, h], // COCO standard: [x, y, width, height]
        area: w * h,
        iscrowd: 0,
      };
    });

    const categories = (previewData?.classes || []).map((name, id) => ({
      id,
      name,
      supercategory: "object",
    }));

    return {
      image: {
        id: activeSampleIndex + 1,
        file_name: currentSample.filename,
        width: imgWidth,
        height: imgHeight,
      },
      annotations,
      categories,
    };
  }, [currentSample, activeSampleIndex, previewData]);

  const handleCopyCocoJson = async () => {
    if (!currentCocoJson) return;
    const ok = await copyToClipboard(JSON.stringify(currentCocoJson, null, 2));
    if (ok) {
      setCopiedCoco(true);
      setTimeout(() => setCopiedCoco(false), 2000);
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
              placeholder="Search dataset inventory..."
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
              <option value="YOLO" className="bg-[#181b1f]">YOLO</option>
              <option value="COCO" className="bg-[#181b1f]">COCO</option>
              <option value="VOC" className="bg-[#181b1f]">VOC</option>
              <option value="ImageNet" className="bg-[#181b1f]">ImageNet</option>
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
              <option value="detection" className="bg-[#181b1f]">Detection</option>
              <option value="classification" className="bg-[#181b1f]">Classification</option>
              <option value="segmentation" className="bg-[#181b1f]">Segmentation</option>
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center gap-1.5 rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-3 py-1.5 text-xs font-sans font-medium text-[#ccccdc] transition-colors disabled:opacity-50"
            title="Seed 12-frame reference ground-truth dataset"
          >
            <Download className="h-3.5 w-3.5 text-[#5794f2]" />
            <span>{isSeeding ? "Seeding..." : "Seed Sample Dataset"}</span>
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-1.5 rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-3 py-1.5 text-xs font-sans font-semibold text-[#111217] transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Dataset (ZIP)</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
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

      {successMsg && (
        <div className="rounded-sm border border-[#73bf69]/40 bg-[#73bf69]/10 p-3 text-xs text-[#73bf69] font-sans flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[#8e8e9e] hover:text-[#ccccdc]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* PRIMARY VIEW: Dataset Inventory Data Table */}
      <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm overflow-hidden">
        {/* Table Header */}
        <div className="bg-[#1f2328] px-4 py-2.5 border-b border-[#2c3235] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#5794f2]" />
            <span className="font-sans font-semibold text-xs text-white">
              Dataset Inventory &amp; Ground-Truth Verification
            </span>
            <span className="font-sans text-xs text-[#8e8e9e]">
              ({filteredDatasets.length} {filteredDatasets.length === 1 ? "dataset" : "datasets"})
            </span>
          </div>
          <span className="font-sans text-xs text-[#8e8e9e] hidden sm:inline">
            Select row to preview ground-truth annotations and class distribution
          </span>
        </div>

        {/* Data Table */}
        {filteredDatasets.length === 0 ? (
          <div className="p-8 text-center text-[#8e8e9e] space-y-3 font-sans text-xs">
            <p>No validation datasets found matching criteria.</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={handleSeed}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22252b] border border-[#2c3235] rounded-sm text-[#ccccdc] hover:bg-[#2c3235] font-sans"
              >
                <Download className="h-3.5 w-3.5 text-[#5794f2]" />
                <span>Seed 12-Frame Reference Dataset</span>
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
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-white">Dataset Name</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Format</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Sample Count</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Classes Count</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Resolution</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Validation Status</th>
                  <th className="py-2.5 px-3 font-sans font-semibold text-xs text-[#ccccdc] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2c3235]/60">
                {filteredDatasets.map((dataset) => {
                  const isSelected = activeDatasetId === dataset.id;
                  const friendlyTask = dataset.task_type.replace(/_/g, " ");
                  const classCount = dataset.classes?.length || 0;
                  const resolution = "640 × 640"; // standard vision resolution

                  return (
                    <tr
                      key={dataset.id}
                      onClick={() => {
                        setSelectedDatasetId(dataset.id);
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
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans font-medium text-white hover:text-[#5794f2] transition-colors">
                              {dataset.name}
                            </span>
                            <span className="font-sans text-[11px] text-[#8e8e9e] capitalize">
                              ({friendlyTask})
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-[#8e8e9e] truncate max-w-xs">
                            {dataset.filepath}
                          </div>
                        </div>
                      </td>

                      {/* Format */}
                      <td className="py-2.5 px-3">
                        <span className="rounded-sm bg-[#22252b] border border-[#2c3235] px-1.5 py-0.5 text-[10px] font-sans uppercase text-[#5794f2] font-semibold">
                          {dataset.format}
                        </span>
                      </td>

                      {/* Sample Count */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-white font-medium">{dataset.num_samples}</span>{" "}
                        <span className="font-sans text-[#ccccdc]">frames</span>
                      </td>

                      {/* Classes Count */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-white font-medium">{classCount}</span>{" "}
                        <span className="font-sans text-[#ccccdc]">
                          {classCount === 1 ? "class" : "classes"}
                        </span>
                        {dataset.classes && dataset.classes.length > 0 && (
                          <span className="font-sans text-[11px] text-[#8e8e9e] ml-1.5 hidden sm:inline">
                            ({dataset.classes.slice(0, 3).join(", ")}{dataset.classes.length > 3 ? "..." : ""})
                          </span>
                        )}
                      </td>

                      {/* Resolution (monospaced dimensions) */}
                      <td className="py-2.5 px-3">
                        <code className="font-mono text-xs text-[#8e8e9e] bg-[#111217] px-1.5 py-0.5 rounded-sm border border-[#2c3235]/60">
                          {resolution}
                        </code>
                      </td>

                      {/* Validation Status */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 rounded-sm bg-[#73bf69]/10 border border-[#73bf69]/30 px-1.5 py-0.5 text-[10px] font-sans text-[#73bf69] font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedDatasetId(dataset.id);
                              setDrawerCollapsed(false);
                            }}
                            className="rounded-sm border border-[#2c3235] bg-[#22252b] hover:bg-[#2c3235] px-2 py-1 text-[11px] font-sans text-[#ccccdc] transition-colors"
                            title="Inspect ground-truth annotations and class distribution"
                          >
                            Inspect
                          </button>

                          {onSelectForBenchmark && (
                            <button
                              onClick={() => onSelectForBenchmark(dataset.id)}
                              className="rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-2.5 py-1 text-[11px] font-sans font-semibold text-[#111217] transition-colors"
                              title="Select this dataset for benchmark accuracy evaluation"
                            >
                              Select for Benchmark
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

      {/* DETAIL / INSPECTION PANEL: Split-View Collapsible Drawer */}
      {activeDataset && (
        <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm overflow-hidden transition-all">
          {/* Detail Panel Header */}
          <div className="bg-[#1f2328] px-4 py-2.5 border-b border-[#2c3235] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Crosshair className="h-4 w-4 text-[#5794f2]" />
              <span className="font-sans font-semibold text-xs text-white">
                Dataset Inspection &amp; Annotation Overlay
              </span>
              <span className="text-[#8e8e9e]">•</span>
              <span className="font-sans font-bold text-xs text-white">
                {activeDataset.name}
              </span>
              <span className="font-mono text-[11px] text-[#8e8e9e]">
                ({activeDataset.id})
              </span>
              <span className="rounded-sm bg-[#22252b] border border-[#2c3235] px-1.5 py-0.5 text-[10px] font-sans uppercase text-[#5794f2] font-semibold">
                {activeDataset.format}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onSelectForBenchmark && (
                <button
                  onClick={() => onSelectForBenchmark(activeDataset.id)}
                  className="rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-3 py-1.5 text-xs font-sans font-semibold text-[#111217] flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Directly select dataset for hardware benchmark"
                >
                  <span>Select Dataset for Benchmark</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Collapse / Expand Toggle */}
              <button
                onClick={() => setDrawerCollapsed(!drawerCollapsed)}
                className="p-1.5 rounded-sm border border-[#2c3235] bg-[#22252b] text-[#8e8e9e] hover:text-white transition-colors"
                title={drawerCollapsed ? "Expand dataset drawer" : "Collapse dataset drawer"}
              >
                {drawerCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>

              {/* Close Drawer Button */}
              <button
                onClick={() => setSelectedDatasetId(null)}
                className="p-1.5 rounded-sm border border-[#2c3235] bg-[#22252b] text-[#8e8e9e] hover:text-[#f2495c] transition-colors"
                title="Close dataset drawer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!drawerCollapsed && (
            <div className="p-4 space-y-4 text-xs font-sans">
              {/* Split Grid: Left = Annotation Viewfinder & COCO Detail; Right = Class Distribution & Metadata */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Column: Interactive Annotation Viewfinder & Annotations (7 cols) */}
                <div className="lg:col-span-7 space-y-3">
                  {/* Viewfinder Toolbar */}
                  <div className="bg-[#141619] border border-[#2c3235] rounded-sm p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#ccccdc]">
                      <span className="font-sans font-semibold text-white">
                        {currentSample?.filename || "Loading frame..."}
                      </span>
                      {currentSample && (
                        <span className="font-mono text-xs text-[#8e8e9e]">
                          ({currentSample.width}×{currentSample.height}px • {currentSample.boxes?.length || 0} targets)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs font-sans text-[#8e8e9e] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showBoxes}
                          onChange={(e) => setShowBoxes(e.target.checked)}
                          className="rounded-none border-[#2c3235] bg-[#111217] text-[#5794f2] focus:ring-0"
                        />
                        <span>Show Bounding Boxes</span>
                      </label>

                      {previewData?.samples && previewData.samples.length > 1 && (
                        <div className="flex items-center gap-1 text-xs text-[#ccccdc] font-sans">
                          <button
                            onClick={() =>
                              setActiveSampleIndex((prev) =>
                                prev > 0 ? prev - 1 : previewData.samples.length - 1
                              )
                            }
                            className="p-1 rounded-sm hover:bg-[#22252b] text-[#8e8e9e] hover:text-[#ccccdc] transition-colors"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-mono font-semibold px-1 text-white">
                            {activeSampleIndex + 1} / {previewData.samples.length}
                          </span>
                          <button
                            onClick={() =>
                              setActiveSampleIndex((prev) =>
                                prev < previewData.samples.length - 1 ? prev + 1 : 0
                              )
                            }
                            className="p-1 rounded-sm hover:bg-[#22252b] text-[#8e8e9e] hover:text-[#ccccdc] transition-colors"
                            aria-label="Next image"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Viewfinder Canvas Surface */}
                  <div className="bg-[#111217] border border-[#2c3235] rounded-sm min-h-[340px] flex items-center justify-center p-3 relative overflow-hidden">
                    {previewLoading ? (
                      <div className="text-center text-[#8e8e9e] space-y-2 font-sans">
                        <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#5794f2] border-t-transparent" />
                        <p className="text-xs">Loading dataset ground-truth sample...</p>
                      </div>
                    ) : hasErrorForActive ? (
                      <div className="text-center text-[#8e8e9e] space-y-1 p-4 max-w-sm font-sans">
                        <AlertCircle className="h-6 w-6 text-[#f59f00] mx-auto" />
                        <p className="font-semibold text-white text-xs">Preview Not Available</p>
                        <p className="text-xs text-[#8e8e9e]">{previewError?.error}</p>
                      </div>
                    ) : !currentSample ? (
                      <div className="text-center text-[#8e8e9e] space-y-1 font-sans">
                        <ImageIcon className="h-6 w-6 text-[#8e8e9e] mx-auto" />
                        <p className="text-xs">No sample images found in dataset archive.</p>
                      </div>
                    ) : (
                      <div className="relative inline-block max-h-full max-w-full border border-[#2c3235] rounded-none shadow-sm">
                        {imageErrorMap[currentSample.image_url] ? (
                          <div className="w-[480px] h-[320px] max-w-full bg-[#141619] flex flex-col items-center justify-center text-center p-4 border border-[#2c3235]">
                            <ImageIcon className="h-8 w-8 text-[#8e8e9e] mb-2 opacity-50" />
                            <span className="text-white font-sans text-xs font-semibold">{currentSample.filename}</span>
                            <span className="text-xs text-[#8e8e9e] font-mono mt-1">
                              {currentSample.width} × {currentSample.height} px Canvas (Image asset offline)
                            </span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={currentSample.image_url}
                            alt={currentSample.filename}
                            onError={() =>
                              setImageErrorMap((prev) => ({
                                ...prev,
                                [currentSample.image_url]: true,
                              }))
                            }
                            className="block max-h-[340px] w-auto object-contain rounded-none"
                          />
                        )}

                        {/* Crisp Grafana Bounding Boxes */}
                        {showBoxes &&
                          Array.isArray(currentSample.boxes) &&
                          currentSample.boxes.map((box, idx) => {
                            const color = GRAFANA_BOX_PALETTE[box.class_id % GRAFANA_BOX_PALETTE.length];
                            const classNameLabel =
                              previewData?.classes?.[box.class_id] || `Class ${box.class_id}`;
                            const imgW = currentSample.width || 640;
                            const imgH = currentSample.height || 640;
                            const leftPct = Math.max(0, Math.min(100, (box.box[0] / imgW) * 100));
                            const topPct = Math.max(0, Math.min(100, (box.box[1] / imgH) * 100));
                            const widthPct = Math.max(
                              0,
                              Math.min(100 - leftPct, ((box.box[2] - box.box[0]) / imgW) * 100)
                            );
                            const heightPct = Math.max(
                              0,
                              Math.min(100 - topPct, ((box.box[3] - box.box[1]) / imgH) * 100)
                            );
                            const labelPosClass = topPct < 8 ? "top-0 left-0" : "-top-4 left-0";

                            return (
                              <div
                                key={idx}
                                className={`absolute border ${color.border} ${color.bg} transition-none pointer-events-none`}
                                style={{
                                  left: `${leftPct}%`,
                                  top: `${topPct}%`,
                                  width: `${widthPct}%`,
                                  height: `${heightPct}%`,
                                }}
                              >
                                <span
                                  className={`absolute ${labelPosClass} border text-[9px] font-sans font-medium ${color.badgeBg} px-1 py-0.2 whitespace-nowrap`}
                                >
                                  {classNameLabel}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {previewData?.samples && previewData.samples.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {previewData.samples.map((item, idx) => (
                        <button
                          key={item.filename}
                          onClick={() => setActiveSampleIndex(idx)}
                          className={`relative h-14 w-18 flex-shrink-0 border transition-colors ${
                            activeSampleIndex === idx
                              ? "border-[#5794f2] ring-1 ring-[#5794f2]"
                              : "border-[#2c3235] opacity-60 hover:opacity-100"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url}
                            alt={item.filename}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0 right-0 bg-[#111217]/90 px-1 text-[9px] font-mono text-[#ccccdc]">
                            {item.boxes?.length || 0} box
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Ground-Truth Annotations & COCO Specification Section */}
                  <div className="border border-[#2c3235] rounded-sm overflow-hidden bg-[#111217]">
                    {/* View Switcher Header */}
                    <div className="bg-[#141619] px-3 py-2 border-b border-[#2c3235] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAnnotationViewTab("table")}
                          className={`px-2 py-1 rounded-sm text-xs font-sans transition-colors ${
                            annotationViewTab === "table"
                              ? "bg-[#22252b] text-white font-semibold border border-[#2c3235]"
                              : "text-[#8e8e9e] hover:text-[#ccccdc]"
                          }`}
                        >
                          Bounding Boxes Table
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnnotationViewTab("coco")}
                          className={`px-2 py-1 rounded-sm text-xs font-sans transition-colors flex items-center gap-1.5 ${
                            annotationViewTab === "coco"
                              ? "bg-[#22252b] text-white font-semibold border border-[#2c3235]"
                              : "text-[#8e8e9e] hover:text-[#ccccdc]"
                          }`}
                        >
                          <FileCode className="h-3.5 w-3.5 text-[#5794f2]" />
                          <span>COCO JSON Annotations</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-sans text-xs text-[#8e8e9e]">
                          {currentSample?.boxes?.length || 0} Targets in Frame
                        </span>
                        {annotationViewTab === "coco" && currentCocoJson && (
                          <button
                            type="button"
                            onClick={handleCopyCocoJson}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-sm border border-[#2c3235] bg-[#181b1f] hover:bg-[#22252b] text-xs font-sans text-[#ccccdc] transition-colors"
                            title="Copy COCO JSON structure to clipboard"
                          >
                            {copiedCoco ? (
                              <>
                                <Check className="h-3 w-3 text-[#73bf69]" />
                                <span className="text-[#73bf69]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-[#8e8e9e]" />
                                <span>Copy JSON</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tab 1: Structured Bounding Boxes Table */}
                    {annotationViewTab === "table" && (
                      <div className="overflow-x-auto max-h-60 overflow-y-auto">
                        {currentSample && currentSample.boxes?.length > 0 ? (
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="bg-[#141619] border-b border-[#2c3235]/60 text-xs font-sans text-[#8e8e9e] sticky top-0">
                                <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc]">#</th>
                                <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc]">Class Label</th>
                                <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc]">COCO BBox [x, y, w, h]</th>
                                <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc]">VOC [x1, y1, x2, y2]</th>
                                <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc] text-right">Area (px²)</th>
                                <th className="py-2 px-2.5 font-sans font-semibold text-xs text-[#ccccdc] text-right">Dimensions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2c3235]/40 font-sans">
                              {currentSample.boxes.map((b, i) => {
                                const color = GRAFANA_BOX_PALETTE[b.class_id % GRAFANA_BOX_PALETTE.length];
                                const label = previewData?.classes?.[b.class_id] || `Class ${b.class_id}`;
                                const x1 = Math.round(b.box[0]);
                                const y1 = Math.round(b.box[1]);
                                const x2 = Math.round(b.box[2]);
                                const y2 = Math.round(b.box[3]);
                                const w = Math.round(x2 - x1);
                                const h = Math.round(y2 - y1);
                                const area = (w * h).toLocaleString();

                                return (
                                  <tr key={i} className="hover:bg-[#181b1f]">
                                    <td className="py-1.5 px-2.5 font-mono text-xs text-[#8e8e9e]">{i + 1}</td>
                                    <td className="py-1.5 px-2.5 font-sans font-medium">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`h-2 w-2 rounded-none shrink-0 ${color.swatchBg}`} />
                                        <span className={color.text}>{label}</span>
                                        <span className="font-mono text-[10px] text-[#8e8e9e]">(ID {b.class_id})</span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2.5">
                                      <code className="font-mono text-xs text-[#5794f2]">
                                        [{x1}, {y1}, {w}, {h}]
                                      </code>
                                    </td>
                                    <td className="py-1.5 px-2.5">
                                      <code className="font-mono text-xs text-[#ccccdc]">
                                        [{x1}, {y1}, {x2}, {y2}]
                                      </code>
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono text-xs text-[#8e8e9e]">
                                      {area}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono text-xs text-[#ccccdc]">
                                      {w}×{h} px
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="p-4 text-center text-[#8e8e9e] font-sans text-xs">
                            No ground-truth annotations detected in this frame.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: COCO JSON Annotations View */}
                    {annotationViewTab === "coco" && (
                      <div className="p-3 bg-[#111217]">
                        {currentCocoJson ? (
                          <pre className="font-mono text-[11px] leading-relaxed text-[#ccccdc] overflow-x-auto max-h-60 overflow-y-auto p-2 bg-[#141619] border border-[#2c3235] rounded-sm select-all">
                            {JSON.stringify(currentCocoJson, null, 2)}
                          </pre>
                        ) : (
                          <div className="p-4 text-center text-[#8e8e9e] font-sans text-xs">
                            No sample available to render COCO annotations.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Class Distribution Table & Dataset Specs (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Summary Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                      <span className="font-sans font-semibold text-xs text-[#8e8e9e] block">Total Annotations</span>
                      <span className="font-sans text-sm font-bold text-[#ccccdc]">
                        <span className="font-mono text-white text-base">{totalAnnotationsInPreview}</span> Targets
                      </span>
                    </div>
                    <div className="bg-[#111217] border border-[#2c3235] p-2.5 rounded-sm">
                      <span className="font-sans font-semibold text-xs text-[#8e8e9e] block">Class Cardinality</span>
                      <span className="font-sans text-sm font-bold text-[#5794f2]">
                        <span className="font-mono text-base">{activeDataset.classes?.length || 0}</span> Classes
                      </span>
                    </div>
                  </div>

                  {/* Class Distribution Table & Bar Chart */}
                  <div className="border border-[#2c3235] rounded-sm overflow-hidden bg-[#111217] space-y-0">
                    <div className="bg-[#141619] px-3 py-2 border-b border-[#2c3235] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-sans font-semibold text-xs text-white">
                        <BarChart3 className="h-3.5 w-3.5 text-[#5794f2]" />
                        <span>Class Distribution &amp; Balance</span>
                      </div>
                      <span className="font-sans text-xs text-[#8e8e9e]">
                        {classDistribution.length} Detected Classes
                      </span>
                    </div>

                    {classDistribution.length === 0 ? (
                      <div className="p-4 text-center text-[#8e8e9e] text-xs font-sans">
                        {activeDataset.classes && activeDataset.classes.length > 0 ? (
                          <div className="space-y-1.5">
                            <p className="font-sans font-semibold text-white">
                              Dataset Manifest Declares {activeDataset.classes.length} Classes:
                            </p>
                            <p className="font-sans text-xs text-[#5794f2]">
                              {activeDataset.classes.join(", ")}
                            </p>
                            <p className="font-sans text-xs text-[#8e8e9e]">
                              (No bounding-box labels detected in sampled preview frames)
                            </p>
                          </div>
                        ) : (
                          "No annotations available to compute class breakdown."
                        )}
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="bg-[#141619] border-b border-[#2c3235] text-xs font-sans text-[#8e8e9e] sticky top-0">
                              <th className="py-2 px-3 font-sans font-semibold text-xs text-[#ccccdc]">Class Name</th>
                              <th className="py-2 px-3 font-sans font-semibold text-xs text-[#ccccdc] text-right">Count</th>
                              <th className="py-2 px-3 font-sans font-semibold text-xs text-[#ccccdc] text-right">Share</th>
                              <th className="py-2 px-3 font-sans font-semibold text-xs text-[#ccccdc] w-24">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2c3235]/60 font-sans">
                            {classDistribution.map((c) => {
                              const color = GRAFANA_BOX_PALETTE[c.classId % GRAFANA_BOX_PALETTE.length];
                              return (
                                <tr key={c.classId} className="hover:bg-[#181b1f]">
                                  <td className="py-1.5 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`h-2 w-2 rounded-none shrink-0 ${color.swatchBg}`} />
                                      <span className="font-sans font-medium text-[#ccccdc]">{c.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono font-bold text-white">{c.count}</td>
                                  <td className="py-1.5 px-3 text-right font-mono text-[#5794f2]">{c.pct}%</td>
                                  <td className="py-1.5 px-3">
                                    <div className="h-1.5 w-full bg-[#22252b] rounded-none overflow-hidden">
                                      <div
                                        className="h-full bg-[#5794f2]"
                                        style={{ width: `${Math.max(4, c.pct)}%` }}
                                      />
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

                  {/* Dataset Storage & Verification Info */}
                  <div className="bg-[#111217] border border-[#2c3235] p-3 rounded-sm space-y-2 text-xs font-sans">
                    <div className="font-sans font-semibold text-xs text-white border-b border-[#2c3235]/60 pb-1">
                      Dataset Filesystem &amp; Format Specification
                    </div>

                    <div className="space-y-1 text-[#ccccdc]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#8e8e9e]">Dataset ID:</span>
                        <code className="font-mono text-xs text-[#8e8e9e]">{activeDataset.id}</code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8e8e9e]">Filepath:</span>
                        <code className="font-mono text-xs truncate max-w-[200px] text-[#ccccdc]">{activeDataset.filepath}</code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8e8e9e]">Format:</span>
                        <span className="font-sans uppercase text-[#5794f2] font-semibold">{activeDataset.format}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8e8e9e]">Task Type:</span>
                        <span className="font-sans capitalize text-[#ccccdc]">{activeDataset.task_type.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8e8e9e]">Total Frames:</span>
                        <span className="font-sans text-[#ccccdc]">
                          <span className="font-mono text-white font-medium">{activeDataset.num_samples}</span> images
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8e8e9e]">Created:</span>
                        <span className="text-[#8e8e9e]">{new Date(activeDataset.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#2c3235]/60 text-xs text-[#8e8e9e] leading-relaxed">
                      Validation datasets with COCO and YOLO annotations are used by EdgeForge Workbench to calculate true mAP@50 and mAP@50:95 accuracy scores during hardware-in-the-loop benchmarks.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Dataset Modal (Grafana Panel Style) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-sm border border-[#2c3235] bg-[#181b1f] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2c3235] pb-2.5">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#5794f2]" />
                <h3 className="font-sans font-semibold text-xs text-white">
                  Upload Dataset Archive
                </h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-[#8e8e9e] hover:text-[#ccccdc] p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-sm bg-[#111217] border border-[#2c3235] p-3 text-xs text-[#8e8e9e] space-y-1 font-sans">
              <div className="text-[#5794f2] font-semibold flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                <span>Dataset Structure Requirement:</span>
              </div>
              <p>
                Provide a ZIP archive containing an <code className="font-mono text-[#ccccdc]">images/</code> directory and a corresponding <code className="font-mono text-[#ccccdc]">labels/</code> directory (for YOLO format) or annotations JSON (for COCO).
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs font-sans">
              <div>
                <label className="font-sans font-semibold text-xs text-[#8e8e9e] block mb-1">
                  Dataset Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. drone-surveillance-val"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full rounded-sm border border-[#2c3235] bg-[#111217] p-2 text-[#ccccdc] focus:border-[#5794f2] focus:outline-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-sans font-semibold text-xs text-[#8e8e9e] block mb-1">
                    Task Type
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full rounded-sm border border-[#2c3235] bg-[#111217] p-2 text-[#ccccdc] focus:border-[#5794f2] focus:outline-none font-sans"
                  >
                    <option value="object_detection">Object Detection</option>
                    <option value="classification">Classification</option>
                    <option value="segmentation">Segmentation</option>
                  </select>
                </div>
                <div>
                  <label className="font-sans font-semibold text-xs text-[#8e8e9e] block mb-1">
                    Annotation Format
                  </label>
                  <select
                    value={formatType}
                    onChange={(e) => setFormatType(e.target.value)}
                    className="w-full rounded-sm border border-[#2c3235] bg-[#111217] p-2 text-[#ccccdc] focus:border-[#5794f2] focus:outline-none font-sans"
                  >
                    <option value="yolo">YOLO (images/ &amp; labels/)</option>
                    <option value="coco">COCO JSON</option>
                    <option value="voc">Pascal VOC XML</option>
                    <option value="imagenet">ImageNet Directory</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-sans font-semibold text-xs text-[#8e8e9e] block mb-1">
                  ZIP Archive File
                </label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-[#ccccdc] file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border file:border-[#2c3235] file:text-xs file:font-sans file:bg-[#22252b] file:text-[#ccccdc] hover:file:bg-[#2c3235] cursor-pointer"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2c3235]">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-sm border border-[#2c3235] bg-[#22252b] px-3 py-1.5 text-xs font-sans font-medium text-[#ccccdc] hover:bg-[#2c3235] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="rounded-sm bg-[#5794f2] hover:bg-[#3274d9] px-4 py-1.5 text-xs font-sans font-semibold text-[#111217] disabled:opacity-50 transition-colors"
                >
                  {isUploading ? "Uploading..." : "Upload & Parse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
