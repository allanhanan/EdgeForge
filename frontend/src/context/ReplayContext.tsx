"use client";

import React from "react";
import { ReplayToolbar } from "@/components/replay/ReplayToolbar";

export {
  ReplayProvider,
  useReplay,
  STAGE_DURATION_SECONDS,
  type ReplayProviderProps,
} from "../lib/replay/ReplayContext";

export {
  type ReplayContextType,
  type OnnxGraphNode,
  type LineageNode as ReplayLineageNode,
  type ReplayStage,
  type ReplaySnapshot,
  type ReplaySpeed,
} from "../lib/replay/types";

export {
  REPLAY_ONNX_NODES,
  REPLAY_RUNS,
  REPLAY_MODELS,
  REPLAY_HARDWARE,
  REPLAY_DATASETS,
  REPLAY_EXPERIMENTS,
  REPLAY_META_STATUS,
} from "../lib/replay/commonData";

/**
 * ReplayPlayerBar component for backwards compatibility.
 * Delegates to the unified Grafana-themed ReplayToolbar.
 */
export const ReplayPlayerBar: React.FC = () => {
  return <ReplayToolbar />;
};
