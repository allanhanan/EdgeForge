import {
  ModelRecord,
  HardwareDevice,
  DatasetRecord,
  Experiment,
  BenchmarkRun,
  MetaStatus,
  Recommendation,
  AgentTrace,
  CompatibilityReport,
} from "@/lib/api";
import { TabType, WorkflowGoal } from "@/components/Navigation";
import type { DeploymentPackageItem, VerificationResult } from "@/components/DeploymentsTab";
import type { ReportItem } from "@/components/ReportsTab";
import type {
  ReplayWorkbenchData,
  ReplayDeploymentsData,
  ReplayCompareData,
} from "../../lib/replayData";

export type ReplaySpeed = 1 | 2 | 4;

export type ReplayActionType =
  | "navigate"
  | "select_model"
  | "select_hardware"
  | "configure_benchmark"
  | "start_benchmark"
  | "stream_telemetry"
  | "complete_benchmark"
  | "compare_precisions"
  | "agent_prompt"
  | "agent_thought"
  | "agent_tool_call"
  | "agent_tool_result"
  | "agent_lineage_update"
  | "agent_recommendation"
  | "export_bundle"
  | "verify_bundle"
  | "view_report"
  | "state_patch";

export interface OnnxGraphNode {
  id: string;
  name: string;
  opType: string;
  inputs: string[];
  outputs: string[];
  attributes: Record<string, string | number | number[]>;
  category: "conv" | "norm" | "activation" | "pooling" | "fusion" | "output";
}

export interface LineageNode {
  id: string;
  stepNumber: number;
  label: string;
  type: "source" | "baseline" | "success" | "regression" | "suggested";
  statusText: string;
  latencyMs?: number;
  fps?: number;
  mapPercent?: number;
  mapDropPoints?: number;
  whyAttempted: string;
  whatHappened: string;
  agentLearned: string;
  suggestedAction: string;
}

export interface DeploymentPhase {
  phase: string;
  milestone: string;
  targetHardware: string;
  runtimePrecision: string;
  recommendations: string;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING";
}

/**
 * Tab-specific snapshot states allowing precise overrides per tab during playback
 */
export interface ModelsTabSnapshot {
  selectedModelId?: string | null;
  compatibilityMatrix?: Record<string, unknown>;
  compatibilityReport?: CompatibilityReport | null;
  graphModalOpen?: boolean;
  searchFilter?: string;
  selectedOperatorFamily?: string;
}

export interface HardwareTabSnapshot {
  selectedHardwareId?: string | null;
  filterVendor?: string;
  filterDeviceType?: string;
  searchQuery?: string;
  activeTelemetryDevice?: string | null;
}

export interface WorkbenchTabSnapshot {
  selectedModelId?: string | null;
  selectedHardwareId?: string | null;
  selectedDatasetId?: string | null;
  selectedRuntime?: string;
  selectedPrecision?: string;
  batchSize?: number;
  iterations?: number;
  warmupIterations?: number;
  isBenchmarking?: boolean;
  benchmarkProgress?: number;
  activeExperiment?: Experiment | null;
  streamLogs?: string[];
  liveTelemetry?: {
    latencyMs?: number;
    fps?: number;
    memoryMb?: number;
    powerWatts?: number;
    tempC?: number;
    gpuMemMb?: number;
  };
  latestRunResult?: BenchmarkRun | null;
}

export interface ExperimentsTabSnapshot {
  selectedExperimentId?: string | null;
  statusFilter?: string;
  hardwareFilter?: string;
}

export interface CompareTabSnapshot {
  selectedRunIds?: string[];
  scatterMetricX?: string;
  scatterMetricY?: string;
  comparisonObjective?: string;
  highlightWinnerId?: string | null;
  activeGoal?: WorkflowGoal;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

export interface AIEngineerTabSnapshot {
  sessionTitle?: string;
  sessionId?: string;
  chatMessages?: ChatMessage[];
  traces?: AgentTrace[];
  agentStatus?: "idle" | "thinking" | "executing_tool" | "completed" | "error";
  activeToolName?: string | null;
  activeToolArgs?: Record<string, unknown> | null;
  lineageNodes?: LineageNode[];
  recommendation?: Recommendation | null;
  deploymentPhases?: DeploymentPhase[];
}

export interface DeploymentsTabSnapshot {
  packages?: DeploymentPackageItem[];
  selectedPackageId?: string;
  selectedBundleId?: string;
  manifestJson?: Record<string, unknown>;
  inferScript?: string;
  verificationResult?: VerificationResult | null;
  isVerifying?: boolean;
}

export interface ReportsTabSnapshot {
  reports?: ReportItem[];
  selectedReportId?: string;
  activeMarkdownContent?: string;
}

/**
 * Universal state snapshot representing the entire application state at a given stage or step.
 */
export interface ReplaySnapshot {
  activeTab: TabType;
  activeGoal?: WorkflowGoal;
  isOnline: boolean;
  metaStatus: MetaStatus;

  // Global entity collections
  models: ModelRecord[];
  hardware: HardwareDevice[];
  datasets: DatasetRecord[];
  experiments: Experiment[];
  runs: BenchmarkRun[];

  // Global pointers
  selectedModelId?: string | null;
  selectedHardwareId?: string | null;
  selectedDatasetId?: string | null;
  selectedRunId?: string | null;
  selectedExperimentId?: string | null;

  // Granular tab overrides
  modelsTab?: ModelsTabSnapshot;
  hardwareTab?: HardwareTabSnapshot;
  workbenchTab?: WorkbenchTabSnapshot;
  experimentsTab?: ExperimentsTabSnapshot;
  compareTab?: CompareTabSnapshot;
  agentTab?: AIEngineerTabSnapshot;
  deploymentsTab?: DeploymentsTabSnapshot;
  reportsTab?: ReportsTabSnapshot;
  workbench?: ReplayWorkbenchData;
  deployments?: ReplayDeploymentsData;
  compare?: ReplayCompareData;
}

/**
 * Fine-grained step inside an execution stage.
 */
export interface ReplayStep {
  id: string;
  stepNumber: number;
  offsetSeconds: number; // Offset in seconds from stage start
  label: string;
  description: string;
  actionType: ReplayActionType;
  targetTab?: TabType;
  actionCallout?: string;
  patch?: Partial<ReplaySnapshot>;
  logMessage?: string;
}

/**
 * Major execution stage representing a scenario chapter.
 */
export interface ReplayStage {
  id: string;
  stageNumber: number;
  title: string;
  subtitle: string;
  badge?: string;
  summary?: string;
  targetTab: TabType;
  activeTab?: TabType;
  durationSeconds: number;
  startTimeSeconds: number;
  description: string;
  keyTakeaway: string;
  actionCallout: string;
  snapshot: ReplaySnapshot;
  data?: ReplaySnapshot; // backwards compatibility alias for snapshot
  selectedModelId?: string | null;
  selectedRunId?: string | null;
  steps: ReplayStep[];
}

export interface ScenarioFinalSummary {
  headline: string;
  achievements: string[];
  metricsAchieved: {
    latency: string;
    fps: string;
    compression: string;
    power: string;
    accuracy: string;
  };
  suggestedNextScenarios: string[];
}

/**
 * Complete recorded replay scenario definition.
 */
export interface ReplayScenario {
  id: string;
  title: string;
  shortDescription: string;
  category:
    | "featured"
    | "inspection"
    | "benchmarking"
    | "optimization"
    | "comparison"
    | "agent"
    | "deployment";
  badgeText: string;
  iconName: string;
  durationSeconds: number;
  initialState: ReplaySnapshot;
  stages: ReplayStage[];
  finalSummary: ScenarioFinalSummary;
  tags: string[];
}

/**
 * Event published during playback to notify subscribers/listeners.
 */
export interface ReplayEvent {
  type: "stage_change" | "step_change" | "play" | "pause" | "speed_change" | "seek" | "complete" | "reset";
  scenarioId: string;
  stageIndex: number;
  stepIndex: number;
  elapsedSeconds: number;
  snapshot: ReplaySnapshot;
}

/**
 * Complete runtime state of the Replay Engine.
 */
export interface ReplayState {
  isReplayMode: boolean;
  isActive: boolean;
  isReplayActive: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isInspecting: boolean;
  isMinimized: boolean;
  speed: ReplaySpeed;
  playbackSpeed: number;
  activeTab: TabType;
  currentScenario: ReplayScenario | null;
  currentStageIndex: number;
  currentStage: (ReplayStage & { data: ReplaySnapshot }) | null;
  currentStepIndex: number;
  currentStep: ReplayStep | null;
  elapsedTimeSeconds: number;
  elapsedSeconds: number;
  totalDurationSeconds: number;
  progressPercent: number; // 0.0 to 100.0
  totalProgressPct: number;
  stageProgress: number;
  stageStartTimes: number[];
  activeSnapshot: ReplaySnapshot | null;
  currentSnapshot: ReplaySnapshot | null;
  isModalOpen: boolean;
  showExitConfirm: boolean;
}

/**
 * Replay Context interface exposed to components and hooks.
 */
export interface ReplayContextType extends ReplayState {
  // Core Engine Controls
  startReplay: (scenarioId?: string) => void;
  startScenario: (scenarioId: string, autoPlay?: boolean) => void;
  stopReplay: () => void;
  exitReplay: () => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  togglePlayPause: () => void;
  restart: () => void;
  reset: () => void;
  setSpeed: (speed: ReplaySpeed | number) => void;
  setPlaybackSpeed: (speed: number) => void;
  seekToTime: (seconds: number) => void;
  scrubToSeconds: (seconds: number) => void;
  seekToStage: (stageIndex: number) => void;
  jumpToStep: (stageIndex: number) => void;
  goToStage: (stageIndex: number) => void;
  nextStep: () => void;
  nextStage: () => void;
  stepForward: () => void;
  prevStep: () => void;
  prevStage: () => void;
  stepBackward: () => void;
  selectScenario: (scenarioId: string) => void;
  setMinimized: (minimized: boolean) => void;
  toggleMinimize: () => void;
  setIsInspecting: (inspecting: boolean) => void;
  setReplayActiveTab: (tab: TabType) => void;
  openScenarioModal: () => void;
  closeScenarioModal: () => void;
  setShowExitConfirm: (show: boolean) => void;
  availableScenarios: ReplayScenario[];
  allScenarios: ReplayScenario[];

  // Backwards compatibility helpers
  activeScenario?: string | null;
  setActiveScenario?: (scenario: string | null) => void;
  setIsReplayMode?: (active: boolean | ((prev: boolean) => boolean)) => void;
  toggleReplayMode?: () => void;
  setUserNavOverride?: (val: boolean) => void;
  currentStepNumber?: number;
  setCurrentStep?: (step: number | ((prev: number) => number)) => void;
}
