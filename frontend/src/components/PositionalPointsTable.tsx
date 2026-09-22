"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Zap,
  Target,
  HandMetal,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Info,
  X,
} from "lucide-react";
import { LeaguePositionalStatsResponse, ManagerPositionBreakdown } from "../lib/types";
import { fetchPositionalStats } from "../lib/api";

interface PositionalPointsTableProps {
  maxAvailableGw: number;
  leagueId?: number;
  onSelectManager?: (managerId: number) => void;
}

type PositionType = "DEF" | "MID" | "FWD" | "GKP";

const POSITIONS: { id: PositionType; label: string; shortLabel: string; icon: React.FC<{ className?: string }>; color: string; bgBadge: string }[] = [
  {
    id: "GKP",
    label: "Goalkeepers",
    shortLabel: "GK",
    icon: HandMetal,
    color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/40",
    bgBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    id: "DEF",
    label: "Defenders",
    shortLabel: "DEF",
    icon: Shield,
    color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/40",
    bgBadge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    id: "MID",
    label: "Midfielders",
    shortLabel: "MID",
    icon: Zap,
    color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/40",
    bgBadge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    id: "FWD",
    label: "Forwards",
    shortLabel: "FWD",
    icon: Target,
    color: "from-rose-500/20 to-orange-500/10 text-rose-400 border-rose-500/40",
    bgBadge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },
];

export const PositionalPointsTable: React.FC<PositionalPointsTableProps> = ({
  maxAvailableGw,
  leagueId,
  onSelectManager,
}) => {
  const [selectedPosition, setSelectedPosition] = useState<PositionType>("DEF");
  const [selectedGw, setSelectedGw] = useState<number>(0); // 0 = Overall Season
  const [data, setData] = useState<LeaguePositionalStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNoteVisible, setIsNoteVisible] = useState<boolean>(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchPositionalStats(leagueId, selectedGw, selectedPosition);
      setData(res);
    } catch (err) {
      console.error("Failed to load positional stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [leagueId, selectedGw, selectedPosition]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const activePosMeta = POSITIONS.find((p) => p.id === selectedPosition) || POSITIONS[1];
  const IconComponent = activePosMeta.icon;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-sm font-black text-amber-300">🥇 1</span>;
    if (rank === 2) return <span className="text-sm font-black text-slate-300">🥈 2</span>;
    if (rank === 3) return <span className="text-sm font-black text-amber-600">🥉 3</span>;
    return <span className="text-xs font-bold text-slate-500">#{rank}</span>;
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${activePosMeta.bgBadge} uppercase tracking-wider flex items-center gap-1.5`}>
                <IconComponent className="h-3 w-3" />
                {activePosMeta.label}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
              Most Points from {activePosMeta.label}
            </h3>
          </div>

          {/* Gameweek Dropdown */}
          <div className="relative shrink-0 w-full sm:w-auto">
            <select
              value={selectedGw}
              onChange={(e) => setSelectedGw(Number(e.target.value))}
              aria-label="Filter Gameweek for Positional Stats"
              className="w-full sm:w-auto appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold py-1.5 sm:py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-cyan-500 cursor-pointer shadow-sm hover:border-slate-700 transition-colors"
            >
              <option value={0}>🏆 Overall Season</option>
              {Array.from(
                { length: Math.max(maxAvailableGw, 1) },
                (_, i) => maxAvailableGw - i
              ).map((gw) => (
                <option key={gw} value={gw}>
                  ⚽ Gameweek {gw} {gw === maxAvailableGw ? "(Latest)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Position Toggle Pills (4-column grid on mobile, inline on desktop) */}
        <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2">
          {POSITIONS.map((pos) => {
            const isSelected = selectedPosition === pos.id;
            const PosIcon = pos.icon;
            return (
              <button
                key={pos.id}
                onClick={() => setSelectedPosition(pos.id)}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? `bg-gradient-to-r ${pos.color} border shadow-sm`
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <PosIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">{pos.shortLabel}</span>
                <span className="hidden sm:inline">{pos.label}</span>
              </button>
            );
          })}
        </div>

        {/* Informational Note (Dismissable Bench Boost & Rules) */}
        {isNoteVisible && (
          <div className="flex items-start justify-between gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-slate-300 text-xs shadow-inner">
            <div className="flex items-start gap-2.5 min-w-0">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-slate-200">Calculation Note: </span>
                <span>
                  Points reflect active players contributing to the gameweek score (bench excluded, 1x captain points). If a <strong className="text-blue-300 font-semibold">Bench Boost</strong> is played, then players on the bench points count towards the score for the position.
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsNoteVisible(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-blue-500/20 transition-colors shrink-0 cursor-pointer"
              aria-label="Dismiss calculation note"
              title="Dismiss note"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Table Body - Horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-cyan-400 animate-spin" />
            <span>Calculating positional returns...</span>
          </div>
        ) : !data || data.managers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No positional data available {selectedGw > 0 ? `for Gameweek ${selectedGw}` : ""}.
          </div>
        ) : (
          <table className="w-full min-w-[700px] text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider font-bold">
                <th className="py-3 px-3 sm:px-4 w-12 text-center shrink-0">Rank</th>
                <th className="py-3 px-3 sm:px-4 min-w-[170px]">Manager & Squad</th>
                <th className="py-3 px-3 sm:px-4 text-right min-w-[90px] whitespace-nowrap">
                  {selectedPosition} Points
                </th>
                <th className="py-3 px-3 sm:px-4 text-right min-w-[110px] whitespace-nowrap">
                  Team Share
                </th>
                <th className="py-3 px-3 sm:px-4 min-w-[240px]">
                  Top Scoring {activePosMeta.label}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.managers.map((mgr) => {
                const isLeader = mgr.rank === 1;
                return (
                  <tr
                    key={mgr.manager_id}
                    className={`transition-colors hover:bg-slate-850/40 ${
                      isLeader ? "bg-slate-900/40" : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-3 sm:px-4 text-center shrink-0">
                      {getRankBadge(mgr.rank)}
                    </td>

                    {/* Manager & Squad */}
                    <td className="py-3.5 px-3 sm:px-4 min-w-[170px]">
                      <div
                        onClick={() => onSelectManager?.(mgr.manager_id)}
                        className="cursor-pointer hover:text-emerald-400 transition-colors min-w-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white truncate text-xs sm:text-sm">
                            {mgr.player_name}
                          </span>
                          {isLeader && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              #1 {selectedPosition}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate font-medium">
                          {mgr.entry_name}
                        </span>
                      </div>
                    </td>

                    {/* Positional Points Output */}
                    <td className="py-3.5 px-3 sm:px-4 text-right min-w-[90px] whitespace-nowrap">
                      <span className="text-sm sm:text-base font-black text-white tracking-tight">
                        {mgr.active_position_points}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        pts
                      </span>
                    </td>

                    {/* Team Share Progress Bar */}
                    <td className="py-3.5 px-3 sm:px-4 text-right min-w-[110px] whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-slate-300 text-xs">
                          {mgr.position_percentage.toFixed(1)}%
                        </span>
                        <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(mgr.position_percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Top Scoring Players */}
                    <td className="py-3.5 px-3 sm:px-4 min-w-[240px]">
                      {mgr.top_scorers && mgr.top_scorers.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {mgr.top_scorers.map((p) => (
                            <span
                              key={p.element_id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 flex items-center gap-1 shrink-0"
                            >
                              <span>{p.web_name}</span>
                              <span className="text-slate-400 font-normal">({p.team_name})</span>
                              <span className="text-emerald-400 font-bold font-mono">
                                {p.points}pts
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No points recorded</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

