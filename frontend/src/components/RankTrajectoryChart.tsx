"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
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

// Smooth cubic bezier easing for organic motion
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const RankTrajectoryChart: React.FC<RankTrajectoryChartProps> = ({
  profiles,
  currentGw,
  maxGw,
  transitionDuration = "2000ms",
}) => {
  const [hoveredManagerId, setHoveredManagerId] = useState<number | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smooth Parametric Animation State
  const [animProgress, setAnimProgress] = useState(1);
  const [animFromGw, setAnimFromGw] = useState(currentGw);
  const [animToGw, setAnimToGw] = useState(currentGw);
  const prevGwRef = useRef(currentGw);

  useEffect(() => {
    if (prevGwRef.current === currentGw) return;
    const from = prevGwRef.current;
    const to = currentGw;
    prevGwRef.current = currentGw;

    setAnimFromGw(from);
    setAnimToGw(to);
    setAnimProgress(0);

    const durationMs = parseInt(transitionDuration) || 1600;
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(1, elapsed / durationMs);
      const eased = easeInOutCubic(rawProgress);

      setAnimProgress(eased);

      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setAnimProgress(1);
        setAnimFromGw(to);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentGw, transitionDuration]);

  if (!profiles || profiles.length === 0) return null;

  const totalManagers = profiles.length;
  const safeMaxGw = Math.max(maxGw, 1);
  const gameweeks = Array.from({ length: safeMaxGw + 1 }, (_, i) => i); // [0, 1, 2, ..., safeMaxGw]

  // Continuous floating gameweek progress
  const currentGwFloat = animFromGw + (animToGw - animFromGw) * animProgress;

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

  // Standings for current gameweek (for dropdown ordering)
  const currentLeaderboard = profiles
    .map((p, idx) => {
      const activeGwRound = Math.round(currentGwFloat);
      const data = trajectoryMap[p.id]?.[activeGwRound];
      const rank = data?.rank || idx + 1;
      const points = data?.points || 0;
      const cumNet = data?.cumNet || 0;
      const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];

      return {
        managerId: p.id,
        playerName: p.player_name || "Manager",
        teamName: p.entry_name || "Squad",
        rank,
        points,
        cumNet,
        color,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  const selectedManager = profiles.find((p) => p.id === selectedManagerId);
  const selectedIdx = profiles.findIndex((p) => p.id === selectedManagerId);
  const selectedColor = selectedIdx >= 0 ? TRAIL_COLORS[selectedIdx % TRAIL_COLORS.length] : null;
  const selectedRank = selectedManagerId
    ? trajectoryMap[selectedManagerId]?.[Math.round(currentGwFloat)]?.rank || 1
    : null;

  // =========================================================
  // MOBILE: VERTICALLY LONGER SMOOTH ROLLING HORIZON ENGINE
  // =========================================================
  const mSvgWidth = 380;
  const mSvgHeight = Math.max(380, totalManagers * 50 + 40); // Vertically longer (~440px)
  const mPadding = { top: 32, right: 16, bottom: 42, left: 46 };
  const mGraphHeight = mSvgHeight - mPadding.top - mPadding.bottom;
  const mGwStepWidth = 95; // Spacious 95px per gameweek

  const getMobileX = (gw: number) => {
    return mPadding.left + gw * mGwStepWidth;
  };

  const getMobileY = (rank: number) => {
    if (totalManagers <= 1) return mPadding.top + mGraphHeight / 2;
    return mPadding.top + ((rank - 1) / (totalManagers - 1)) * mGraphHeight;
  };

  // Parametric position calculation for Mobile (Dot follows exact Hermite S-Curve)
  const getMobileCurrentPos = (managerId: number) => {
    const k = Math.floor(currentGwFloat);
    const f = currentGwFloat - k;

    const rankK = trajectoryMap[managerId]?.[k]?.rank || 1;
    const xK = getMobileX(k);
    const yK = getMobileY(rankK);

    if (f <= 0.0001 || k >= safeMaxGw) {
      return { x: xK, y: yK, rank: rankK };
    }

    const nextGw = Math.min(safeMaxGw, k + 1);
    const rankNext = trajectoryMap[managerId]?.[nextGw]?.rank || rankK;
    const xNext = getMobileX(nextGw);
    const yNext = getMobileY(rankNext);

    const smoothF = 3 * f * f - 2 * f * f * f;
    const curX = xK + (xNext - xK) * f;
    const curY = yK + (yNext - yK) * smoothF;
    const curRank = f < 0.5 ? rankK : rankNext;

    return { x: curX, y: curY, rank: curRank };
  };

  // Generate exact active path up to current live position for mobile
  const generateMobileActivePath = (managerId: number) => {
    const k = Math.floor(currentGwFloat);
    const f = currentGwFloat - k;

    const points: { x: number; y: number }[] = [];
    for (let gw = 0; gw <= k; gw++) {
      const data = trajectoryMap[managerId]?.[gw];
      if (data) {
        points.push({ x: getMobileX(gw), y: getMobileY(data.rank) });
      }
    }

    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    if (f > 0.0001 && k < safeMaxGw) {
      const pLast = points[points.length - 1];
      const curPos = getMobileCurrentPos(managerId);
      const cx = (pLast.x + curPos.x) / 2;
      path += ` C ${cx} ${pLast.y}, ${cx} ${curPos.y}, ${curPos.x} ${curPos.y}`;
    }

    return path;
  };

  // Generate full season path for ghost guideline on mobile
  const generateMobileFullPath = (managerId: number) => {
    const points: { x: number; y: number }[] = [];
    for (let gw = 0; gw <= safeMaxGw; gw++) {
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

  // Continuous slide offset calculation:
  // Keeps the active dots and player name labels smoothly positioned on the right of the screen
  const pillWidth = 110;
  const activeDotX = getMobileX(currentGwFloat);
  const activeRightEdge = activeDotX + pillWidth + 14;
  const mobileViewportRight = mSvgWidth - mPadding.right;
  const mobileSlideOffset = Math.max(0, activeRightEdge - mobileViewportRight);

  // ==========================================
  // DESKTOP HORIZONTAL BUMP CHART COORDINATES
  // ==========================================
  const dSvgWidth = 860;
  const dSvgHeight = Math.max(320, totalManagers * 44 + 40);
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

  // Parametric position calculation for Desktop
  const getDesktopCurrentPos = (managerId: number) => {
    const k = Math.floor(currentGwFloat);
    const f = currentGwFloat - k;

    const rankK = trajectoryMap[managerId]?.[k]?.rank || 1;
    const xK = getDesktopX(k);
    const yK = getDesktopY(rankK);

    if (f <= 0.0001 || k >= safeMaxGw) {
      return { x: xK, y: yK, rank: rankK };
    }

    const nextGw = Math.min(safeMaxGw, k + 1);
    const rankNext = trajectoryMap[managerId]?.[nextGw]?.rank || rankK;
    const xNext = getDesktopX(nextGw);
    const yNext = getDesktopY(rankNext);

    const smoothF = 3 * f * f - 2 * f * f * f;
    const curX = xK + (xNext - xK) * f;
    const curY = yK + (yNext - yK) * smoothF;
    const curRank = f < 0.5 ? rankK : rankNext;

    return { x: curX, y: curY, rank: curRank };
  };

  // Generate exact active path up to current live position for desktop
  const generateDesktopActivePath = (managerId: number) => {
    const k = Math.floor(currentGwFloat);
    const f = currentGwFloat - k;

    const points: { x: number; y: number }[] = [];
    for (let gw = 0; gw <= k; gw++) {
      const data = trajectoryMap[managerId]?.[gw];
      if (data) {
        points.push({ x: getDesktopX(gw), y: getDesktopY(data.rank) });
      }
    }

    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    if (f > 0.0001 && k < safeMaxGw) {
      const pLast = points[points.length - 1];
      const curPos = getDesktopCurrentPos(managerId);
      const cx = (pLast.x + curPos.x) / 2;
      path += ` C ${cx} ${pLast.y}, ${cx} ${curPos.y}, ${curPos.x} ${curPos.y}`;
    }

    return path;
  };

  // Generate full season path for ghost guideline on desktop
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

  return (
    <div className="w-full space-y-3">
      {/* ========================================================= */}
      {/* MANAGER SELECTION SPOTLIGHT CAPSULE                       */}
      {/* ========================================================= */}
      <div className="flex items-center justify-end px-1 pb-0.5">
        {/* Custom Glassmorphic Spotlight Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              borderColor: selectedColor ? selectedColor : undefined,
              boxShadow: selectedColor ? `0 0 14px ${selectedColor}35` : undefined,
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
              selectedManager
                ? "bg-slate-900 text-white"
                : "bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            {selectedManager ? (
              <>
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedColor || "#00FF87" }}
                />
                <span className="truncate max-w-[110px] sm:max-w-[140px]">
                  {selectedManager.player_name}
                </span>
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${selectedColor}25`,
                    color: selectedColor || "#00FF87",
                  }}
                >
                  #{selectedRank}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedManagerId(null);
                    setHoveredManagerId(null);
                    setTooltip(null);
                  }}
                  className="hover:bg-slate-800 p-0.5 rounded text-slate-400 hover:text-white transition-colors"
                  title="Clear Spotlight"
                >
                  <X className="w-3 h-3" />
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>All Managers ({totalManagers})</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>

          {/* Floating Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl z-50 p-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800/80 mb-1">
                <span>Spotlight Manager</span>
                <span className="text-[9px] text-emerald-400 lowercase font-normal">tap to highlight</span>
              </div>

              {/* Show All / Reset Option */}
              <button
                onClick={() => {
                  setSelectedManagerId(null);
                  setHoveredManagerId(null);
                  setTooltip(null);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedManagerId === null
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Show All Managers</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">8 lines</span>
              </button>

              <div className="my-1 border-t border-slate-800/60" />

              {/* Managers in Active Rank Order */}
              <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                {currentLeaderboard.map((item) => {
                  const isSelected = selectedManagerId === item.managerId;
                  const isFirst = item.rank === 1;

                  return (
                    <button
                      key={`drop-${item.managerId}`}
                      onClick={() => {
                        setSelectedManagerId(item.managerId);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-slate-800 text-white"
                          : "text-slate-300 hover:bg-slate-900/80 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                            isFirst
                              ? "bg-emerald-400/20 text-emerald-400"
                              : "bg-slate-850 text-slate-300 border border-slate-800"
                          }`}
                        >
                          #{item.rank}
                        </span>
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="truncate text-left">
                          <span className="block truncate leading-tight">
                            {item.playerName}
                          </span>
                          <span className="block text-[9px] text-slate-400 truncate font-normal">
                            {item.teamName}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-black text-emerald-400 shrink-0 ml-2">
                        {item.cumNet} pts
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW: VERTICALLY LONGER SMOOTH ROLLING HORIZON WITH NAMES (< md)   */}
      {/* ========================================================================= */}
      <div className="block md:hidden">
        {/* Rolling Horizon Canvas */}
        <div className="relative w-full rounded-2xl bg-slate-950/60 border border-slate-800/80 p-2 overflow-hidden shadow-xl">
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

              {/* Clip path for the rolling graph area so lines don't bleed over the left fixed axis */}
              <clipPath id="m-graph-clip">
                <rect
                  x={mPadding.left}
                  y={0}
                  width={mSvgWidth - mPadding.left}
                  height={mSvgHeight}
                />
              </clipPath>
            </defs>

            {/* STATIC FIXED HORIZONTAL GRID LINES (#1 to #8) */}
            {Array.from({ length: totalManagers }, (_, i) => i + 1).map((rank) => {
              const y = getMobileY(rank);
              const isFirst = rank === 1;

              return (
                <g key={`m-fixed-rank-${rank}`}>
                  <line
                    x1={mPadding.left}
                    y1={y}
                    x2={mSvgWidth}
                    y2={y}
                    stroke={isFirst ? "rgba(0, 255, 135, 0.2)" : "rgba(51, 65, 85, 0.2)"}
                    strokeDasharray="4 4"
                    strokeWidth={isFirst ? "1.5" : "1"}
                  />
                  {/* Fixed left rank badge */}
                  <text
                    x={mPadding.left - 10}
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

            {/* SMOOTH CONTINUOUS SLIDING GRAPH GROUP (CLIPPED CLEANLY) */}
            <g clipPath="url(#m-graph-clip)">
              <g
                style={{
                  transform: `translateX(-${mobileSlideOffset}px)`,
                }}
              >
                {/* Vertical Gameweek Lines & Labels */}
                {gameweeks.map((gw) => {
                  const x = getMobileX(gw);
                  const isCurrent = Math.round(currentGwFloat) === gw;

                  return (
                    <g key={`m-gw-col-${gw}`}>
                      <line
                        x1={x}
                        y1={mPadding.top}
                        x2={x}
                        y2={mPadding.top + mGraphHeight}
                        stroke={isCurrent ? "rgba(0, 255, 135, 0.35)" : "rgba(51, 65, 85, 0.2)"}
                        strokeWidth={isCurrent ? "1.5" : "1"}
                        strokeDasharray={isCurrent ? undefined : "3 3"}
                      />
                      <text
                        x={x}
                        y={mPadding.top + mGraphHeight + 20}
                        textAnchor="middle"
                        fill={isCurrent ? "#00FF87" : "#94A3B8"}
                        fontSize="11"
                        fontWeight={isCurrent ? "900" : "700"}
                      >
                        {gw === 0 ? "Start" : `GW${gw}`}
                      </text>
                    </g>
                  );
                })}

                {/* Manager Trajectory Curves */}
                {profiles.map((p, idx) => {
                  const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
                  const isFocused = activeFocusId === p.id;
                  const isDimmed = activeFocusId !== null && !isFocused;
                  const fullPath = generateMobileFullPath(p.id);
                  const activePath = generateMobileActivePath(p.id);
                  const currentPos = getMobileCurrentPos(p.id);
                  const currentData = trajectoryMap[p.id]?.[Math.round(currentGwFloat)];

                  return (
                    <g key={`m-path-group-${p.id}`} opacity={isDimmed ? 0.12 : 1}>
                      {/* Ghost full season path (Faint reference track) */}
                      <path
                        d={fullPath}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity="0.16"
                      />

                      {/* Glowing focus aura (100% Locked to moving dot) */}
                      {isFocused && (
                        <path
                          d={activePath}
                          fill="none"
                          stroke={color}
                          strokeWidth="9"
                          opacity="0.35"
                          filter="url(#m-trail-glow)"
                        />
                      )}

                      {/* Continuous active trail line (Created dynamically as dot glides) */}
                      <path
                        d={activePath}
                        fill="none"
                        stroke={color}
                        strokeWidth={isFocused ? "4.5" : "2.5"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transition: "stroke-width 300ms ease",
                        }}
                      />

                      {/* Breadcrumbs */}
                      {gameweeks.map((gw) => {
                        const data = trajectoryMap[p.id]?.[gw];
                        if (!data) return null;

                        const cx = getMobileX(gw);
                        const cy = getMobileY(data.rank);
                        const isPast = gw <= currentGwFloat;

                        return (
                          <g
                            key={`m-bc-${p.id}-gw-${gw}`}
                            className="cursor-pointer"
                            style={{
                              opacity: isPast ? (isFocused ? 0.9 : 0.45) : 0,
                              transition: "opacity 300ms ease",
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
                                x: cx - mobileSlideOffset,
                                y: cy,
                                color,
                              });
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

                      {/* BIG SLIDING HEAD DOT & PLAYER NAME PILL (Locked along exact S-curve) */}
                      <g
                        key={`m-head-${p.id}`}
                        style={{
                          transform: `translate(${currentPos.x}px, ${currentPos.y}px)`,
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
                              gameweek: Math.round(currentGwFloat),
                              rank: currentPos.rank,
                              prevRank:
                                Math.round(currentGwFloat) > 0
                                  ? trajectoryMap[p.id]?.[Math.round(currentGwFloat) - 1]?.rank
                                  : undefined,
                              gwPoints: currentData.points,
                              cumNet: currentData.cumNet,
                              x: currentPos.x - mobileSlideOffset,
                              y: currentPos.y,
                              color,
                            });
                          }
                        }}
                      >
                        {/* Outer Glow Ring */}
                        <circle
                          cx={0}
                          cy={0}
                          r={isFocused ? 13 : 10}
                          fill={color}
                          opacity="0.25"
                          filter="url(#m-head-glow)"
                        />
                        <circle
                          cx={0}
                          cy={0}
                          r={isFocused ? 10 : 8}
                          fill="none"
                          stroke={color}
                          strokeWidth={isFocused ? "2.5" : "1.8"}
                          opacity="0.85"
                        />
                        <circle
                          cx={0}
                          cy={0}
                          r={isFocused ? 6.5 : 5}
                          fill={color}
                          stroke="#070A12"
                          strokeWidth="2"
                        />

                        {/* Player Name Pill on the Right of the Dot */}
                        {currentData && (
                          <g transform="translate(12, 0)">
                            <rect
                              x={-2}
                              y={-10}
                              width={pillWidth}
                              height="20"
                              rx="6"
                              fill="#070A12"
                              stroke={isFocused ? color : "rgba(51, 65, 85, 0.6)"}
                              strokeWidth={isFocused ? "1.5" : "1"}
                            />
                            <circle
                              cx={5}
                              cy={0}
                              r="3"
                              fill={color}
                            />
                            <text
                              x={13}
                              y={3.5}
                              fill={isFocused ? "#FFFFFF" : color}
                              fontSize="9.5"
                              fontWeight="800"
                              className="truncate"
                            >
                              {p.player_name.split(" ")[0]} (#{currentPos.rank})
                            </text>
                          </g>
                        )}
                      </g>
                    </g>
                  );
                })}
              </g>
            </g>
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
            const isCurrent = Math.round(currentGwFloat) === gw;

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
            const activePath = generateDesktopActivePath(p.id);
            const currentPos = getDesktopCurrentPos(p.id);
            const currentData = trajectoryMap[p.id]?.[Math.round(currentGwFloat)];

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
                    d={activePath}
                    fill="none"
                    stroke={color}
                    strokeWidth="9"
                    opacity="0.35"
                    filter="url(#d-trail-glow)"
                  />
                )}

                {/* Continuous Drawing Active Trail Line */}
                <path
                  d={activePath}
                  fill="none"
                  stroke={color}
                  strokeWidth={isFocused ? "4.5" : "2.5"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transition: "stroke-width 300ms ease",
                  }}
                />

                {/* Milestone Breadcrumb Dots Left Behind */}
                {gameweeks.map((gw) => {
                  const data = trajectoryMap[p.id]?.[gw];
                  if (!data) return null;

                  const cx = getDesktopX(gw);
                  const cy = getDesktopY(data.rank);
                  const isPast = gw <= currentGwFloat;

                  return (
                    <g
                      key={`d-breadcrumb-${p.id}-gw-${gw}`}
                      className="cursor-pointer"
                      style={{
                        opacity: isPast ? (isFocused ? 0.9 : 0.45) : 0,
                        transition: "opacity 300ms ease",
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
                    transform: `translate(${currentPos.x}px, ${currentPos.y}px)`,
                    zIndex: isFocused ? 50 : 20,
                  }}
                  className="cursor-pointer select-none"
                  onMouseEnter={() => {
                    setHoveredManagerId(p.id);
                    if (currentData) {
                      setTooltip({
                        managerName: p.player_name || "Manager",
                        teamName: p.entry_name || "Squad",
                        gameweek: Math.round(currentGwFloat),
                        rank: currentPos.rank,
                        prevRank:
                          Math.round(currentGwFloat) > 0
                            ? trajectoryMap[p.id]?.[Math.round(currentGwFloat) - 1]?.rank
                            : undefined,
                        gwPoints: currentData.points,
                        cumNet: currentData.cumNet,
                        x: currentPos.x,
                        y: currentPos.y,
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
                        width={130}
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
                        {p.player_name.split(" ")[0]} (#{currentPos.rank})
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
