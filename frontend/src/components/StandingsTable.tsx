"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowUpDown,
  Search,
  Trophy,
  Calendar,
  ChevronDown,
  Globe,
} from "lucide-react";
import { StandingsEntry } from "../lib/types";

interface StandingsTableProps {
  standings: StandingsEntry[];
  selectedGw: number;
  maxAvailableGw: number;
  onSelectGw?: (gw: number) => void;
  onSelectManager: (managerId: number) => void;
}

type ViewScope = "season" | "gameweek";

type SortField =
  | "league_rank"
  | "total_net_points"
  | "net_points"
  | "rolling_3_avg"
  | "event_transfers_cost"
  | "overall_rank";

export const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  selectedGw,
  maxAvailableGw,
  onSelectGw,
  onSelectManager,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewScope, setViewScope] = useState<ViewScope>("season");
  const [sortField, setSortField] = useState<SortField>("league_rank");
  const [sortAsc, setSortAsc] = useState(true);

  // 1. Calculate Mini-League ranks based on viewScope
  const rankedData = [...(standings || [])]
    .sort((a, b) => {
      if (viewScope === "season") {
        return (b.total_net_points ?? 0) - (a.total_net_points ?? 0);
      }
      return (b.net_points ?? 0) - (a.net_points ?? 0);
    })
    .map((item, idx) => ({
      ...item,
      league_rank: idx + 1,
    }));

  // 2. Handle user custom column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "league_rank" || field === "overall_rank");
    }
  };

  // 3. Filter by search query
  const filteredStandings = rankedData
    .filter((s) => {
      const pName = (s.player_name || "").toLowerCase();
      const eName = (s.entry_name || "").toLowerCase();
      const query = searchTerm.toLowerCase();
      return pName.includes(query) || eName.includes(query);
    })
    .sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      return sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });

  const getFormColor = (form: number | null) => {
    if (form === null || form === undefined)
      return "bg-slate-800 text-slate-400 border-slate-700";
    if (form >= 75)
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    if (form >= 60)
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
    if (form >= 45)
      return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-rose-500/20 text-rose-400 border-rose-500/40";
  };

  const getChipLabel = (chip: string | null) => {
    if (!chip) return null;
    const map: Record<string, { name: string; color: string }> = {
      wildcard: {
        name: "Wildcard",
        color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      },
      freehit: {
        name: "Free Hit",
        color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
      },
      bboost: {
        name: "Bench Boost",
        color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      },
      "3xc": {
        name: "Triple Captain",
        color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      },
    };
    return (
      map[chip] || {
        name: chip,
        color: "bg-slate-700 text-slate-300 border-slate-600",
      }
    );
  };

  const activeDisplayGw = selectedGw > 0 ? selectedGw : maxAvailableGw;

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Table Header Controls */}
      <div className="p-3 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-sm sm:text-lg font-black text-white tracking-tight">
            FPL Showdown
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            {viewScope === "season"
              ? "Net Points (After Hits)"
              : `Gameweek ${activeDisplayGw} Scores`}
          </p>
        </div>

        {/* View Scope Dropdown & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Unified Scope Dropdown Menu */}
          <div className="relative w-full sm:w-auto">
            <select
              value={viewScope === "season" ? "season" : String(activeDisplayGw)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "season") {
                  setViewScope("season");
                  setSortField("league_rank");
                  setSortAsc(true);
                  onSelectGw?.(0);
                } else {
                  const gwNum = Number(val);
                  setViewScope("gameweek");
                  setSortField("league_rank");
                  setSortAsc(true);
                  onSelectGw?.(gwNum);
                }
              }}
              aria-label="Select Standings Scope"
              className="w-full sm:w-auto appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold py-1.5 sm:py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm hover:border-slate-700 transition-colors"
            >
              <option value="season">🏆 Overall Season</option>
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

          {/* Search Bar */}
          <div className="relative flex-1 sm:w-60 lg:w-64 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search manager or squad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto sm:overflow-x-visible flex-1">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th
                onClick={() => handleSort("league_rank")}
                className="py-2 px-2 sm:py-2.5 sm:px-3.5 cursor-pointer hover:text-white transition-colors w-9 sm:w-14 text-center sm:text-left"
              >
                <div className="flex items-center justify-center sm:justify-start gap-1">
                  <span>#</span>
                  <ArrowUpDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </div>
              </th>
              <th className="py-2 px-2 sm:py-2.5 sm:px-3.5">Manager / Team</th>

              {/* Main Net Points Column */}
              <th
                onClick={() =>
                  handleSort(
                    viewScope === "season" ? "total_net_points" : "net_points"
                  )
                }
                className="py-2 px-2 sm:py-2.5 sm:px-3.5 cursor-pointer hover:text-white transition-colors text-right sm:text-left"
              >
                <div className="flex items-center justify-end sm:justify-start gap-1">
                  <span>
                    {viewScope === "season" ? "Net Pts" : "GW Net"}
                  </span>
                  <ArrowUpDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </div>
              </th>

              {/* Transfer Hits */}
              <th
                onClick={() => handleSort("event_transfers_cost")}
                className="py-2.5 px-3.5 cursor-pointer hover:text-white transition-colors hidden md:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>
                    {viewScope === "season"
                      ? "GW Hits"
                      : `GW${activeDisplayGw} Hits`}
                  </span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* Rolling 3-GW Form */}
              <th
                onClick={() => handleSort("rolling_3_avg")}
                className="py-2 px-2 sm:py-2.5 sm:px-3.5 cursor-pointer hover:text-white transition-colors text-right sm:text-left"
              >
                <div className="flex items-center justify-end sm:justify-start gap-1">
                  <span>Form</span>
                  <ArrowUpDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </div>
              </th>

              {/* Secondary Points Column */}
              <th
                onClick={() =>
                  handleSort(
                    viewScope === "season" ? "net_points" : "total_net_points"
                  )
                }
                className="py-2.5 px-3.5 cursor-pointer hover:text-white transition-colors hidden sm:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>
                    {viewScope === "season"
                      ? `Latest GW Net`
                      : "Season Total Net"}
                  </span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* Global FPL Rank */}
              <th
                onClick={() => handleSort("overall_rank")}
                className="py-2.5 px-3.5 cursor-pointer hover:text-white transition-colors hidden lg:table-cell"
              >
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-slate-500" />
                  <span>Global Rank</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* Active Chip Badge Header */}
              <th className="py-2.5 px-3.5 text-center w-32 min-w-[120px] hidden sm:table-cell">
                Chip
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 tabular-nums">
            {filteredStandings.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  No rivals found matching your search.
                </td>
              </tr>
            ) : (
              filteredStandings.map((m) => {
                const isLeader = m.league_rank === 1;
                const chipInfo = getChipLabel(m.chip_used);

                return (
                  <tr
                    key={m.manager_id}
                    onClick={() => onSelectManager(m.manager_id)}
                    className={`cursor-pointer transition-colors ${
                      isLeader
                        ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Mini-League Sequential Rank (1..N) */}
                    <td className="py-2 px-2 sm:py-2.5 sm:px-3.5">
                      <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2">
                        <span
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black transition-transform ${
                            isLeader
                              ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-105"
                              : m.league_rank <= 3
                              ? "bg-slate-800 text-slate-200 border border-slate-700 font-bold"
                              : "text-slate-400 font-semibold"
                          }`}
                        >
                          {m.league_rank}
                        </span>
                        {isLeader && (
                          <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400 shrink-0 hidden sm:block" />
                        )}
                      </div>
                    </td>

                    {/* Manager & Team Name */}
                    <td className="py-2 px-2 sm:py-2.5 sm:px-3.5">
                      <div className="max-w-[130px] xs:max-w-[160px] sm:max-w-[200px]">
                        <span className="font-extrabold text-white text-xs sm:text-sm block truncate group-hover:text-emerald-400">
                          {m.player_name || "Manager"}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate font-medium">
                            {m.entry_name || "Squad"}
                          </span>
                          {/* Mobile-only micro chip badge */}
                          {chipInfo && (
                            <span
                              className={`inline-flex sm:hidden text-[9px] font-bold px-1.5 py-0.2 rounded-full border uppercase tracking-wider shrink-0 leading-tight ${chipInfo.color}`}
                            >
                              {chipInfo.name}
                            </span>
                          )}
                          {/* Mobile-only hits indicator */}
                          {(m.event_transfers_cost ?? 0) > 0 && (
                            <span className="inline-flex md:hidden text-[9px] font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                              -{m.event_transfers_cost}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Primary Net Points Score (Cumulative or Single GW) */}
                    <td className="py-2 px-2 sm:py-2.5 sm:px-3.5 font-black text-xs sm:text-sm text-emerald-400 text-right sm:text-left whitespace-nowrap">
                      {viewScope === "season"
                        ? `${m.total_net_points ?? m.total_points ?? 0} pts`
                        : `${m.net_points ?? m.points ?? 0} pts`}
                    </td>

                    {/* Transfer Hits Deduction */}
                    <td className="py-2.5 px-3.5 hidden md:table-cell">
                      {(m.event_transfers_cost ?? 0) > 0 ? (
                        <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          -{m.event_transfers_cost} pts
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs font-medium">
                          0
                        </span>
                      )}
                    </td>

                    {/* Rolling 3-GW Form Indicator */}
                    <td className="py-2 px-2 sm:py-2.5 sm:px-3.5 text-right sm:text-left">
                      <span
                        className={`inline-flex items-center text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md sm:rounded-lg border ${getFormColor(
                          m.rolling_3_avg
                        )}`}
                      >
                        {m.rolling_3_avg !== null && m.rolling_3_avg !== undefined
                          ? m.rolling_3_avg.toFixed(1)
                          : "-"}
                      </span>
                    </td>

                    {/* Secondary Net Points */}
                    <td className="py-2.5 px-3.5 text-slate-300 font-bold hidden sm:table-cell">
                      {viewScope === "season"
                        ? `${m.net_points ?? m.points ?? 0} pts`
                        : `${m.total_net_points ?? m.total_points ?? 0} pts`}
                    </td>

                    {/* Global FPL Overall Rank */}
                    <td className="py-2.5 px-3.5 text-slate-400 text-xs hidden lg:table-cell font-medium">
                      {m.overall_rank ? `#${m.overall_rank.toLocaleString()}` : "-"}
                    </td>

                    {/* Active Chip Badge Cell */}
                    <td className="py-2.5 px-3.5 text-center w-32 min-w-[120px] whitespace-nowrap hidden sm:table-cell">
                      {chipInfo ? (
                        <span
                          className={`inline-flex items-center justify-center text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wide whitespace-nowrap shadow-sm leading-none ${chipInfo.color}`}
                        >
                          {chipInfo.name}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs font-semibold">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
