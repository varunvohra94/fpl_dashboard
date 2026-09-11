"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Sparkles,
  BarChart2,
  GitCommit,
  Crosshair,
} from "lucide-react";
import { ManagerProfileResponse } from "../lib/types";
import { RankTrajectoryChart } from "./RankTrajectoryChart";

interface BarChartRaceProps {
  profiles: ManagerProfileResponse[];
  maxGw: number;
}

interface ManagerState {
  managerId: number;
  managerName: string;
  teamName: string;
  cumulativeNetPoints: number;
  currentRank: number;
  prevRank: number;
  color: string;
}

type VizMode = "trail" | "bars";

const ROW_HEIGHT = 60;
const ROW_GAP = 12;
const STEP = ROW_HEIGHT + ROW_GAP;

const TRAIL_COLORS = [
  "#00FF87", // Premier League Emerald
  "#00E5FF", // Neon Cyan
  "#A855F7", // Electric Purple
  "#FF3366", // Neon Rose
  "#FFB800", // Amber Gold
  "#3B82F6", // Vivid Blue
  "#10B981", // Teal
  "#EC4899", // Magenta Pink
  "#F97316", // Coral Orange
  "#6366F1", // Indigo
  "#14B8A6", // Mint
  "#E11D48", // Crimson
];

const SPEED_CONFIG: Record<
  number,
  { intervalMs: number; transitionDuration: string }
> = {
  0.5: { intervalMs: 4200, transitionDuration: "2400ms" },
  1: { intervalMs: 2800, transitionDuration: "1600ms" },
  2: { intervalMs: 1600, transitionDuration: "900ms" },
};

export const BarChartRace: React.FC<BarChartRaceProps> = ({
  profiles,
  maxGw,
}) => {
  const [currentGw, setCurrentGw] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1); // 0.5x, 1x, 2x
  const [vizMode, setVizMode] = useState<VizMode>("trail"); // Default: Trail Graph
  const [spotlightManagerId, setSpotlightManagerId] = useState<number | null>(
    null
  );
  const [hoveredManagerId, setHoveredManagerId] = useState<number | null>(
    null
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute cumulative standings for all managers at a specific gameweek
  const getRankedStatesForGw = (targetGw: number): ManagerState[] => {
    const list: {
      managerId: number;
      managerName: string;
      teamName: string;
      cumulativeNetPoints: number;
      color: string;
    }[] = [];

    (profiles || []).forEach((p, idx) => {
      let cumulativeNet = 0;
      const history = p.history || [];
      for (const h of history) {
        if (h.gameweek <= targetGw) {
          cumulativeNet += h.net_points ?? 0;
        }
      }
      list.push({
        managerId: p.id,
        managerName: p.player_name || "Manager",
        teamName: p.entry_name || "Squad",
        cumulativeNetPoints: cumulativeNet,
        color: TRAIL_COLORS[idx % TRAIL_COLORS.length],
      });
    });

    // Sort by cumulative points descending (and ID as deterministic tiebreaker)
    list.sort(
      (a, b) =>
        b.cumulativeNetPoints - a.cumulativeNetPoints ||
        a.managerId - b.managerId
    );

    // Compute previous rank (at targetGw - 1)
    const prevMap: Record<number, number> = {};
    if (targetGw > 1) {
      const prevList = getRankedStatesForGw(targetGw - 1);
      prevList.forEach((item) => {
        prevMap[item.managerId] = item.currentRank;
      });
    }

    return list.map((item, idx) => ({
      ...item,
      currentRank: idx + 1,
      prevRank: prevMap[item.managerId] || idx + 1,
    }));
  };

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      const config = SPEED_CONFIG[speed] || SPEED_CONFIG[1];
      timerRef.current = setInterval(() => {
        setCurrentGw((prev) => {
          if (prev >= maxGw) {
            setIsPlaying(false);
            return maxGw;
          }
          return prev + 1;
        });
      }, config.intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, maxGw]);

  const currentStandings = getRankedStatesForGw(currentGw);
  const maxPoints = Math.max(
    ...currentStandings.map((s) => s.cumulativeNetPoints),
    1
  );

  const currentSpeedConfig = SPEED_CONFIG[speed] || SPEED_CONFIG[1];
  const transitionDuration = currentSpeedConfig.transitionDuration;

  const containerHeight =
    (profiles?.length || currentStandings.length) * STEP;

  const activeFocusId = spotlightManagerId || hoveredManagerId;

  return (
    <div className="space-y-6">
      {/* Analytics Master Unified Card */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl p-5 sm:p-7 shadow-2xl overflow-hidden space-y-6">
        {/* Top Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Interactive Mini-League Analytics
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Gameweek {currentGw} of {maxGw}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
              {vizMode === "trail"
                ? "Gameweek Rank Trajectory Trail Graph"
                : "Mini-League Rank Progression Race"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {vizMode === "trail"
                ? "Continuous smooth trajectory lines showing overtakes and rank switches across gameweeks"
                : "Follow your name as cards glide smoothly across positions in real-time"}
            </p>
          </div>

          {/* Controls: View Switcher, Playback, Speed */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher: Trail Graph (Default) vs Bar Race */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setVizMode("trail")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  vizMode === "trail"
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Gameweek Rank Trajectory Trail Graph"
              >
                <GitCommit className="h-3.5 w-3.5" />
                <span>Trail Graph</span>
              </button>
              <button
                onClick={() => setVizMode("bars")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  vizMode === "bars"
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Bar Chart Race"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                <span>Bar Race</span>
              </button>
            </div>

            {/* Play / Pause */}
            <button
              onClick={() => {
                if (currentGw >= maxGw) setCurrentGw(1);
                setIsPlaying(!isPlaying);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>{currentGw >= maxGw ? "REPLAY RACE" : "PLAY RACE"}</span>
                </>
              )}
            </button>

            {/* Reset Button */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentGw(1);
              }}
              title="Reset to Gameweek 1"
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Speed Toggle Buttons (0.5x, 1x, 2x) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    speed === s
                      ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Manager Spotlight Legend (Available for Bar Race to follow your name easily) */}
        {vizMode === "bars" && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-2">
            <div className="flex flex-wrap gap-2">
              {profiles.map((p, idx) => {
                const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
                const isFocused = activeFocusId === p.id;
                const isDimmed = activeFocusId !== null && !isFocused;
                const standing = currentStandings.find(
                  (s) => s.managerId === p.id
                );
                const currentRank = standing?.currentRank || idx + 1;

                return (
                  <button
                    key={p.id}
                    onMouseEnter={() => setHoveredManagerId(p.id)}
                    onMouseLeave={() => setHoveredManagerId(null)}
                    onClick={() =>
                      setSpotlightManagerId(
                        spotlightManagerId === p.id ? null : p.id
                      )
                    }
                    style={{
                      borderColor: isFocused ? color : undefined,
                      boxShadow: isFocused ? `0 0 14px ${color}50` : undefined,
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isFocused
                        ? "bg-slate-800 text-white"
                        : isDimmed
                        ? "bg-slate-950/40 text-slate-600 border-slate-900 opacity-35"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate max-w-[110px]">
                      {p.player_name}
                    </span>
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      #{currentRank}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeFocusId && (
              <button
                onClick={() => {
                  setSpotlightManagerId(null);
                  setHoveredManagerId(null);
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer shadow-sm shrink-0"
              >
                Clear Spotlight
              </button>
            )}
          </div>
        )}

        {/* Main Content Area: Trail Graph or Bar Race */}
        {vizMode === "trail" ? (
          <RankTrajectoryChart
            profiles={profiles}
            currentGw={currentGw}
            maxGw={maxGw}
            transitionDuration={transitionDuration}
          />
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${containerHeight}px` }}
          >
            {currentStandings.map((m) => {
              const topPosition = (m.currentRank - 1) * STEP;
              const percentage = Math.max(
                16,
                (m.cumulativeNetPoints / maxPoints) * 100
              );
              const rankDelta = m.prevRank - m.currentRank;
              const isLeader = m.currentRank === 1;
              const isFocused = activeFocusId === m.managerId;
              const isDimmed = activeFocusId !== null && !isFocused;

              // Pure vertical glide without scale jitter for silky smooth card following
              const zIndex = isFocused
                ? 80
                : isLeader
                ? 40
                : rankDelta > 0
                ? 30
                : 15;

              return (
                <div
                  key={m.managerId}
                  onClick={() =>
                    setSpotlightManagerId(
                      spotlightManagerId === m.managerId ? null : m.managerId
                    )
                  }
                  onMouseEnter={() => setHoveredManagerId(m.managerId)}
                  onMouseLeave={() => setHoveredManagerId(null)}
                  style={{
                    top: 0,
                    transform: `translateY(${topPosition}px)`,
                    height: `${ROW_HEIGHT}px`,
                    zIndex,
                    opacity: isDimmed ? 0.35 : 1,
                    borderColor: isFocused
                      ? m.color
                      : isLeader
                      ? "rgba(0, 255, 135, 0.6)"
                      : undefined,
                    boxShadow: isFocused
                      ? `0 0 25px ${m.color}60, 0 15px 35px rgba(0, 0, 0, 0.8)`
                      : isLeader
                      ? "0 10px 25px -5px rgba(0, 255, 135, 0.2)"
                      : undefined,
                    transition: `transform ${transitionDuration} cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease, box-shadow 300ms ease, border-color 300ms ease`,
                  }}
                  className={`absolute left-0 right-0 rounded-2xl border px-3 sm:px-4 flex items-center gap-3 backdrop-blur-md cursor-pointer will-change-transform ${
                    isLeader
                      ? "bg-gradient-to-r from-emerald-950/70 via-slate-900/95 to-slate-900/90"
                      : isFocused
                      ? "bg-slate-900/95"
                      : "bg-slate-950/80 border-slate-800/80 hover:border-slate-700 shadow-md"
                  }`}
                >
                  {/* Rank Position Badge */}
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    <span
                      className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center transition-colors duration-300 ${
                        isLeader
                          ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/30"
                          : m.currentRank <= 3
                          ? "bg-slate-800 text-slate-200 border border-slate-700"
                          : "text-slate-500 font-bold"
                      }`}
                    >
                      {isLeader ? (
                        <Crown className="h-4 w-4 text-slate-950 fill-current" />
                      ) : (
                        m.currentRank
                      )}
                    </span>
                  </div>

                  {/* Manager & Team Name Label with Signature Color Indicator */}
                  <div className="w-28 sm:w-44 shrink-0 truncate flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: m.color }}
                    />
                    <div className="truncate">
                      <span className="text-xs font-bold text-white block truncate">
                        {m.managerName}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate font-medium">
                        {m.teamName}
                      </span>
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="flex-1 h-9 rounded-xl bg-slate-900/90 border border-slate-800/80 p-1 flex items-center relative overflow-hidden">
                    <div
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: isFocused ? m.color : undefined,
                        transition: `width ${transitionDuration} cubic-bezier(0.25, 1, 0.5, 1), background-color 300ms ease`,
                      }}
                      className={`h-full rounded-lg flex items-center justify-end pr-3 transition-all ${
                        isFocused
                          ? "text-slate-950 shadow-md"
                          : isLeader
                          ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-md shadow-emerald-500/30"
                          : m.currentRank <= 3
                          ? "bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 shadow-sm"
                          : "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500"
                      }`}
                    >
                      <span
                        className={`text-xs font-black tabular-nums drop-shadow-sm whitespace-nowrap ${
                          isFocused ? "text-slate-950" : "text-white"
                        }`}
                      >
                        {m.cumulativeNetPoints} pts
                      </span>
                    </div>
                  </div>

                  {/* Weekly Delta Badge */}
                  <div className="w-14 shrink-0 text-right">
                    {rankDelta > 0 ? (
                      <span className="inline-flex items-center text-[11px] font-black text-emerald-400 px-1.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                        +{rankDelta}
                      </span>
                    ) : rankDelta < 0 ? (
                      <span className="inline-flex items-center text-[11px] font-black text-rose-400 px-1.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                        {rankDelta}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] text-slate-600 font-bold px-1.5 py-0.5">
                        <Minus className="h-3 w-3 mr-0.5" />
                        0
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Gameweek Scrubber Slider (Positioned at the BOTTOM of the visualization) */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 shadow-inner">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2.5">
              <span>GW 1</span>
              <span className="text-emerald-400 font-black text-sm px-3.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                Gameweek {currentGw}
              </span>
              <span>GW {maxGw}</span>
            </div>
            <input
              type="range"
              min={1}
              max={Math.max(maxGw, 1)}
              value={currentGw}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentGw(Number(e.target.value));
              }}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
