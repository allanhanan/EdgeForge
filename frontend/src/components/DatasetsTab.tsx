"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Upload,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Tag,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  FolderOpen,
  Calendar,
  X,
} from "lucide-react";
import {
  DatasetRecord,
  fetchDatasets,
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

export const DatasetsTab: React.FC<DatasetsTabProps> = ({
  datasets,
  onRefresh,
  onSelectForBenchmark,
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    datasets[0]?.id || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
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

  // Sync selectedDatasetId if datasets change
  useEffect(() => {
    if (!selectedDatasetId && datasets.length > 0) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

  // Load preview data when selectedDatasetId changes
  useEffect(() => {
    if (!selectedDatasetId) {
      setPreviewData(null);
      return;
    }
    let isMounted = true;
    setPreviewLoading(true);
    fetchDatasetPreview(selectedDatasetId)
      .then((data) => {
        if (isMounted) {
          setPreviewData(data);
          setActiveSampleIndex(0);
        }
      })
      .catch((err) => {
        console.error("Failed to load dataset preview:", err);
      })
      .finally(() => {
        if (isMounted) setPreviewLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDatasetId]);

  const handleSeed = async () => {
    setIsSeeding(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const seeded = await seedSampleDataset();
      setSuccessMsg(`Sample dataset "${seeded.name}" seeded successfully.`);
      onRefresh();
      setSelectedDatasetId(seeded.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to seed sample dataset");
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
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload dataset");
    } finally {
      setIsUploading(false);
    }
  };

  const currentDataset = datasets.find((d) => d.id === selectedDatasetId);
  const currentSample = previewData?.samples?.[activeSampleIndex];

  // Neon palette for computer vision annotations
  const boxColors = [
    { border: "border-teal-400", bg: "bg-teal-500/15", text: "text-teal-300", badge: "bg-teal-400 text-zinc-950" },
    { border: "border-cyan-400", bg: "bg-cyan-500/15", text: "text-cyan-300", badge: "bg-cyan-400 text-zinc-950" },
    { border: "border-emerald-400", bg: "bg-emerald-500/15", text: "text-emerald-300", badge: "bg-emerald-400 text-zinc-950" },
    { border: "border-amber-400", bg: "bg-amber-500/15", text: "text-amber-300", badge: "bg-amber-400 text-zinc-950" },
    { border: "border-purple-400", bg: "bg-purple-500/15", text: "text-purple-300", badge: "bg-purple-400 text-zinc-950" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 font-sans">
            <Database className="h-5 w-5 text-teal-400" />
            Validation Datasets & Ground Truth
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Manage test sets, inspect annotations, and evaluate true detection accuracy (mAP@50).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3.5 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isSeeding ? "Seeding..." : "Seed Sample Dataset"}
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 transition-all"
          >
            <Upload className="h-3.5 w-3.5 fill-zinc-950" />
            Upload Dataset (ZIP)
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 font-mono flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-zinc-200">
            &times;
          </button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-300 font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} className="text-zinc-400 hover:text-zinc-200">
            &times;
          </button>
        </div>
      )}

      {/* Main Grid: Datasets list & Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dataset List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Registered Datasets ({datasets.length})</span>
          </div>

          {datasets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-400 space-y-3 bg-zinc-950/40">
              <Database className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">No datasets registered</p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Seed the pre-packaged 12-frame edge computer vision validation set or upload your custom YOLO format ZIP.
              </p>
              <button
                onClick={handleSeed}
                className="rounded-xl bg-teal-500/10 border border-teal-500/30 px-3.5 py-2 text-xs font-mono text-teal-300 hover:bg-teal-500/20 font-semibold"
              >
                Seed Edge Val Dataset
              </button>
            </div>
          ) : (
            datasets.map((dataset) => {
              const isSelected = selectedDatasetId === dataset.id;
              return (
                <div
                  key={dataset.id}
                  onClick={() => setSelectedDatasetId(dataset.id)}
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
                          {dataset.name}
                        </span>
                        <span className="rounded-md bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] font-mono text-teal-300 uppercase font-semibold">
                          {dataset.format}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono flex items-center gap-2">
                        <span className="text-zinc-200 font-semibold">{dataset.num_samples} frames</span>
                        <span>•</span>
                        <span className="text-teal-400/90">{dataset.task_type.replace("_", " ")}</span>
                      </div>
                    </div>

                    {onSelectForBenchmark && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectForBenchmark(dataset.id);
                        }}
                        className="rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all"
                      >
                        Use in Test
                      </button>
                    )}
                  </div>

                  {/* Classes tags */}
                  {dataset.classes && dataset.classes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/60">
                      {dataset.classes.map((c, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-mono text-zinc-300"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 text-[10px] text-zinc-400 font-mono truncate">
                    Path: {dataset.filepath}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Interactive Annotations Preview Canvas (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-zinc-200">
                Ground-Truth Annotation Overlay
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showBoxes}
                  onChange={(e) => setShowBoxes(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-teal-500 focus:ring-0"
                />
                Show Bounding Boxes
              </label>

              {previewData?.samples && previewData.samples.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
                  <button
                    onClick={() =>
                      setActiveSampleIndex((prev) =>
                        prev > 0 ? prev - 1 : previewData.samples.length - 1
                      )
                    }
                    className="p-1 rounded-md hover:bg-zinc-800 text-zinc-300 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-semibold text-zinc-200">
                    {activeSampleIndex + 1} / {previewData.samples.length}
                  </span>
                  <button
                    onClick={() =>
                      setActiveSampleIndex((prev) =>
                        prev < previewData.samples.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="p-1 rounded-md hover:bg-zinc-800 text-zinc-300 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {!selectedDatasetId ? (
            <div className="py-24 text-center text-zinc-400 space-y-2">
              <Info className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-xs font-mono">Select a dataset to view annotation overlays</p>
            </div>
          ) : previewLoading ? (
            <div className="py-24 text-center text-zinc-400 space-y-2">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
              <p className="text-xs font-mono">Loading validation sample & labels...</p>
            </div>
          ) : !currentSample ? (
            <div className="py-24 text-center text-zinc-400 space-y-2">
              <ImageIcon className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-xs font-mono">No preview images found in this dataset directory</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Computer Vision HUD Viewfinder */}
              <div className="relative overflow-hidden rounded-xl border border-zinc-800/90 bg-[#0d0e12] aspect-[4/3] flex items-center justify-center p-2 shadow-2xl">
                {/* HUD Viewfinder Grid Corner Accents */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-teal-500/60 pointer-events-none" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-teal-500/60 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-teal-500/60 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-teal-500/60 pointer-events-none" />
                <div className="absolute top-3 left-10 text-[9px] font-mono text-teal-400/70 pointer-events-none uppercase tracking-widest">
                  HUD CV_FEED // REC
                </div>

                {/* Image Canvas Container */}
                <div className="relative inline-block max-h-full max-w-full rounded border border-zinc-800/60 overflow-visible shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentSample.image_url}
                    alt={currentSample.filename}
                    className="block max-h-[380px] w-auto object-contain rounded"
                    style={{ filter: "contrast(1.05) brightness(0.95)" }}
                  />

                  {/* Bounding Box Overlays */}
                  {showBoxes &&
                    currentSample.boxes.map((box, idx) => {
                      const styleConfig = boxColors[box.class_id % boxColors.length];
                      const classNameLabel =
                        previewData?.classes?.[box.class_id] || `Class ${box.class_id}`;
                      const leftPct = (box.box[0] / currentSample.width) * 100;
                      const topPct = (box.box[1] / currentSample.height) * 100;
                      const widthPct =
                        ((box.box[2] - box.box[0]) / currentSample.width) * 100;
                      const heightPct =
                        ((box.box[3] - box.box[1]) / currentSample.height) * 100;

                      return (
                        <div
                          key={idx}
                          className={`absolute border-2 ${styleConfig.border} ${styleConfig.bg} transition-all pointer-events-none shadow-sm`}
                          style={{
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${widthPct}%`,
                            height: `${heightPct}%`,
                          }}
                        >
                          <span
                            className={`absolute -top-5 left-0 rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${styleConfig.badge} whitespace-nowrap shadow-md`}
                          >
                            {classNameLabel}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Sample Metadata & Box List */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-200 font-semibold">{currentSample.filename}</span>
                  <span className="text-zinc-400">
                    Resolution: {currentSample.width}x{currentSample.height}px •{" "}
                    <span className="text-teal-400 font-semibold">{currentSample.boxes.length} targets</span>
                  </span>
                </div>

                {currentSample.boxes.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/80">
                    {currentSample.boxes.map((b, i) => {
                      const color = boxColors[b.class_id % boxColors.length];
                      const classNameLabel =
                        previewData?.classes?.[b.class_id] || `Class ${b.class_id}`;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-[11px]"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${color.border.replace("border-", "bg-")}`}
                          />
                          <span className="text-zinc-200 font-semibold">{classNameLabel}</span>
                          <span className="text-zinc-500 text-[10px]">
                            [{b.box[0].toFixed(0)}, {b.box[1].toFixed(0)}, {b.box[2].toFixed(0)}, {b.box[3].toFixed(0)}]
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {previewData?.samples && previewData.samples.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                  {previewData.samples.map((item, idx) => (
                    <button
                      key={item.filename}
                      onClick={() => setActiveSampleIndex(idx)}
                      className={`relative h-16 w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                        activeSampleIndex === idx
                          ? "border-teal-400 ring-2 ring-teal-400/30 scale-102"
                          : "border-zinc-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image_url}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 bg-black/90 px-1 text-[9px] font-mono text-zinc-300 font-semibold">
                        {item.boxes.length} bbox
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Upload className="h-4 w-4 text-teal-400" />
                Upload Dataset Archive
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-zinc-400 block mb-1 font-sans font-medium">Dataset Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. drone-surveillance-val"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-200 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1 font-sans font-medium">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                  >
                    <option value="object_detection">Object Detection</option>
                    <option value="classification">Classification</option>
                    <option value="segmentation">Segmentation</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-sans font-medium">Annotation Format</label>
                  <select
                    value={formatType}
                    onChange={(e) => setFormatType(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:border-teal-500 focus:outline-none"
                  >
                    <option value="yolo">YOLO (images/ & labels/)</option>
                    <option value="coco">COCO JSON</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-sans font-medium">ZIP File Archive</label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                  required
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Expected structure: ZIP containing `images/` directory and optional `labels/` txt files.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all"
                >
                  {isUploading ? "Uploading & Extracting..." : "Upload & Parse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
