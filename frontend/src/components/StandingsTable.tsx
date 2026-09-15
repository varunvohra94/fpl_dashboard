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
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-white">
              Mini-League Rival Standings
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
              {viewScope === "season"
                ? `Overall Season Standings`
                : `Gameweek ${activeDisplayGw} Specific`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewScope === "season"
              ? "Cumulative season leaderboard strictly within this mini-league (Net Points after hit deductions)"
              : `Single gameweek rank within this mini-league for GW ${activeDisplayGw}`}
          </p>
        </div>

        {/* View Scope Dropdown & Search Bar */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Unified Scope Dropdown Menu */}
          <div className="relative">
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
              className="appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm hover:border-slate-700 transition-colors"
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
          <div className="relative flex-1 sm:w-48 lg:w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search manager / squad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th
                onClick={() => handleSort("league_rank")}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>League Rank</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3.5 px-4">Manager / Team</th>

              {/* Main Net Points Column */}
              <th
                onClick={() =>
                  handleSort(
                    viewScope === "season" ? "total_net_points" : "net_points"
                  )
                }
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>
                    {viewScope === "season"
                      ? "Season Net Points"
                      : `GW${activeDisplayGw} Net Score`}
                  </span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* Transfer Hits */}
              <th
                onClick={() => handleSort("event_transfers_cost")}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors hidden md:table-cell"
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
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>3-GW Form</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* Secondary Points Column */}
              <th
                onClick={() =>
                  handleSort(
                    viewScope === "season" ? "net_points" : "total_net_points"
                  )
                }
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors hidden sm:table-cell"
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
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors hidden lg:table-cell"
              >
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-slate-500" />
                  <span>Global Rank</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              {/* Active Chip Badge */}
              <th className="py-3.5 px-4 text-center hidden sm:table-cell">
                Chip
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 tabular-nums">
            {filteredStandings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
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
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-transform ${
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
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Manager & Team Name */}
                    <td className="py-3.5 px-4">
                      <div className="truncate max-w-[140px] sm:max-w-[200px]">
                        <span className="font-extrabold text-white text-xs sm:text-sm block truncate group-hover:text-emerald-400">
                          {m.player_name || "Manager"}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate font-medium">
                          {m.entry_name || "Squad"}
                        </span>
                      </div>
                    </td>

                    {/* Primary Net Points Score (Cumulative or Single GW) */}
                    <td className="py-3.5 px-4 font-black text-sm text-emerald-400">
                      {viewScope === "season"
                        ? `${m.total_net_points ?? m.total_points ?? 0} pts`
                        : `${m.net_points ?? m.points ?? 0} pts`}
                    </td>

                    {/* Transfer Hits Deduction */}
                    <td className="py-3.5 px-4 hidden md:table-cell">
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
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center text-[11px] font-black px-2 py-0.5 rounded-lg border ${getFormColor(
                          m.rolling_3_avg
                        )}`}
                      >
                        {m.rolling_3_avg !== null && m.rolling_3_avg !== undefined
                          ? m.rolling_3_avg.toFixed(1)
                          : "-"}
                      </span>
                    </td>

                    {/* Secondary Net Points */}
                    <td className="py-3.5 px-4 text-slate-300 font-bold hidden sm:table-cell">
                      {viewScope === "season"
                        ? `${m.net_points ?? m.points ?? 0} pts`
                        : `${m.total_net_points ?? m.total_points ?? 0} pts`}
                    </td>

                    {/* Global FPL Overall Rank */}
                    <td className="py-3.5 px-4 text-slate-400 text-xs hidden lg:table-cell font-medium">
                      {m.overall_rank ? `#${m.overall_rank.toLocaleString()}` : "-"}
                    </td>

                    {/* Active Chip Badge */}
                    <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                      {chipInfo ? (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${chipInfo.color}`}
                        >
                          {chipInfo.name}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs">-</span>
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
