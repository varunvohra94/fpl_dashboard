"use client";

import React, { useState } from "react";
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
  const [expandedManagerId, setExpandedManagerId] = useState<number | null>(null);
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

  // ==========================================
  // OPTION D: MANAGER TRAJECTORY MATRIX DATA
  // ==========================================
  const currentLeaderboard = profiles
    .map((p, idx) => {
      const data = trajectoryMap[p.id]?.[currentGw];
      const prevData = currentGw > 0 ? trajectoryMap[p.id]?.[currentGw - 1] : undefined;
      const rank = data?.rank || idx + 1;
      const prevRank = prevData?.rank || rank;
      const startRank = trajectoryMap[p.id]?.[0]?.rank || idx + 1;
      const points = data?.points || 0;
      const cumNet = data?.cumNet || 0;
      const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
      const rankDelta = prevRank - rank;
      const totalDelta = startRank - rank;

      // Calculate min, max, best score across season to currentGw
      let highestRank = rank;
      let lowestRank = rank;
      let bestGwScore = 0;

      for (let g = 0; g <= currentGw; g++) {
        const item = trajectoryMap[p.id]?.[g];
        if (item) {
          if (item.rank < highestRank) highestRank = item.rank;
          if (item.rank > lowestRank) lowestRank = item.rank;
          if (item.points > bestGwScore) bestGwScore = item.points;
        }
      }

      return {
        managerId: p.id,
        playerName: p.player_name || "Manager",
        teamName: p.entry_name || "Squad",
        rank,
        prevRank,
        startRank,
        rankDelta,
        totalDelta,
        points,
        cumNet,
        color,
        highestRank,
        lowestRank,
        bestGwScore,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  // Generate Sparkline Path for a Manager (0 to currentGw)
  const generateSparklinePath = (managerId: number, width = 180, height = 26) => {
    const padX = 6;
    const padY = 4;
    const innerW = width - 2 * padX;
    const innerH = height - 2 * padY;

    const points: { x: number; y: number }[] = [];
    for (let gw = 0; gw <= safeMaxGw; gw++) {
      const data = trajectoryMap[managerId]?.[gw];
      if (data) {
        const x = padX + (gw / safeMaxGw) * innerW;
        const y =
          totalManagers <= 1
            ? padY + innerH / 2
            : padY + ((data.rank - 1) / (totalManagers - 1)) * innerH;
        points.push({ x, y });
      }
    }

    if (points.length === 0) return { line: "", area: "", head: { x: 0, y: 0 } };
    if (points.length === 1) {
      return {
        line: `M ${points[0].x} ${points[0].y}`,
        area: "",
        head: points[0],
      };
    }

    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      line += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const currentHead = points[Math.min(currentGw, points.length - 1)] || points[0];

    // Area path closing
    const lastPoint = points[points.length - 1];
    const area = `${line} L ${lastPoint.x} ${height} L ${points[0].x} ${height} Z`;

    return { line, area, head: currentHead };
  };

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
      {/* MOBILE VIEW: OPTION D - COMPACT TRAJECTORY MATRIX & SPARKLINE CARDS (<md) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-2.5">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{currentGw === 0 ? "Pre-Season Baseline" : `GW ${currentGw} Trajectory Matrix`}</span>
          </div>
          <span className="text-slate-400">Tap card to expand</span>
        </div>

        {/* Manager Rows with Sparklines */}
        <div className="space-y-2">
          {currentLeaderboard.map((item) => {
            const isFocused = activeFocusId === item.managerId;
            const isDimmed = activeFocusId !== null && !isFocused;
            const isExpanded = expandedManagerId === item.managerId;
            const isFirst = item.rank === 1;
            const sparkline = generateSparklinePath(item.managerId, 160, 24);

            return (
              <div
                key={`matrix-card-${item.managerId}`}
                style={{
                  borderColor: isFocused ? item.color : undefined,
                  boxShadow: isFocused ? `0 0 16px ${item.color}35` : undefined,
                }}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isFocused
                    ? "bg-slate-900/95 text-white"
                    : isDimmed
                    ? "bg-slate-950/40 border-slate-900/60 opacity-30 text-slate-500"
                    : isFirst
                    ? "bg-slate-950/90 border-emerald-500/30 text-slate-200 hover:border-emerald-500/60"
                    : "bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700"
                }`}
              >
                {/* Main Card Header / Row */}
                <div
                  onClick={() => {
                    setExpandedManagerId(isExpanded ? null : item.managerId);
                    setSelectedManagerId(
                      selectedManagerId === item.managerId ? null : item.managerId
                    );
                  }}
                  className="p-3 cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Rank + Dot + Manager Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${
                          isFirst
                            ? "bg-emerald-400/20 text-emerald-400 shadow-sm"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        #{item.rank}
                      </span>
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="truncate min-w-0">
                        <span className="block text-xs font-extrabold truncate text-white">
                          {item.playerName}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">
                          {item.teamName}
                        </span>
                      </div>
                    </div>

                    {/* Right: Scores + Rank Delta */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs font-black text-emerald-400">
                          {item.cumNet} pts
                        </span>
                        {currentGw > 0 && (
                          <span
                            className={`text-[10px] font-bold px-1 rounded ${
                              item.rankDelta > 0
                                ? "bg-emerald-500/15 text-emerald-400"
                                : item.rankDelta < 0
                                ? "bg-rose-500/15 text-rose-400"
                                : "bg-slate-800 text-slate-400"
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
                      <span className="text-[10px] text-slate-400">
                        {currentGw === 0 ? "Pre-Season" : `GW: +${item.points} pts`}
                      </span>
                    </div>
                  </div>

                  {/* Sparkline & Form Dots Row */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-3">
                    {/* Inline Sparkline */}
                    <div className="w-[160px] h-[24px] relative shrink-0">
                      <svg
                        viewBox="0 0 160 24"
                        className="w-full h-full overflow-visible"
                      >
                        <defs>
                          <linearGradient
                            id={`grad-${item.managerId}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={item.color}
                              stopOpacity="0.3"
                            />
                            <stop
                              offset="100%"
                              stopColor={item.color}
                              stopOpacity="0.0"
                            />
                          </linearGradient>
                        </defs>

                        {/* Background guide lines for #1 and #8 */}
                        <line
                          x1="6"
                          y1="4"
                          x2="154"
                          y2="4"
                          stroke="rgba(0, 255, 135, 0.15)"
                          strokeDasharray="2 2"
                        />
                        <line
                          x1="6"
                          y1="20"
                          x2="154"
                          y2="20"
                          stroke="rgba(51, 65, 85, 0.2)"
                          strokeDasharray="2 2"
                        />

                        {/* Gradient Area Fill */}
                        {sparkline.area && (
                          <path
                            d={sparkline.area}
                            fill={`url(#grad-${item.managerId})`}
                          />
                        )}

                        {/* Ghost Full Path */}
                        <path
                          d={sparkline.line}
                          fill="none"
                          stroke={item.color}
                          strokeWidth="1"
                          opacity="0.25"
                          strokeDasharray="2 2"
                        />

                        {/* Active Drawing Line */}
                        <path
                          d={sparkline.line}
                          pathLength={1000}
                          strokeDasharray={1000}
                          strokeDashoffset={strokeOffset}
                          fill="none"
                          stroke={item.color}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transition: `stroke-dashoffset ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
                          }}
                        />

                        {/* Active Head Dot */}
                        <circle
                          cx={sparkline.head.x}
                          cy={sparkline.head.y}
                          r="3"
                          fill={item.color}
                          stroke="#070A12"
                          strokeWidth="1.5"
                          style={{
                            transition: `all ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
                          }}
                        />
                      </svg>
                    </div>

                    {/* Gameweek Rank Breadcrumb Badges */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {gameweeks.map((gw) => {
                        const gwData = trajectoryMap[item.managerId]?.[gw];
                        if (!gwData) return null;
                        const isCurrent = gw === currentGw;

                        return (
                          <span
                            key={`form-${item.managerId}-gw-${gw}`}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isCurrent
                                ? "bg-emerald-400 text-slate-950 font-black shadow-sm"
                                : gw < currentGw
                                ? "bg-slate-800 text-slate-300"
                                : "bg-slate-900/50 text-slate-600 border border-slate-800"
                            }`}
                          >
                            {gw === 0 ? "S" : `G${gw}`}:#{gwData.rank}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 bg-slate-900/40 text-xs">
                    <div className="grid grid-cols-3 gap-2 text-center py-2">
                      <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">
                          Best Rank
                        </span>
                        <span className="font-extrabold text-emerald-400">
                          #{item.highestRank}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">
                          Lowest Rank
                        </span>
                        <span className="font-extrabold text-rose-400">
                          #{item.lowestRank}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">
                          Best GW Score
                        </span>
                        <span className="font-extrabold text-white">
                          {item.bestGwScore} pts
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>
                        Net change since Start:{" "}
                        <strong
                          className={
                            item.totalDelta > 0
                              ? "text-emerald-400"
                              : item.totalDelta < 0
                              ? "text-rose-400"
                              : "text-slate-300"
                          }
                        >
                          {item.totalDelta > 0
                            ? `+${item.totalDelta} ranks`
                            : item.totalDelta < 0
                            ? `${item.totalDelta} ranks`
                            : "0 ranks"}
                        </strong>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedManagerId(
                            selectedManagerId === item.managerId ? null : item.managerId
                          );
                        }}
                        style={{ color: item.color }}
                        className="font-bold underline cursor-pointer"
                      >
                        {selectedManagerId === item.managerId ? "Unfocus" : "Spotlight"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
