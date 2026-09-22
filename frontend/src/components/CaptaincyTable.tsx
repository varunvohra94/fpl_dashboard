"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Crown,
  Flame,
  Snowflake,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Percent,
} from "lucide-react";
import { LeagueCaptaincyResponse, ManagerCaptainStats } from "../lib/types";
import { fetchCaptaincyStats } from "../lib/api";

interface CaptaincyTableProps {
  maxAvailableGw: number;
  leagueId?: number;
  onSelectManager?: (managerId: number) => void;
}

export const CaptaincyTable: React.FC<CaptaincyTableProps> = ({
  maxAvailableGw,
  leagueId,
  onSelectManager,
}) => {
  const [selectedGw, setSelectedGw] = useState<number>(0); // 0 = Overall Season
  const [data, setData] = useState<LeagueCaptaincyResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchCaptaincyStats(leagueId, selectedGw);
      setData(res);
    } catch (err) {
      console.error("Failed to load captaincy stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [leagueId, selectedGw]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-sm font-black text-amber-300">🥇 1</span>;
    if (rank === 2) return <span className="text-sm font-black text-slate-300">🥈 2</span>;
    if (rank === 3) return <span className="text-sm font-black text-amber-600">🥉 3</span>;
    return <span className="text-xs font-bold text-slate-500">#{rank}</span>;
  };

  const isOverall = selectedGw === 0;

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/30 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Crown className="h-3.5 w-3.5" />
              Captaincy Intelligence
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
            Best Captain Picker
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isOverall
              ? "Managers ranked by highest cumulative captain score across the season"
              : `Captain returns and armband impact for Gameweek ${selectedGw}`}
          </p>
        </div>

        {/* Gameweek Dropdown */}
        <div className="relative shrink-0 w-full sm:w-auto">
          <select
            value={selectedGw}
            onChange={(e) => setSelectedGw(Number(e.target.value))}
            aria-label="Filter Gameweek for Captaincy Stats"
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

      {/* Table Body - Horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />
            <span>Calculating captain performance...</span>
          </div>
        ) : !data || data.captains.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No captain data available {selectedGw > 0 ? `for Gameweek ${selectedGw}` : ""}.
          </div>
        ) : (
          <table className="w-full min-w-[660px] text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider font-bold">
                <th className="py-3 px-3 sm:px-4 w-12 text-center shrink-0">Rank</th>
                <th className="py-3 px-3 sm:px-4 min-w-[170px]">Manager & Squad</th>
                <th className="py-3 px-3 sm:px-4 text-right min-w-[90px] whitespace-nowrap">
                  Captain Points
                </th>
                {isOverall && (
                  <th className="py-3 px-3 sm:px-4 text-right min-w-[75px] whitespace-nowrap">
                    Avg / GW
                  </th>
                )}
                {isOverall && (
                  <th className="py-3 px-3 sm:px-4 min-w-[160px] whitespace-nowrap">
                    Hauls / Blanks
                  </th>
                )}
                <th className="py-3 px-3 sm:px-4 min-w-[190px]">
                  {isOverall ? "Latest Captain Choice" : `GW${selectedGw} Captain Choice`}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.captains.map((mgr) => {
                const isLeader = mgr.rank === 1;
                const pick = mgr.current_pick;

                return (
                  <tr
                    key={mgr.manager_id}
                    className={`transition-colors hover:bg-slate-850/40 ${
                      isLeader ? "bg-amber-950/20" : ""
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
                        className="cursor-pointer hover:text-amber-300 transition-colors min-w-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white truncate text-xs sm:text-sm">
                            {mgr.player_name}
                          </span>
                          {isLeader && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              Captain King 👑
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate font-medium">
                          {mgr.entry_name}
                        </span>
                      </div>
                    </td>

                    {/* Captain Multiplier Points */}
                    <td className="py-3.5 px-3 sm:px-4 text-right min-w-[90px] whitespace-nowrap">
                      <span className="text-sm sm:text-base font-black text-amber-300 tracking-tight">
                        {mgr.total_captain_points}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        pts ({mgr.total_raw_points} raw)
                      </span>
                    </td>

                    {/* Avg per GW */}
                    {isOverall && (
                      <td className="py-3.5 px-3 sm:px-4 text-right min-w-[75px] whitespace-nowrap font-mono font-bold text-slate-300 text-xs">
                        {mgr.average_captain_points.toFixed(1)}
                      </td>
                    )}

                    {/* Hauls & Blanks */}
                    {isOverall && (
                      <td className="py-3.5 px-3 sm:px-4 min-w-[160px] whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold text-[11px]">
                            <Flame className="h-3 w-3 text-emerald-400" />
                            {mgr.hauls_count} hauls
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold text-[11px]">
                            <Snowflake className="h-3 w-3 text-rose-400" />
                            {mgr.blanks_count} blanks
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Captain Player Pick Badge */}
                    <td className="py-3.5 px-3 sm:px-4 min-w-[190px]">
                      {pick ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-850 border border-slate-700/80 shadow-sm">
                          <span className="font-bold text-white text-xs">
                            {pick.player_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            ({pick.team_name})
                          </span>
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                            {pick.total_points}pts ({pick.multiplier}x)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No pick recorded</span>
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

