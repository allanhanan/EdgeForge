"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ChevronDown,
  Minimize2,
  Maximize2,
  X,
  Layers,
  Info,
} from "lucide-react";
import { useReplay } from "./ReplayContext";
import { formatDuration } from "./ScenarioSelectorModal";
import { PlaybackSpeed } from "./types";

export const ReplayToolbar: React.FC = () => {
  const {
    isActive,
    isPlaying,
    speed,
    currentScenario,
    currentStageIndex,
    currentStage,
    elapsedSeconds,
    totalDurationSeconds,
    totalProgressPct,
    stageStartTimes,
    isMinimized,
    showExitConfirm,
    togglePlayPause,
    setSpeed,
    restart,
    nextStep,
    prevStep,
    jumpToStep,
    scrubToSeconds,
    toggleMinimize,
    openScenarioModal,
    exitReplay,
    setShowExitConfirm,
  } = useReplay();

  const [hoveredStageIndex, setHoveredStageIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const calculatePctFromClientX = useCallback(
    (clientX: number) => {
      if (!scrubberRef.current || totalDurationSeconds === 0) return 0;
      const rect = scrubberRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      return Math.max(0, Math.min(1, clickX / rect.width));
    },
    [totalDurationSeconds]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!scrubberRef.current || totalDurationSeconds === 0) return;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      const pct = calculatePctFromClientX(e.clientX);
      scrubToSeconds(pct * totalDurationSeconds);
    },
    [calculatePctFromClientX, scrubToSeconds, totalDurationSeconds]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!scrubberRef.current) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      setTooltipPos(e.clientX - rect.left);

      if (isDragging) {
        const pct = calculatePctFromClientX(e.clientX);
        scrubToSeconds(pct * totalDurationSeconds);
      }
    },
    [isDragging, calculatePctFromClientX, scrubToSeconds, totalDurationSeconds]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging) {
        setIsDragging(false);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
      }
    },
    [isDragging]
  );

  if (!isActive || !currentScenario) {
    return null;
  }

  const stages = currentScenario.stages || [];
  const stageCount = stages.length;

  // MINIMIZED VIEW: compact mini-pill floating in the bottom-right
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-40 bg-[#111217] border border-[#2c3235] shadow-2xl rounded-sm p-1.5 px-3 flex items-center gap-3 text-xs font-sans animate-in slide-in-from-bottom-2 duration-150 select-none"
        role="region"
        aria-label="Minimized Replay Bar"
      >
        {/* Pulsing indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#73bf69] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#73bf69]" />
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#73bf69]">
            REPLAY [{currentStageIndex + 1}/{stageCount}]
          </span>
        </div>

        <div className="h-3.5 w-px bg-[#2c3235]" />

        <span className="font-medium text-[#ccccdc] truncate max-w-[160px] sm:max-w-[240px]">
          {currentStage?.title || currentScenario.title}
        </span>

        <span className="font-mono text-[11px] text-[#8e8e9e]">
          {formatDuration(elapsedSeconds)} / {formatDuration(totalDurationSeconds)}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={togglePlayPause}
            className="h-6 w-6 rounded-sm bg-[#22252b] hover:bg-[#2c3235] flex items-center justify-center text-[#ccccdc] transition-colors"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-3 w-3 fill-current text-[#f59f00]" />
            ) : (
              <Play className="h-3 w-3 fill-current text-[#73bf69]" />
            )}
          </button>

          <button
            onClick={toggleMinimize}
            className="h-6 w-6 rounded-sm hover:bg-[#22252b] flex items-center justify-center text-[#8e8e9e] hover:text-[#ccccdc] transition-colors"
            title="Expand replay toolbar"
            aria-label="Expand replay toolbar"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // FULL WORKSTATION TOOLBAR: Grafana-styled floating engineering panel
  return (
    <>
      <div
        className="fixed bottom-4 left-4 right-4 max-w-6xl mx-auto z-40 bg-[#111217] border border-[#2c3235] shadow-2xl rounded-sm overflow-hidden select-none font-sans animate-in slide-in-from-bottom-3 duration-200"
        role="region"
        aria-label="Replay Controls Toolbar"
      >
        {/* Top Info Banner / Stage Context Strip */}
        <div className="px-4 py-1.5 bg-[#181b1f] border-b border-[#2c3235] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pulsing Status Pill */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#111217] border border-[#73bf69]/40 text-[#73bf69] text-[10px] font-mono font-semibold shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#73bf69] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#73bf69]" />
              </span>
              <span>LIVE REPLAY</span>
            </div>

            {/* Scenario Name */}
            <span className="font-semibold text-xs text-[#ccccdc] truncate hidden sm:inline">
              {currentScenario.title}
            </span>

            <span className="text-[#8e8e9e]/60 hidden sm:inline">•</span>

            {/* Step Label */}
            <div className="flex items-center gap-1.5 truncate text-xs">
              <span className="font-mono text-[#f59f00] font-medium shrink-0">
                [{currentStageIndex + 1}/{stageCount}]
              </span>
              <span className="font-medium text-[#ccccdc] truncate">
                {currentStage?.title}
              </span>
              {currentStage?.badge && (
                <span className="hidden md:inline px-1.5 py-0.2 rounded-sm bg-[#22252b] text-[10px] font-mono text-[#8e8e9e] border border-[#2c3235]">
                  {currentStage.badge}
                </span>
              )}
            </div>
          </div>

          {/* Quick Summary Narrative Strip */}
          <div className="flex items-center gap-3 shrink-0">
            {currentStage?.summary && (
              <span className="hidden xl:inline text-[11px] text-[#8e8e9e] font-sans truncate max-w-[360px]">
                {currentStage.summary}
              </span>
            )}

            {/* Target Tab Pill */}
            {currentStage && (currentStage.targetTab || currentStage.activeTab) && (
              <span className="px-2 py-0.5 rounded-sm bg-[#111217] border border-[#2c3235] text-[10px] font-mono text-[#5794f2]">
                TAB: {String(currentStage.targetTab || currentStage.activeTab).toUpperCase()}
              </span>
            )}

            {/* Minimize button */}
            <button
              onClick={toggleMinimize}
              className="h-6 w-6 rounded-sm text-[#8e8e9e] hover:text-[#ccccdc] hover:bg-[#22252b] flex items-center justify-center transition-colors"
              title="Minimize replay bar"
              aria-label="Minimize replay bar"
            >
              <Minimize2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Main Controls & Scrubber Body */}
        <div className="p-3 sm:px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111217]">
          {/* Left: Transport Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Restart Button */}
            <button
              onClick={restart}
              className="h-8 w-8 rounded-sm bg-[#181b1f] hover:bg-[#22252b] border border-[#2c3235] flex items-center justify-center text-[#8e8e9e] hover:text-[#ccccdc] transition-colors"
              title="Restart Scenario (⏮)"
              aria-label="Restart Scenario"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Previous Step */}
            <button
              onClick={prevStep}
              className="h-8 w-8 rounded-sm bg-[#181b1f] hover:bg-[#22252b] border border-[#2c3235] flex items-center justify-center text-[#8e8e9e] hover:text-[#ccccdc] transition-colors"
              title="Previous Step (Shift+←)"
              aria-label="Previous Step"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>

            {/* Play/Pause Toggle */}
            <button
              onClick={togglePlayPause}
              className="h-8 px-3 rounded-sm bg-[#f59f00] hover:bg-[#f59f00]/90 text-black font-semibold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-black text-black" />
                  <span className="text-xs">PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-black text-black" />
                  <span className="text-xs">PLAY</span>
                </>
              )}
            </button>

            {/* Next Step */}
            <button
              onClick={nextStep}
              className="h-8 w-8 rounded-sm bg-[#181b1f] hover:bg-[#22252b] border border-[#2c3235] flex items-center justify-center text-[#8e8e9e] hover:text-[#ccccdc] transition-colors"
              title="Next Step (Shift+→)"
              aria-label="Next Step"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>

            {/* Speed Selector Segmented Control */}
            <div className="flex items-center ml-2 border border-[#2c3235] rounded-sm bg-[#181b1f] p-0.5">
              {([1, 2, 4] as PlaybackSpeed[]).map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSpeed(sp)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded-sm transition-colors ${
                    speed === sp
                      ? "bg-[#22252b] text-[#f59f00] font-semibold border border-[#f59f00]/30"
                      : "text-[#8e8e9e] hover:text-[#ccccdc]"
                  }`}
                  title={`Playback speed ${sp}x`}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>

          {/* Center: Interactive Timeline Scrubber & Milestone Pips */}
          <div className="flex-1 min-w-[200px] flex items-center gap-3">
            {/* Elapsed / Total Time */}
            <span className="font-mono text-xs text-[#ccccdc] shrink-0 min-w-[85px]">
              {formatDuration(elapsedSeconds)} /{" "}
              <span className="text-[#8e8e9e]">{formatDuration(totalDurationSeconds)}</span>
            </span>

            {/* Scrubber Container */}
            <div
              ref={scrubberRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              role="slider"
              tabIndex={0}
              aria-label="Replay timeline progress scrubber"
              aria-valuemin={0}
              aria-valuemax={totalDurationSeconds}
              aria-valuenow={Math.round(elapsedSeconds)}
              aria-valuetext={`${formatDuration(elapsedSeconds)} of ${formatDuration(totalDurationSeconds)}`}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  scrubToSeconds(Math.max(0, elapsedSeconds - 5));
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  scrubToSeconds(Math.min(totalDurationSeconds, elapsedSeconds + 5));
                }
              }}
              className="relative flex-1 h-6 flex items-center cursor-pointer group select-none touch-none"
            >
              {/* Background Track */}
              <div className="w-full h-2 rounded-xs bg-[#1f2328] border border-[#2c3235] overflow-hidden relative">
                {/* Active Progress Fill */}
                <div
                  className="h-full bg-gradient-to-r from-[#5794f2] to-[#73bf69] transition-all duration-75"
                  style={{ width: `${totalProgressPct}%` }}
                />
              </div>

              {/* Scrubber Thumb Indicator */}
              <div
                style={{ left: `${totalProgressPct}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#73bf69] border border-white shadow-[0_0_8px_rgba(115,191,105,0.8)] pointer-events-none transition-transform group-hover:scale-125 z-20"
              />

              {/* Stage Milestone Pips */}
              {stages.map((stage, idx) => {
                const startTime = stageStartTimes[idx] || 0;
                const pct =
                  totalDurationSeconds > 0 ? (startTime / totalDurationSeconds) * 100 : 0;
                const isPassed = elapsedSeconds >= startTime;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div
                    key={stage.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Jump to stage ${idx + 1}: ${stage.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpToStep(idx);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        e.preventDefault();
                        jumpToStep(idx);
                      }
                    }}
                    onMouseEnter={(e) => {
                      setHoveredStageIndex(idx);
                      const rect = scrubberRef.current?.getBoundingClientRect();
                      if (rect) {
                        setTooltipPos(e.clientX - rect.left);
                      }
                    }}
                    onMouseLeave={() => setHoveredStageIndex(null)}
                    style={{ left: `${pct}%` }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 flex items-center justify-center transition-transform hover:scale-125 z-10 focus:outline-none"
                  >
                    <div
                      className={`h-2 w-2 rounded-full border transition-colors ${
                        isCurrent
                          ? "bg-[#f59f00] border-white ring-2 ring-[#f59f00]/40"
                          : isPassed
                          ? "bg-[#73bf69] border-[#181b1f]"
                          : "bg-[#2c3235] border-[#181b1f]"
                      }`}
                    />
                  </div>
                );
              })}

              {/* Hover Tooltip over Scrubber */}
              {hoveredStageIndex !== null && stages[hoveredStageIndex] && (
                <div
                  style={{ left: `${tooltipPos}px` }}
                  className="absolute bottom-7 -translate-x-1/2 z-50 bg-[#181b1f] border border-[#2c3235] shadow-xl px-2.5 py-1.5 rounded-sm pointer-events-none text-xs whitespace-nowrap font-sans text-[#ccccdc] animate-in fade-in duration-100"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[#f59f00] font-semibold text-[10px]">
                      Stage {hoveredStageIndex + 1}/{stageCount}
                    </span>
                    <span className="font-medium text-xs">
                      {stages[hoveredStageIndex].title}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8e8e9e] font-mono mt-0.5">
                    Target: Tab `{stages[hoveredStageIndex].targetTab || stages[hoveredStageIndex].activeTab}` •{" "}
                    {stages[hoveredStageIndex].badge}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Scenario Switcher & Exit Action */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Scenario Switcher Button */}
            <button
              id="btn-scenario-switcher"
              onClick={openScenarioModal}
              className="h-8 px-2.5 rounded-sm bg-[#181b1f] hover:bg-[#22252b] border border-[#2c3235] text-xs font-sans text-[#ccccdc] flex items-center gap-1.5 transition-colors"
              title="Browse all scenarios"
              aria-label="Browse scenarios"
            >
              <Layers className="h-3.5 w-3.5 text-[#5794f2]" />
              <span>Scenarios</span>
              <ChevronDown className="h-3 w-3 text-[#8e8e9e]" />
            </button>

            {/* Exit Replay Button */}
            <button
              id="btn-exit-replay"
              onClick={() => setShowExitConfirm(true)}
              className="h-8 px-2.5 rounded-sm bg-[#22252b] hover:bg-[#f2495c]/20 hover:text-[#f2495c] hover:border-[#f2495c]/40 border border-[#2c3235] text-xs font-sans text-[#8e8e9e] flex items-center gap-1 transition-colors"
              title="Exit Replay Mode (Esc)"
              aria-label="Exit Replay"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit Replay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100 font-sans"
          onClick={() => setShowExitConfirm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-[#111217] border border-[#2c3235] p-5 rounded-sm shadow-2xl text-[#ccccdc] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-[#f59f00]">
              <Info className="h-5 w-5" />
              <h3 className="font-semibold text-sm text-[#ccccdc]">Exit Replay Mode?</h3>
            </div>
            <p className="text-xs text-[#8e8e9e] leading-relaxed">
              Exiting Replay Mode will stop simulated scenario playback and return you to live EdgeForge workspace state.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2c3235]">
              <button
                id="btn-cancel-exit-replay"
                onClick={() => setShowExitConfirm(false)}
                className="px-3 py-1.5 rounded-sm bg-[#22252b] hover:bg-[#2c3235] text-xs text-[#ccccdc] transition-colors"
                aria-label="Keep Replaying"
              >
                Keep Replaying
              </button>
              <button
                id="btn-confirm-exit-replay"
                onClick={exitReplay}
                className="px-3 py-1.5 rounded-sm bg-[#f2495c] hover:bg-[#f2495c]/90 text-white font-medium text-xs transition-colors"
                aria-label="Exit Replay Mode"
              >
                Exit Replay Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
