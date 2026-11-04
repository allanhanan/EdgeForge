"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  ReplayContextType,
  ReplayScenario,
  ReplayStage,
  ReplaySpeed,
  ReplaySnapshot,
} from "./types";
import {
  REPLAY_SCENARIOS,
  DEFAULT_SCENARIO,
  getScenarioById,
} from "./scenarios";
import {
  registerReplaySnapshotGetter,
  setManualReplayActive,
} from "./interceptor";
import { setReplayInterceptor } from "@/lib/api";
import { TabType } from "@/components/Navigation";

export const STAGE_DURATION_SECONDS = 14;

const ReplayContext = createContext<ReplayContextType | null>(null);

export interface ReplayProviderProps {
  children: React.ReactNode;
  initialScenarioId?: string;
  onStageChange?: (stage: ReplayStage) => void;
  onExitReplay?: () => void;
}

export const ReplayProvider: React.FC<ReplayProviderProps> = ({
  children,
  initialScenarioId,
  onStageChange,
  onExitReplay,
}) => {
  const [isReplayMode, setIsReplayModeState] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [speed, setSpeedState] = useState<ReplaySpeed>(1);
  const [activeTab, setActiveTabState] = useState<TabType>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const [currentScenario, setCurrentScenario] = useState<ReplayScenario>(() => {
    if (initialScenarioId) {
      const found = getScenarioById(initialScenarioId);
      if (found) return found;
    }
    return DEFAULT_SCENARIO;
  });

  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [elapsedTimeSeconds, setElapsedTimeSeconds] = useState<number>(0);
  const [activeSnapshot, setActiveSnapshot] = useState<ReplaySnapshot | null>(() => {
    const sc = initialScenarioId ? getScenarioById(initialScenarioId) || DEFAULT_SCENARIO : DEFAULT_SCENARIO;
    return sc.stages[0]?.snapshot || sc.initialState || null;
  });

  const totalDurationSeconds = currentScenario?.durationSeconds || 130;
  const currentStageRaw = currentScenario?.stages[currentStageIndex] || currentScenario?.stages[0] || null;
  const currentStep = currentStageRaw?.steps[currentStepIndex] || null;

  const currentStage = useMemo(() => {
    if (!currentStageRaw) return null;
    const snap = activeSnapshot || currentStageRaw.snapshot;
    return {
      ...currentStageRaw,
      snapshot: snap,
      data: snap,
      selectedModelId: snap.selectedModelId || currentStageRaw.selectedModelId,
      selectedRunId: snap.selectedRunId || currentStageRaw.selectedRunId,
    };
  }, [currentStageRaw, activeSnapshot]);

  const stageStartTimes = useMemo(() => {
    if (!currentScenario?.stages) return [];
    return currentScenario.stages.map((s) => s.startTimeSeconds);
  }, [currentScenario]);

  const progressPercent = useMemo(() => {
    if (!totalDurationSeconds || totalDurationSeconds <= 0) return 0;
    const pct = (elapsedTimeSeconds / totalDurationSeconds) * 100;
    return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
  }, [elapsedTimeSeconds, totalDurationSeconds]);

  // Compute accumulated snapshot for a given scenario, stage, and step
  const resolveSnapshot = useCallback(
    (scenario: ReplayScenario, stageIdx: number, stepIdx: number): ReplaySnapshot => {
      const stage = scenario.stages[stageIdx] || scenario.stages[0];
      let snap: ReplaySnapshot = { ...stage.snapshot };

      if (stage.steps && stage.steps.length > 0) {
        for (let i = 0; i <= stepIdx && i < stage.steps.length; i++) {
          const step = stage.steps[i];
          if (step.patch) {
            snap = {
              ...snap,
              ...step.patch,
              modelsTab: { ...snap.modelsTab, ...step.patch.modelsTab },
              hardwareTab: { ...snap.hardwareTab, ...step.patch.hardwareTab },
              workbenchTab: { ...snap.workbenchTab, ...step.patch.workbenchTab },
              compareTab: { ...snap.compareTab, ...step.patch.compareTab },
              agentTab: { ...snap.agentTab, ...step.patch.agentTab },
              deploymentsTab: { ...snap.deploymentsTab, ...step.patch.deploymentsTab },
              reportsTab: { ...snap.reportsTab, ...step.patch.reportsTab },
            };
          }
        }
      }

      return snap;
    },
    []
  );

  // Ref to hold live state for timer interval and external api interception
  const stateRef = useRef({
    isReplayMode,
    isPlaying,
    isPaused,
    isCompleted,
    isInspecting,
    speed,
    currentScenario,
    currentStageIndex,
    currentStepIndex,
    elapsedTimeSeconds,
    totalDurationSeconds,
    activeSnapshot,
    activeTab,
    onStageChange,
  });

  useEffect(() => {
    stateRef.current = {
      isReplayMode,
      isPlaying,
      isPaused,
      isCompleted,
      isInspecting,
      speed,
      currentScenario,
      currentStageIndex,
      currentStepIndex,
      elapsedTimeSeconds,
      totalDurationSeconds,
      activeSnapshot,
      activeTab,
      onStageChange,
    };
  });

  // Sync API interceptor with live React replay mode and active snapshot
  useEffect(() => {
    registerReplaySnapshotGetter(() => {
      if (!stateRef.current.isReplayMode) return null;
      return stateRef.current.activeSnapshot;
    });
    setManualReplayActive(isReplayMode);
    setReplayInterceptor(isReplayMode, activeSnapshot);

    return () => {
      registerReplaySnapshotGetter(null);
      setManualReplayActive(false);
      setReplayInterceptor(false, null);
    };
  }, [isReplayMode, activeSnapshot]);

  // Set active tab with state update
  const setReplayActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
  }, []);

  // Playback Timer Loop: advances deterministic time ticks smoothly
  useEffect(() => {
    if (!isReplayMode || !isPlaying || isPaused || isInspecting) {
      return;
    }

    const TICK_MS = 200; // 5 ticks per second for smooth timeline scrubbing & updates
    const timer = setInterval(() => {
      const curr = stateRef.current;
      if (!curr.isPlaying || curr.isPaused || curr.isInspecting) return;

      const dt = (TICK_MS / 1000) * curr.speed;
      const nextTime = curr.elapsedTimeSeconds + dt;

      if (nextTime >= curr.totalDurationSeconds) {
        // Complete replay
        setElapsedTimeSeconds(curr.totalDurationSeconds);
        setIsPlaying(false);
        setIsPaused(false);
        setIsCompleted(true);
        const lastStageIdx = curr.currentScenario.stages.length - 1;
        setCurrentStageIndex(lastStageIdx);
        const lastStage = curr.currentScenario.stages[lastStageIdx];
        const lastStepIdx = (lastStage.steps?.length || 1) - 1;
        setCurrentStepIndex(lastStepIdx);
        const finalSnap = resolveSnapshot(curr.currentScenario, lastStageIdx, lastStepIdx);
        setActiveSnapshot(finalSnap);
        if (lastStage?.targetTab) {
          setActiveTabState(lastStage.targetTab);
        }
        return;
      }

      setElapsedTimeSeconds(nextTime);

      // Determine which stage corresponds to nextTime
      const stages = curr.currentScenario.stages;
      let targetStageIdx = 0;
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (nextTime >= s.startTimeSeconds && nextTime < s.startTimeSeconds + s.durationSeconds) {
          targetStageIdx = i;
          break;
        }
        if (i === stages.length - 1 && nextTime >= s.startTimeSeconds) {
          targetStageIdx = i;
        }
      }

      const stage = stages[targetStageIdx];
      const stageOffset = Math.max(0, nextTime - stage.startTimeSeconds);

      // Determine step inside stage
      let targetStepIdx = 0;
      if (stage.steps && stage.steps.length > 0) {
        for (let j = 0; j < stage.steps.length; j++) {
          if (stageOffset >= stage.steps[j].offsetSeconds) {
            targetStepIdx = j;
          }
        }
      }

      // Check if stage changed
      if (targetStageIdx !== curr.currentStageIndex) {
        setCurrentStageIndex(targetStageIdx);
        if (stage?.targetTab) {
          setActiveTabState(stage.targetTab);
        }
        if (curr.onStageChange) {
          curr.onStageChange(stage);
        }
      }

      if (targetStepIdx !== curr.currentStepIndex) {
        setCurrentStepIndex(targetStepIdx);
      }

      // Publish active snapshot
      const newSnap = resolveSnapshot(curr.currentScenario, targetStageIdx, targetStepIdx);
      setActiveSnapshot(newSnap);
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [isReplayMode, isPlaying, isPaused, isInspecting, resolveSnapshot]);

  // Actions
  const startReplay = useCallback(
    (scenarioId?: string) => {
      const scenario = scenarioId
        ? getScenarioById(scenarioId) || DEFAULT_SCENARIO
        : DEFAULT_SCENARIO;

      setCurrentScenario(scenario);
      setCurrentStageIndex(0);
      setCurrentStepIndex(0);
      setElapsedTimeSeconds(0);
      setIsCompleted(false);
      setIsPaused(false);
      setIsInspecting(false);
      setIsReplayModeState(true);
      setIsPlaying(true);
      setIsModalOpen(false);

      const initialSnap = resolveSnapshot(scenario, 0, 0);
      setActiveSnapshot(initialSnap);

      // Synchronously update stateRef to prevent interval tick race conditions during rapid switching
      stateRef.current = {
        ...stateRef.current,
        isReplayMode: true,
        isPlaying: true,
        isPaused: false,
        isCompleted: false,
        isInspecting: false,
        currentScenario: scenario,
        totalDurationSeconds: scenario.durationSeconds,
        currentStageIndex: 0,
        currentStepIndex: 0,
        elapsedTimeSeconds: 0,
        activeSnapshot: initialSnap,
      };

      const firstStage = scenario.stages[0];
      if (firstStage?.targetTab) {
        setActiveTabState(firstStage.targetTab);
      }
      if (onStageChange && firstStage) {
        onStageChange(firstStage);
      }
    },
    [resolveSnapshot, onStageChange]
  );

  const stopReplay = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setIsReplayModeState(false);
    setIsInspecting(false);
    setShowExitConfirm(false);
    if (onExitReplay) {
      onExitReplay();
    }
  }, [onExitReplay]);

  const play = useCallback(() => {
    if (isCompleted) {
      // Re-start from beginning if already finished
      setElapsedTimeSeconds(0);
      setCurrentStageIndex(0);
      setCurrentStepIndex(0);
      setIsCompleted(false);
    }
    setIsPaused(false);
    setIsInspecting(false);
    setIsPlaying(true);
  }, [isCompleted]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(true);
    setIsInspecting(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    setIsInspecting(false);
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const restart = useCallback(() => {
    setElapsedTimeSeconds(0);
    setCurrentStageIndex(0);
    setCurrentStepIndex(0);
    setIsCompleted(false);
    setIsPaused(false);
    setIsInspecting(false);
    setIsPlaying(true);

    const initialSnap = resolveSnapshot(currentScenario, 0, 0);
    setActiveSnapshot(initialSnap);

    const firstStage = currentScenario.stages[0];
    if (firstStage?.targetTab) {
      setActiveTabState(firstStage.targetTab);
    }
    if (onStageChange && firstStage) {
      onStageChange(firstStage);
    }
  }, [currentScenario, resolveSnapshot, onStageChange]);

  const setSpeed = useCallback((newSpeed: ReplaySpeed | number) => {
    if (newSpeed === 1 || newSpeed === 2 || newSpeed === 4) {
      setSpeedState(newSpeed as ReplaySpeed);
    } else if (newSpeed > 2) {
      setSpeedState(4);
    } else if (newSpeed > 1) {
      setSpeedState(2);
    } else {
      setSpeedState(1);
    }
  }, []);

  const seekToTime = useCallback(
    (seconds: number) => {
      const clampedSeconds = Math.max(0, Math.min(seconds, totalDurationSeconds));
      setElapsedTimeSeconds(clampedSeconds);
      setIsCompleted(clampedSeconds >= totalDurationSeconds);

      const stages = currentScenario.stages;
      let targetStageIdx = 0;
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (clampedSeconds >= s.startTimeSeconds && clampedSeconds < s.startTimeSeconds + s.durationSeconds) {
          targetStageIdx = i;
          break;
        }
        if (i === stages.length - 1 && clampedSeconds >= s.startTimeSeconds) {
          targetStageIdx = i;
        }
      }

      const stage = stages[targetStageIdx];
      const stageOffset = Math.max(0, clampedSeconds - stage.startTimeSeconds);

      let targetStepIdx = 0;
      if (stage.steps && stage.steps.length > 0) {
        for (let j = 0; j < stage.steps.length; j++) {
          if (stageOffset >= stage.steps[j].offsetSeconds) {
            targetStepIdx = j;
          }
        }
      }

      setCurrentStageIndex(targetStageIdx);
      setCurrentStepIndex(targetStepIdx);

      const newSnap = resolveSnapshot(currentScenario, targetStageIdx, targetStepIdx);
      setActiveSnapshot(newSnap);

      if (stage?.targetTab) {
        setActiveTabState(stage.targetTab);
      }
      if (onStageChange && stage) {
        onStageChange(stage);
      }
    },
    [totalDurationSeconds, currentScenario, resolveSnapshot, onStageChange]
  );

  const seekToStage = useCallback(
    (stageIndex: number) => {
      if (!currentScenario?.stages?.length) return;
      const clampedIdx = Math.max(0, Math.min(stageIndex, currentScenario.stages.length - 1));
      const targetStage = currentScenario.stages[clampedIdx];

      setCurrentStageIndex(clampedIdx);
      setCurrentStepIndex(0);
      setElapsedTimeSeconds(targetStage.startTimeSeconds);
      setIsCompleted(false);

      const newSnap = resolveSnapshot(currentScenario, clampedIdx, 0);
      setActiveSnapshot(newSnap);

      if (targetStage?.targetTab) {
        setActiveTabState(targetStage.targetTab);
      }
      if (onStageChange && targetStage) {
        onStageChange(targetStage);
      }
    },
    [currentScenario, resolveSnapshot, onStageChange]
  );

  const nextStep = useCallback(() => {
    const stage = currentScenario.stages[currentStageIndex];
    if (!stage) return;

    if (stage.steps && currentStepIndex < stage.steps.length - 1) {
      const nextStepIdx = currentStepIndex + 1;
      const step = stage.steps[nextStepIdx];
      setCurrentStepIndex(nextStepIdx);
      setElapsedTimeSeconds(stage.startTimeSeconds + step.offsetSeconds);
      const newSnap = resolveSnapshot(currentScenario, currentStageIndex, nextStepIdx);
      setActiveSnapshot(newSnap);
    } else if (currentStageIndex < currentScenario.stages.length - 1) {
      seekToStage(currentStageIndex + 1);
    } else {
      setIsCompleted(true);
      setIsPlaying(false);
    }
  }, [currentScenario, currentStageIndex, currentStepIndex, resolveSnapshot, seekToStage]);

  const prevStep = useCallback(() => {
    const stage = currentScenario.stages[currentStageIndex];
    if (!stage) return;

    if (currentStepIndex > 0) {
      const prevStepIdx = currentStepIndex - 1;
      const step = stage.steps[prevStepIdx];
      setCurrentStepIndex(prevStepIdx);
      setElapsedTimeSeconds(stage.startTimeSeconds + step.offsetSeconds);
      const newSnap = resolveSnapshot(currentScenario, currentStageIndex, prevStepIdx);
      setActiveSnapshot(newSnap);
    } else if (currentStageIndex > 0) {
      const prevStageIdx = currentStageIndex - 1;
      const prevStage = currentScenario.stages[prevStageIdx];
      const lastStepIdx = Math.max(0, (prevStage.steps?.length || 1) - 1);
      setCurrentStageIndex(prevStageIdx);
      setCurrentStepIndex(lastStepIdx);
      const lastOffset = prevStage.steps?.[lastStepIdx]?.offsetSeconds || 0;
      setElapsedTimeSeconds(prevStage.startTimeSeconds + lastOffset);
      const newSnap = resolveSnapshot(currentScenario, prevStageIdx, lastStepIdx);
      setActiveSnapshot(newSnap);
      if (prevStage?.targetTab) {
        setActiveTabState(prevStage.targetTab);
      }
    }
  }, [currentScenario, currentStageIndex, currentStepIndex, resolveSnapshot]);

  const selectScenario = useCallback(
    (scenarioId: string) => {
      startReplay(scenarioId);
    },
    [startReplay]
  );

  const setIsReplayModeCompat = useCallback(
    (activeOrUpdater: boolean | ((prev: boolean) => boolean)) => {
      setIsReplayModeState((prev) => {
        const next = typeof activeOrUpdater === "function" ? activeOrUpdater(prev) : activeOrUpdater;
        if (!next) {
          setIsPlaying(false);
          setIsPaused(false);
        } else {
          setIsPlaying(false); // start paused so user inspects freely
        }
        return next;
      });
    },
    []
  );

  const toggleReplayMode = useCallback(() => {
    setIsReplayModeState((prev) => {
      if (prev) {
        stopReplay();
        return false;
      } else {
        startReplay();
        return true;
      }
    });
  }, [startReplay, stopReplay]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const openScenarioModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeScenarioModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Global Keyboard Shortcuts (Space: play/pause, ArrowLeft/Right: step scrub, Esc: exit/minimize, Enter: confirm exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (isModalOpen) {
          closeScenarioModal();
          e.preventDefault();
        } else if (showExitConfirm) {
          setShowExitConfirm(false);
          e.preventDefault();
        } else if (isReplayMode) {
          setShowExitConfirm(true);
          e.preventDefault();
        }
        return;
      }

      if (e.key === "Enter" && showExitConfirm) {
        e.preventDefault();
        stopReplay();
        return;
      }

      if ((e.key === "m" || e.key === "M") && isReplayMode && !showExitConfirm && !isModalOpen) {
        e.preventDefault();
        toggleMinimize();
        return;
      }

      if (!isReplayMode) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (e.shiftKey) {
          seekToTime(Math.max(0, stateRef.current.elapsedTimeSeconds - 5));
        } else {
          prevStep();
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (e.shiftKey) {
          seekToTime(Math.min(stateRef.current.totalDurationSeconds, stateRef.current.elapsedTimeSeconds + 5));
        } else {
          nextStep();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isReplayMode,
    isModalOpen,
    showExitConfirm,
    closeScenarioModal,
    setShowExitConfirm,
    stopReplay,
    toggleMinimize,
    togglePlay,
    prevStep,
    nextStep,
    seekToTime,
  ]);

  const contextValue: ReplayContextType = useMemo(
    () => ({
      isReplayMode,
      isActive: isReplayMode,
      isReplayActive: isReplayMode,
      isPlaying,
      isPaused,
      isCompleted,
      isInspecting,
      isMinimized,
      speed,
      playbackSpeed: speed,
      activeTab,
      currentScenario,
      currentStageIndex,
      currentStage,
      currentStepIndex,
      currentStep,
      elapsedTimeSeconds,
      elapsedSeconds: elapsedTimeSeconds,
      totalDurationSeconds,
      progressPercent,
      totalProgressPct: progressPercent,
      stageProgress: progressPercent,
      stageStartTimes,
      activeSnapshot,
      currentSnapshot: activeSnapshot,
      isModalOpen,
      showExitConfirm,

      // Core Engine Controls
      startReplay,
      startScenario: (scenarioId: string, autoPlay?: boolean) => {
        startReplay(scenarioId);
        if (autoPlay === false) {
          pause();
        }
      },
      stopReplay,
      exitReplay: stopReplay,
      play,
      pause,
      resume,
      togglePlay,
      togglePlayPause: togglePlay,
      restart,
      reset: restart,
      setSpeed,
      setPlaybackSpeed: (spd: number) => setSpeed(spd),
      seekToTime,
      scrubToSeconds: seekToTime,
      seekToStage,
      jumpToStep: seekToStage,
      goToStage: seekToStage,
      nextStep,
      nextStage: nextStep,
      stepForward: nextStep,
      prevStep,
      prevStage: prevStep,
      stepBackward: prevStep,
      selectScenario,
      setMinimized: setIsMinimized,
      toggleMinimize,
      setIsInspecting,
      setReplayActiveTab,
      openScenarioModal,
      closeScenarioModal,
      setShowExitConfirm,
      availableScenarios: REPLAY_SCENARIOS,
      allScenarios: REPLAY_SCENARIOS,

      // Compatibility properties
      activeScenario: currentScenario?.id || null,
      setActiveScenario: (id: string | null) => {
        if (id) selectScenario(id);
      },
      setIsReplayMode: setIsReplayModeCompat,
      toggleReplayMode,
      setUserNavOverride: () => {},
      currentStepNumber: currentStageIndex + 1,
      setCurrentStep: (stepVal) => {
        const target = typeof stepVal === "function" ? stepVal(currentStageIndex) : stepVal;
        seekToStage(Math.max(0, target - 1));
      },
    }),
    [
      isReplayMode,
      isPlaying,
      isPaused,
      isCompleted,
      isInspecting,
      isMinimized,
      speed,
      activeTab,
      currentScenario,
      currentStageIndex,
      currentStage,
      currentStepIndex,
      currentStep,
      elapsedTimeSeconds,
      totalDurationSeconds,
      progressPercent,
      stageStartTimes,
      activeSnapshot,
      isModalOpen,
      showExitConfirm,
      startReplay,
      stopReplay,
      play,
      pause,
      resume,
      togglePlay,
      restart,
      setSpeed,
      seekToTime,
      seekToStage,
      nextStep,
      prevStep,
      selectScenario,
      toggleMinimize,
      setReplayActiveTab,
      openScenarioModal,
      closeScenarioModal,
      setIsReplayModeCompat,
      toggleReplayMode,
    ]
  );

  return <ReplayContext.Provider value={contextValue}>{children}</ReplayContext.Provider>;
};

export function useReplay(): ReplayContextType {
  const context = useContext(ReplayContext);
  if (!context) {
    throw new Error("useReplay must be used within a ReplayProvider");
  }
  return context;
}
