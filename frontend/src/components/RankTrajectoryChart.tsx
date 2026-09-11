"use client";

import React, { useState } from "react";
import { TrendingUp } from "lucide-react";
import { ManagerProfileResponse } from "../lib/types";

interface RankTrajectoryChartProps {
  profiles: ManagerProfileResponse[];
  currentGw: number;
  maxGw: number;
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
}) => {
  const [hoveredManagerId, setHoveredManagerId] = useState<number | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (!profiles || profiles.length === 0) return null;

  const totalManagers = profiles.length;
  const gameweeks = Array.from(
    { length: Math.max(maxGw, 1) },
    (_, i) => i + 1
  );

  // 1. Calculate cumulative net points and mini-league rank for EVERY manager at EVERY gameweek
  // Output: trajectoryMap[managerId] = { [gw]: { rank: number, points: number, cumNet: number } }
  const trajectoryMap: Record<
    number,
    Record<number, { rank: number; points: number; cumNet: number }>
  > = {};

  // Initialize map
  profiles.forEach((p) => {
    trajectoryMap[p.id] = {};
  });

  // For each gameweek from 1 to maxGw, compute cumulative scores and sort
  for (let gw = 1; gw <= maxGw; gw++) {
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

    // Assign rank 1 to N
    gwRankings.forEach((item, idx) => {
      trajectoryMap[item.managerId][gw] = {
        rank: idx + 1,
        points: item.gwPoints,
        cumNet: item.cumNet,
      };
    });
  }

  // 2. SVG Dimensions and Coordinates
  const svgWidth = 860;
  const svgHeight = Math.max(300, totalManagers * 40 + 40);
  const padding = { top: 35, right: 150, bottom: 45, left: 50 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Coordinate mappers
  const getX = (gw: number) => {
    if (maxGw <= 1) return padding.left + graphWidth / 2;
    return padding.left + ((gw - 1) / (maxGw - 1)) * graphWidth;
  };

  const getY = (rank: number) => {
    if (totalManagers <= 1) return padding.top + graphHeight / 2;
    return padding.top + ((rank - 1) / (totalManagers - 1)) * graphHeight;
  };

  // Generate smooth cubic bezier SVG path for a manager up to a specified end gameweek
  const generateSmoothPath = (managerId: number, endGw: number) => {
    const points: { x: number; y: number }[] = [];
    for (let gw = 1; gw <= endGw; gw++) {
      const data = trajectoryMap[managerId]?.[gw];
      if (data) {
        points.push({ x: getX(gw), y: getY(data.rank) });
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

  const activeFocusId = selectedManagerId || hoveredManagerId;

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl p-5 sm:p-7 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Gameweek Rank Trail Graph
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              Live Trail to GW {currentGw}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
            Season Trajectory & Position Paths
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Hover over any gameweek node or manager line to reveal positions, rank switches, and scores
          </p>
        </div>

        {/* Instructions / Reset Focus */}
        {activeFocusId && (
          <button
            onClick={() => {
              setSelectedManagerId(null);
              setHoveredManagerId(null);
              setTooltip(null);
            }}
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 self-start sm:self-auto transition-colors cursor-pointer shadow-sm"
          >
            Clear Manager Filter
          </button>
        )}
      </div>

      {/* Interactive Manager Legend / Filter Pills */}
      <div className="flex flex-wrap gap-2 my-4">
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
              <span className="truncate max-w-[110px]">{p.player_name}</span>
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

      {/* SVG Bump Chart Canvas */}
      <div className="relative overflow-x-auto w-full mt-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[720px] select-none"
        >
          {/* Filters */}
          <defs>
            <filter id="trail-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal Grid Lines (Ranks 1..N) */}
          {Array.from({ length: totalManagers }, (_, i) => i + 1).map((rank) => {
            const y = getY(rank);
            const isFirst = rank === 1;
            return (
              <g key={`grid-rank-${rank}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + graphWidth}
                  y2={y}
                  stroke={isFirst ? "rgba(0, 255, 135, 0.2)" : "rgba(51, 65, 85, 0.25)"}
                  strokeDasharray="4 4"
                  strokeWidth={isFirst ? "1.5" : "1"}
                />
                <text
                  x={padding.left - 12}
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
            const x = getX(gw);
            const isCurrent = gw === currentGw;

            return (
              <g key={`grid-gw-${gw}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + graphHeight}
                  stroke={isCurrent ? "rgba(0, 255, 135, 0.35)" : "rgba(51, 65, 85, 0.2)"}
                  strokeWidth={isCurrent ? "2" : "1"}
                  strokeDasharray={isCurrent ? undefined : "3 3"}
                />
                <text
                  x={x}
                  y={padding.top + graphHeight + 22}
                  textAnchor="middle"
                  fill={isCurrent ? "#00FF87" : "#94A3B8"}
                  fontSize="11"
                  fontWeight={isCurrent ? "900" : "700"}
                >
                  GW {gw}
                </text>
              </g>
            );
          })}

          {/* Active Gameweek Vertical Scrubber Highlighter Band */}
          <line
            x1={getX(currentGw)}
            y1={padding.top - 8}
            x2={getX(currentGw)}
            y2={padding.top + graphHeight + 8}
            stroke="#00FF87"
            strokeWidth="2"
            strokeDasharray="4 2"
            opacity="0.7"
          />

          {/* Manager Trajectory Paths */}
          {profiles.map((p, idx) => {
            const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
            const isFocused = activeFocusId === p.id;
            const isDimmed = activeFocusId !== null && !isFocused;

            const activePathData = generateSmoothPath(p.id, currentGw);
            const fullPathData = generateSmoothPath(p.id, maxGw);

            return (
              <g key={`path-${p.id}`} opacity={isDimmed ? 0.12 : 1}>
                {/* Faint Background Full-Season Trail (if currentGw < maxGw) */}
                {currentGw < maxGw && (
                  <path
                    d={fullPathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.22"
                  />
                )}

                {/* Glowing Aura when focused */}
                {isFocused && (
                  <path
                    d={activePathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="9"
                    opacity="0.35"
                    filter="url(#trail-glow)"
                    className="transition-all duration-300"
                  />
                )}

                {/* Active Trajectory Trail up to currentGw */}
                <path
                  d={activePathData}
                  fill="none"
                  stroke={color}
                  strokeWidth={isFocused ? "4.5" : "2.5"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {/* Milestone Nodes at every Gameweek along the trail */}
                {gameweeks
                  .filter((gw) => gw <= currentGw)
                  .map((gw) => {
                    const data = trajectoryMap[p.id]?.[gw];
                    if (!data) return null;

                    const cx = getX(gw);
                    const cy = getY(data.rank);
                    const isLatest = gw === currentGw;
                    const prevRank =
                      gw > 1 ? trajectoryMap[p.id]?.[gw - 1]?.rank : undefined;

                    return (
                      <g
                        key={`node-${p.id}-gw-${gw}`}
                        className="cursor-pointer"
                        onMouseEnter={() => {
                          setHoveredManagerId(p.id);
                          setTooltip({
                            managerName: p.player_name || "Manager",
                            teamName: p.entry_name || "Squad",
                            gameweek: gw,
                            rank: data.rank,
                            prevRank,
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
                        onClick={() =>
                          setSelectedManagerId(
                            selectedManagerId === p.id ? null : p.id
                          )
                        }
                      >
                        {/* Static Subtle Halo on Active/Current Gameweek Node (No blinking) */}
                        {isLatest && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="8.5"
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            opacity="0.6"
                          />
                        )}

                        {/* Node Body */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isFocused || isLatest ? "5.5" : "4"}
                          fill={isFocused || isLatest ? color : "#0B0F19"}
                          stroke={color}
                          strokeWidth="2.5"
                          className="transition-transform duration-200 hover:scale-125"
                        />

                        {/* Rank Number above circle if focused */}
                        {isFocused && (
                          <text
                            x={cx}
                            y={cy - 9}
                            textAnchor="middle"
                            fill={color}
                            fontSize="9"
                            fontWeight="900"
                          >
                            #{data.rank}
                          </text>
                        )}
                      </g>
                    );
                  })}

                {/* Rightmost Trail Label Pill at currentGw */}
                {(() => {
                  const data = trajectoryMap[p.id]?.[currentGw];
                  if (!data) return null;
                  const lx = getX(currentGw) + 12;
                  const ly = getY(data.rank);

                  return (
                    <g
                      key={`label-${p.id}`}
                      className="cursor-pointer select-none"
                      onClick={() =>
                        setSelectedManagerId(
                          selectedManagerId === p.id ? null : p.id
                        )
                      }
                      onMouseEnter={() => setHoveredManagerId(p.id)}
                      onMouseLeave={() => setHoveredManagerId(null)}
                    >
                      <rect
                        x={lx - 4}
                        y={ly - 10}
                        width="132"
                        height="20"
                        rx="6"
                        fill="#070A12"
                        stroke={isFocused ? color : "rgba(51, 65, 85, 0.5)"}
                        strokeWidth={isFocused ? "1.5" : "1"}
                      />
                      <circle
                        cx={lx + 4}
                        cy={ly}
                        r="3.5"
                        fill={color}
                      />
                      <text
                        x={lx + 13}
                        y={ly + 3.5}
                        fill={isFocused ? "#FFFFFF" : color}
                        fontSize="10"
                        fontWeight="800"
                        className="truncate"
                      >
                        {p.player_name.split(" ")[0]} (#{data.rank})
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>

        {/* Floating Glassmorphic Interactive Tooltip */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: `${(tooltip.x / svgWidth) * 100}%`,
              top: `${(tooltip.y / svgHeight) * 100}%`,
              transform:
                tooltip.x > svgWidth * 0.65
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
                  GW {tooltip.gameweek} Rank
                </span>
                <span
                  className="font-black text-sm"
                  style={{ color: tooltip.color }}
                >
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
                  GW {tooltip.gameweek} Net Score
                </span>
                <span className="font-black text-white text-sm">
                  {tooltip.gwPoints}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">
                    pts
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Cumulative Total</span>
              <span className="font-black text-emerald-400">
                {tooltip.cumNet} pts
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
