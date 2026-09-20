"use client";

import React, { useState, useMemo } from "react";
import { ManagerProfileResponse } from "../lib/types";

interface RankTrajectoryChartProps {
  profiles: ManagerProfileResponse[];
  currentGw: number;
  maxGw: number;
  transitionDuration?: string;
}

interface TooltipData {
  managerName: string;
  teamName: string;
  gameweek: number;
  rank: number;
  prevRank?: number;
  gwPoints: number;
  cumNet: number;
  x: number;
  y: number;
  color: string;
}

// Distinct vibrant palette for manager trajectory trails
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

export const RankTrajectoryChart: React.FC<RankTrajectoryChartProps> = ({
  profiles,
  currentGw,
  maxGw,
  transitionDuration = "2000ms",
}) => {
  const [hoveredManagerId, setHoveredManagerId] = useState<number | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (!profiles || profiles.length === 0) return null;

  const totalManagers = profiles.length;
  const safeMaxGw = Math.max(maxGw, 1);
  const gameweeks = Array.from({ length: safeMaxGw + 1 }, (_, i) => i); // [0, 1, 2, ..., safeMaxGw]

  // 1. Calculate cumulative net points and mini-league rank for EVERY manager at EVERY gameweek (starting from GW 0)
  const trajectoryMap: Record<
    number,
    Record<number, { rank: number; points: number; cumNet: number }>
  > = {};

  profiles.forEach((p) => {
    trajectoryMap[p.id] = {};
  });

  // GW 0: Pre-Season Alphabetical Starting Baseline (0 points for all)
  const alphabeticalProfiles = [...profiles].sort((a, b) =>
    (a.player_name || "").localeCompare(b.player_name || "")
  );
  alphabeticalProfiles.forEach((p, idx) => {
    trajectoryMap[p.id][0] = {
      rank: idx + 1,
      points: 0,
      cumNet: 0,
    };
  });

  // GW 1 to safeMaxGw: Actual season trajectory
  for (let gw = 1; gw <= safeMaxGw; gw++) {
    const gwRankings: { managerId: number; cumNet: number; gwPoints: number }[] = [];

    for (const p of profiles) {
      let cumulativeNet = 0;
      let gwPoints = 0;
      for (const h of p.history || []) {
        if (h.gameweek <= gw) {
          cumulativeNet += h.net_points ?? 0;
        }
        if (h.gameweek === gw) {
          gwPoints = h.net_points ?? 0;
        }
      }
      gwRankings.push({
        managerId: p.id,
        cumNet: cumulativeNet,
        gwPoints,
      });
    }

    // Sort by cumulative points descending (and ID tiebreaker)
    gwRankings.sort(
      (a, b) => b.cumNet - a.cumNet || a.managerId - b.managerId
    );

    gwRankings.forEach((item, idx) => {
      trajectoryMap[item.managerId][gw] = {
        rank: idx + 1,
        points: item.gwPoints,
        cumNet: item.cumNet,
      };
    });
  }

  const activeFocusId = selectedManagerId || hoveredManagerId;
  const progressRatio = safeMaxGw > 0 ? currentGw / safeMaxGw : 0;
  const strokeOffset = Math.max(0, 1000 * (1 - progressRatio));

  // ==========================================
  // DESKTOP HORIZONTAL BUMP CHART COORDINATES
  // ==========================================
  const dSvgWidth = 860;
  const dSvgHeight = Math.max(300, totalManagers * 40 + 40);
  const dPadding = { top: 35, right: 150, bottom: 45, left: 60 };
  const dGraphWidth = dSvgWidth - dPadding.left - dPadding.right;
  const dGraphHeight = dSvgHeight - dPadding.top - dPadding.bottom;

  const getDesktopX = (gw: number) => {
    if (safeMaxGw < 1) return dPadding.left;
    return dPadding.left + (gw / safeMaxGw) * dGraphWidth;
  };

  const getDesktopY = (rank: number) => {
    if (totalManagers <= 1) return dPadding.top + dGraphHeight / 2;
    return dPadding.top + ((rank - 1) / (totalManagers - 1)) * dGraphHeight;
  };

  const generateDesktopFullPath = (managerId: number) => {
    const points: { x: number; y: number }[] = [];
    for (let gw = 0; gw <= safeMaxGw; gw++) {
      const data = trajectoryMap[managerId]?.[gw];
      if (data) {
        points.push({ x: getDesktopX(gw), y: getDesktopY(data.rank) });
      }
    }

    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  // =========================================================
  // OPTION A: ROLLING 4-GAMEWEEK HORIZON WINDOW (Mobile)
  // =========================================================
  const WINDOW_SIZE = 4; // shows 4 gameweeks span (e.g. GW0..GW3 or GW1..GW4)
  const windowStartGw = Math.max(0, Math.min(currentGw - (WINDOW_SIZE - 1), safeMaxGw - (WINDOW_SIZE - 1)));
  const windowEndGw = Math.min(safeMaxGw, Math.max(windowStartGw + (WINDOW_SIZE - 1), currentGw));
  const visibleGameweeks = useMemo(() => {
    const arr: number[] = [];
    for (let g = windowStartGw; g <= windowEndGw; g++) {
      arr.push(g);
    }
    return arr;
  }, [windowStartGw, windowEndGw]);

  const mSvgWidth = 380;
  const mSvgHeight = Math.max(280, totalManagers * 36 + 40);
  const mPadding = { top: 25, right: 35, bottom: 35, left: 45 };
  const mGraphWidth = mSvgWidth - mPadding.left - mPadding.right;
  const mGraphHeight = mSvgHeight - mPadding.top - mPadding.bottom;

  const getMobileX = (gw: number) => {
    const span = Math.max(1, windowEndGw - windowStartGw);
    return mPadding.left + ((gw - windowStartGw) / span) * mGraphWidth;
  };

  const getMobileY = (rank: number) => {
    if (totalManagers <= 1) return mPadding.top + mGraphHeight / 2;
    return mPadding.top + ((rank - 1) / (totalManagers - 1)) * mGraphHeight;
  };

  const generateMobileWindowPath = (managerId: number) => {
    const points: { x: number; y: number }[] = [];
    for (const gw of visibleGameweeks) {
      const data = trajectoryMap[managerId]?.[gw];
      if (data) {
        points.push({ x: getMobileX(gw), y: getMobileY(data.rank) });
      }
    }

    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  // Mobile drawing offset for visible window
  const mobileSpan = Math.max(1, windowEndGw - windowStartGw);
  const mobileProgressInWindow = Math.max(
    0,
    Math.min(1, (currentGw - windowStartGw) / mobileSpan)
  );
  const mobileStrokeOffset = Math.max(0, 1000 * (1 - mobileProgressInWindow));

  // Current Leaderboard Standings
  const currentLeaderboard = profiles
    .map((p, idx) => {
      const data = trajectoryMap[p.id]?.[currentGw];
      const prevData = currentGw > 0 ? trajectoryMap[p.id]?.[currentGw - 1] : undefined;
      const rank = data?.rank || idx + 1;
      const prevRank = prevData?.rank || rank;
      const points = data?.points || 0;
      const cumNet = data?.cumNet || 0;
      const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
      const rankDelta = prevRank - rank;

      return {
        managerId: p.id,
        playerName: p.player_name || "Manager",
        teamName: p.entry_name || "Squad",
        rank,
        prevRank,
        rankDelta,
        points,
        cumNet,
        color,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  return (
    <div className="w-full space-y-4">
      {/* Legend / Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {profiles.map((p, idx) => {
            const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
            const isFocused = activeFocusId === p.id;
            const isDimmed = activeFocusId !== null && !isFocused;
            const currentRank = trajectoryMap[p.id]?.[currentGw]?.rank || idx + 1;

            return (
              <button
                key={p.id}
                onMouseEnter={() => setHoveredManagerId(p.id)}
                onMouseLeave={() => setHoveredManagerId(null)}
                onClick={() =>
                  setSelectedManagerId(selectedManagerId === p.id ? null : p.id)
                }
                style={{
                  borderColor: isFocused ? color : undefined,
                  boxShadow: isFocused ? `0 0 14px ${color}40` : undefined,
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                <span className="truncate max-w-[100px] sm:max-w-[120px]">{p.player_name}</span>
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
              setSelectedManagerId(null);
              setHoveredManagerId(null);
              setTooltip(null);
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer shadow-sm shrink-0"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW: OPTION A - ROLLING 4-GW HORIZON WITH FIXED RANK AXIS (< md)  */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {/* Rolling Window Header Banner */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/70 border border-slate-800/90 rounded-xl text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Horizon: {windowStartGw === 0 ? "Start" : `GW${windowStartGw}`} → GW{windowEndGw}</span>
          </div>
          <span className="text-[10px] font-medium text-slate-400">
            Active: <strong className="text-white">GW{currentGw === 0 ? "0" : currentGw}</strong>
          </span>
        </div>

        {/* Rolling SVG Canvas */}
        <div className="relative w-full rounded-2xl bg-slate-950/50 border border-slate-800/70 p-2 overflow-hidden">
          <svg
            viewBox={`0 0 ${mSvgWidth} ${mSvgHeight}`}
            className="w-full h-auto select-none block"
          >
            <defs>
              <filter id="m-trail-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="m-head-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Rank Lines (Fixed on the Left) */}
            {Array.from({ length: totalManagers }, (_, i) => i + 1).map((rank) => {
              const y = getMobileY(rank);
              const isFirst = rank === 1;

              return (
                <g key={`m-rank-${rank}`}>
                  <line
                    x1={mPadding.left}
                    y1={y}
                    x2={mPadding.left + mGraphWidth}
                    y2={y}
                    stroke={isFirst ? "rgba(0, 255, 135, 0.2)" : "rgba(51, 65, 85, 0.25)"}
                    strokeDasharray="4 4"
                    strokeWidth={isFirst ? "1.5" : "1"}
                  />
                  <text
                    x={mPadding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill={isFirst ? "#00FF87" : "#64748B"}
                    fontSize="10"
                    fontWeight={isFirst ? "900" : "700"}
                    className="tabular-nums"
                  >
                    #{rank}
                  </text>
                </g>
              );
            })}

            {/* Vertical Gameweek Lines (Only the 4 Visible in Window) */}
            {visibleGameweeks.map((gw) => {
              const x = getMobileX(gw);
              const isCurrent = gw === currentGw;

              return (
                <g key={`m-gw-${gw}`}>
                  <line
                    x1={x}
                    y1={mPadding.top}
                    x2={x}
                    y2={mPadding.top + mGraphHeight}
                    stroke={isCurrent ? "rgba(0, 255, 135, 0.3)" : "rgba(51, 65, 85, 0.2)"}
                    strokeWidth={isCurrent ? "1.5" : "1"}
                    strokeDasharray={isCurrent ? undefined : "3 3"}
                  />
                  <text
                    x={x}
                    y={mPadding.top + mGraphHeight + 18}
                    textAnchor="middle"
                    fill={isCurrent ? "#00FF87" : "#94A3B8"}
                    fontSize="10"
                    fontWeight={isCurrent ? "900" : "700"}
                  >
                    {gw === 0 ? "Start" : `GW${gw}`}
                  </text>
                </g>
              );
            })}

            {/* Manager Window Curves */}
            {profiles.map((p, idx) => {
              const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
              const isFocused = activeFocusId === p.id;
              const isDimmed = activeFocusId !== null && !isFocused;
              const windowPath = generateMobileWindowPath(p.id);
              const currentRank = trajectoryMap[p.id]?.[currentGw]?.rank || idx + 1;
              const currentData = trajectoryMap[p.id]?.[currentGw];

              const currentHeadX = getMobileX(currentGw);
              const currentHeadY = getMobileY(currentRank);

              return (
                <g key={`m-path-${p.id}`} opacity={isDimmed ? 0.12 : 1}>
                  {/* Faint Window Ghost Arc */}
                  <path
                    d={windowPath}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.2"
                  />

                  {/* Active Focused Glow Aura */}
                  {isFocused && (
                    <path
                      d={windowPath}
                      pathLength={1000}
                      strokeDasharray={1000}
                      strokeDashoffset={mobileStrokeOffset}
                      fill="none"
                      stroke={color}
                      strokeWidth="9"
                      opacity="0.35"
                      filter="url(#m-trail-glow)"
                      style={{
                        transition: `stroke-dashoffset ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
                      }}
                    />
                  )}

                  {/* Active Window Drawing Trail */}
                  <path
                    d={windowPath}
                    pathLength={1000}
                    strokeDasharray={1000}
                    strokeDashoffset={mobileStrokeOffset}
                    fill="none"
                    stroke={color}
                    strokeWidth={isFocused ? "4" : "2.5"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transition: `stroke-dashoffset ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1), stroke-width 300ms ease`,
                    }}
                  />

                  {/* Breadcrumbs in Window */}
                  {visibleGameweeks.map((gw) => {
                    const data = trajectoryMap[p.id]?.[gw];
                    if (!data) return null;

                    const cx = getMobileX(gw);
                    const cy = getMobileY(data.rank);
                    const isPast = gw < currentGw;

                    return (
                      <g
                        key={`m-bc-${p.id}-gw-${gw}`}
                        className="cursor-pointer"
                        style={{
                          opacity: isPast ? (isFocused ? 0.9 : 0.45) : 0,
                          transition: `opacity ${transitionDuration} ease`,
                        }}
                        onClick={() => {
                          setHoveredManagerId(p.id);
                          setTooltip({
                            managerName: p.player_name || "Manager",
                            teamName: p.entry_name || "Squad",
                            gameweek: gw,
                            rank: data.rank,
                            prevRank:
                              gw > 0
                                ? trajectoryMap[p.id]?.[gw - 1]?.rank
                                : undefined,
                            gwPoints: data.points,
                            cumNet: data.cumNet,
                            x: cx,
                            y: cy,
                            color,
                          });
                        }}
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r="3"
                          fill="#070A12"
                          stroke={color}
                          strokeWidth="1.5"
                        />
                      </g>
                    );
                  })}

                  {/* Sliding Head Dot */}
                  <g
                    key={`m-head-${p.id}`}
                    style={{
                      transform: `translate(${currentHeadX}px, ${currentHeadY}px)`,
                      transition: `transform ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
                      zIndex: isFocused ? 50 : 20,
                    }}
                    className="cursor-pointer select-none"
                    onClick={() => {
                      setSelectedManagerId(
                        selectedManagerId === p.id ? null : p.id
                      );
                      if (currentData) {
                        setTooltip({
                          managerName: p.player_name || "Manager",
                          teamName: p.entry_name || "Squad",
                          gameweek: currentGw,
                          rank: currentData.rank,
                          prevRank:
                            currentGw > 0
                              ? trajectoryMap[p.id]?.[currentGw - 1]?.rank
                              : undefined,
                          gwPoints: currentData.points,
                          cumNet: currentData.cumNet,
                          x: currentHeadX,
                          y: currentHeadY,
                          color,
                        });
                      }
                    }}
                  >
                    <circle
                      cx={0}
                      cy={0}
                      r={isFocused ? 13 : 9}
                      fill={color}
                      opacity="0.3"
                      filter="url(#m-head-glow)"
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={isFocused ? 9.5 : 7.5}
                      fill="none"
                      stroke={color}
                      strokeWidth={isFocused ? "2" : "1.5"}
                      opacity="0.85"
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={isFocused ? 6.5 : 5}
                      fill={color}
                      stroke="#070A12"
                      strokeWidth="1.5"
                    />
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip on Mobile */}
          {tooltip && (
            <div
              style={{
                position: "absolute",
                left: `${(tooltip.x / mSvgWidth) * 100}%`,
                top: `${(tooltip.y / mSvgHeight) * 100}%`,
                transform:
                  tooltip.x > mSvgWidth * 0.6
                    ? "translate(-100%, -115%)"
                    : "translate(0%, -115%)",
              }}
              className="pointer-events-none z-30 p-2.5 rounded-xl bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md min-w-[170px] text-xs transition-all duration-150"
            >
              <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-slate-800">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tooltip.color }}
                />
                <span className="font-extrabold text-white block truncate text-xs">
                  {tooltip.managerName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">
                    Rank
                  </span>
                  <span className="font-black text-sm" style={{ color: tooltip.color }}>
                    #{tooltip.rank}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">
                    Score
                  </span>
                  <span className="font-black text-white text-sm">
                    {tooltip.gwPoints} pts
                  </span>
                </div>
              </div>

              <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>Total:</span>
                <span className="font-black text-emerald-400">{tooltip.cumNet} pts</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Mini Leaderboard Companion */}
        <div className="grid grid-cols-2 gap-2">
          {currentLeaderboard.map((item) => {
            const isFocused = activeFocusId === item.managerId;
            const isDimmed = activeFocusId !== null && !isFocused;
            const isFirst = item.rank === 1;

            return (
              <button
                key={`m-card-${item.managerId}`}
                onClick={() =>
                  setSelectedManagerId(
                    selectedManagerId === item.managerId ? null : item.managerId
                  )
                }
                style={{
                  borderColor: isFocused ? item.color : undefined,
                  boxShadow: isFocused ? `0 0 14px ${item.color}35` : undefined,
                }}
                className={`text-left p-2 rounded-xl border transition-all cursor-pointer ${
                  isFocused
                    ? "bg-slate-900 text-white"
                    : isDimmed
                    ? "bg-slate-950/40 border-slate-900/60 opacity-30 text-slate-500"
                    : isFirst
                    ? "bg-slate-950/90 border-emerald-500/30 text-slate-200"
                    : "bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className={`text-[11px] font-black px-1.5 py-0.5 rounded ${
                        isFirst
                          ? "bg-emerald-400/20 text-emerald-400"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      #{item.rank}
                    </span>
                  </div>
                  {currentGw > 0 && (
                    <span
                      className={`text-[10px] font-bold ${
                        item.rankDelta > 0
                          ? "text-emerald-400"
                          : item.rankDelta < 0
                          ? "text-rose-400"
                          : "text-slate-500"
                      }`}
                    >
                      {item.rankDelta > 0
                        ? `↑${item.rankDelta}`
                        : item.rankDelta < 0
                        ? `↓${Math.abs(item.rankDelta)}`
                        : "="}
                    </span>
                  )}
                </div>
                <span className="block text-xs font-bold truncate text-white">
                  {item.playerName}
                </span>
                <div className="flex items-center justify-between text-[10px] pt-1 mt-1 border-t border-slate-800/60 text-slate-400">
                  <span>{item.points} pts</span>
                  <span className="font-bold text-emerald-400">{item.cumNet} tot</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP VIEW: CLASSIC HORIZONTAL BUMP CHART (>= md screens)*/}
      {/* ========================================================= */}
      <div className="hidden md:block relative overflow-x-auto w-full">
        <svg
          viewBox={`0 0 ${dSvgWidth} ${dSvgHeight}`}
          className="w-full h-auto min-w-[720px] select-none"
        >
          <defs>
            <filter id="d-trail-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="d-head-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal Grid Lines (Ranks 1..N) */}
          {Array.from({ length: totalManagers }, (_, i) => i + 1).map((rank) => {
            const y = getDesktopY(rank);
            const isFirst = rank === 1;
            return (
              <g key={`d-grid-rank-${rank}`}>
                <line
                  x1={dPadding.left}
                  y1={y}
                  x2={dPadding.left + dGraphWidth}
                  y2={y}
                  stroke={isFirst ? "rgba(0, 255, 135, 0.2)" : "rgba(51, 65, 85, 0.25)"}
                  strokeDasharray="4 4"
                  strokeWidth={isFirst ? "1.5" : "1"}
                />
                <text
                  x={dPadding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill={isFirst ? "#00FF87" : "#64748B"}
                  fontSize="11"
                  fontWeight={isFirst ? "900" : "700"}
                  className="tabular-nums"
                >
                  #{rank}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid Lines (Gameweeks) */}
          {gameweeks.map((gw) => {
            const x = getDesktopX(gw);
            const isCurrent = gw === currentGw;

            return (
              <g key={`d-grid-gw-${gw}`}>
                <line
                  x1={x}
                  y1={dPadding.top}
                  x2={x}
                  y2={dPadding.top + dGraphHeight}
                  stroke="rgba(51, 65, 85, 0.2)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={dPadding.top + dGraphHeight + 22}
                  textAnchor="middle"
                  fill={isCurrent ? "#00FF87" : "#94A3B8"}
                  fontSize="11"
                  fontWeight={isCurrent ? "900" : "700"}
                >
                  {gw === 0 ? "Start" : `GW ${gw}`}
                </text>
              </g>
            );
          })}

          {/* Manager Trajectory Curves */}
          {profiles.map((p, idx) => {
            const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
            const isFocused = activeFocusId === p.id;
            const isDimmed = activeFocusId !== null && !isFocused;
            const fullPath = generateDesktopFullPath(p.id);
            const currentRank = trajectoryMap[p.id]?.[currentGw]?.rank || idx + 1;
            const currentData = trajectoryMap[p.id]?.[currentGw];

            const currentHeadX = getDesktopX(currentGw);
            const currentHeadY = getDesktopY(currentRank);

            return (
              <g key={`d-path-group-${p.id}`} opacity={isDimmed ? 0.12 : 1}>
                {/* Faint Background Full Season Ghost Arc */}
                <path
                  d={fullPath}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.18"
                />

                {/* Glowing Focus Aura along active path */}
                {isFocused && (
                  <path
                    d={fullPath}
                    pathLength={1000}
                    strokeDasharray={1000}
                    strokeDashoffset={strokeOffset}
                    fill="none"
                    stroke={color}
                    strokeWidth="9"
                    opacity="0.35"
                    filter="url(#d-trail-glow)"
                    style={{
                      transition: `stroke-dashoffset ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
                    }}
                  />
                )}

                {/* Continuous Drawing Active Trail Line */}
                <path
                  d={fullPath}
                  pathLength={1000}
                  strokeDasharray={1000}
                  strokeDashoffset={strokeOffset}
                  fill="none"
                  stroke={color}
                  strokeWidth={isFocused ? "4.5" : "2.5"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transition: `stroke-dashoffset ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1), stroke-width 300ms ease`,
                  }}
                />

                {/* Milestone Breadcrumb Dots Left Behind */}
                {gameweeks.map((gw) => {
                  const data = trajectoryMap[p.id]?.[gw];
                  if (!data) return null;

                  const cx = getDesktopX(gw);
                  const cy = getDesktopY(data.rank);
                  const isPast = gw < currentGw;

                  return (
                    <g
                      key={`d-breadcrumb-${p.id}-gw-${gw}`}
                      className="cursor-pointer"
                      style={{
                        opacity: isPast ? (isFocused ? 0.9 : 0.45) : 0,
                        transition: `opacity ${transitionDuration} ease`,
                      }}
                      onMouseEnter={() => {
                        setHoveredManagerId(p.id);
                        setTooltip({
                          managerName: p.player_name || "Manager",
                          teamName: p.entry_name || "Squad",
                          gameweek: gw,
                          rank: data.rank,
                          prevRank:
                            gw > 0
                              ? trajectoryMap[p.id]?.[gw - 1]?.rank
                              : undefined,
                          gwPoints: data.points,
                          cumNet: data.cumNet,
                          x: cx,
                          y: cy,
                          color,
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredManagerId(null);
                        setTooltip(null);
                      }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r="3.5"
                        fill="#070A12"
                        stroke={color}
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}

                {/* THE BIG SLIDING DOT & ATTACHED LABEL */}
                <g
                  key={`d-sliding-head-${p.id}`}
                  style={{
                    transform: `translate(${currentHeadX}px, ${currentHeadY}px)`,
                    transition: `transform ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
                    zIndex: isFocused ? 50 : 20,
                  }}
                  className="cursor-pointer select-none"
                  onMouseEnter={() => {
                    setHoveredManagerId(p.id);
                    if (currentData) {
                      setTooltip({
                        managerName: p.player_name || "Manager",
                        teamName: p.entry_name || "Squad",
                        gameweek: currentGw,
                        rank: currentData.rank,
                        prevRank:
                          currentGw > 0
                            ? trajectoryMap[p.id]?.[currentGw - 1]?.rank
                            : undefined,
                        gwPoints: currentData.points,
                        cumNet: currentData.cumNet,
                        x: currentHeadX,
                        y: currentHeadY,
                        color,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredManagerId(null);
                    setTooltip(null);
                  }}
                  onClick={() =>
                    setSelectedManagerId(
                      selectedManagerId === p.id ? null : p.id
                    )
                  }
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={isFocused ? 14 : 11}
                    fill={color}
                    opacity="0.25"
                    filter="url(#d-head-glow)"
                  />
                  <circle
                    cx={0}
                    cy={0}
                    r={isFocused ? 10.5 : 8.5}
                    fill="none"
                    stroke={color}
                    strokeWidth={isFocused ? "2.5" : "2"}
                    opacity="0.8"
                  />
                  <circle
                    cx={0}
                    cy={0}
                    r={isFocused ? 6.5 : 5.5}
                    fill={color}
                    stroke="#070A12"
                    strokeWidth="2"
                    className="transition-all duration-300"
                  />

                  {currentData && (
                    <g transform="translate(14, 0)">
                      <rect
                        x={-2}
                        y={-10}
                        width="130"
                        height="20"
                        rx="6"
                        fill="#070A12"
                        stroke={isFocused ? color : "rgba(51, 65, 85, 0.5)"}
                        strokeWidth={isFocused ? "1.5" : "1"}
                      />
                      <circle
                        cx={6}
                        cy={0}
                        r="3"
                        fill={color}
                      />
                      <text
                        x={15}
                        y={3.5}
                        fill={isFocused ? "#FFFFFF" : color}
                        fontSize="10"
                        fontWeight="800"
                        className="truncate"
                      >
                        {p.player_name.split(" ")[0]} (#{currentData.rank})
                      </text>
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </svg>

        {/* Desktop Tooltip */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: `${(tooltip.x / dSvgWidth) * 100}%`,
              top: `${(tooltip.y / dSvgHeight) * 100}%`,
              transform:
                tooltip.x > dSvgWidth * 0.65
                  ? "translate(-105%, -110%)"
                  : "translate(8%, -110%)",
            }}
            className="pointer-events-none z-30 p-3 rounded-2xl bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md min-w-[200px] text-xs transition-all duration-150"
          >
            <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
              <div
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: tooltip.color }}
              />
              <div className="truncate">
                <span className="font-extrabold text-white block truncate text-xs">
                  {tooltip.managerName}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {tooltip.teamName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                  {tooltip.gameweek === 0 ? "Baseline Rank" : `GW ${tooltip.gameweek} Rank`}
                </span>
                <span className="font-black text-sm" style={{ color: tooltip.color }}>
                  #{tooltip.rank}
                </span>
                {tooltip.prevRank && tooltip.prevRank !== tooltip.rank && (
                  <span className="text-[10px] ml-1 font-bold text-slate-400">
                    (from #{tooltip.prevRank})
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                  {tooltip.gameweek === 0 ? "Pre-Season Net" : `GW ${tooltip.gameweek} Net Score`}
                </span>
                <span className="font-black text-white text-sm">
                  {tooltip.gwPoints}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">pts</span>
                </span>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Cumulative Total</span>
              <span className="font-black text-emerald-400">{tooltip.cumNet} pts</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
