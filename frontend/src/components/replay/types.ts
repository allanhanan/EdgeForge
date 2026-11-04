import {
  ReplayScenarioId,
  ReplayStageSnapshot,
  ReplayStage,
  ReplayScenario,
} from "../../lib/replayData";

export type PlaybackSpeed = 1 | 2 | 4;

export {
  type ReplayScenarioId,
  type ReplayStageSnapshot,
  type ReplayStage,
  type ReplayScenario,
};

export interface ReplayState {
  isActive: boolean;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentScenario: ReplayScenario | null;
  currentStageIndex: number;
  elapsedSeconds: number;
  totalDurationSeconds: number;
  isMinimized: boolean;
}

export interface ReplayDatasetState {
  models: unknown[];
  hardware: unknown[];
  datasets: unknown[];
  experiments: unknown[];
  runs: unknown[];
  metaStatus: unknown;
}
