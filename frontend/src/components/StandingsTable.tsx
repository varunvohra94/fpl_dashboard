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
                ? `Cumulative Season (GW 1-${selectedGw})`
                : `Gameweek ${selectedGw} Specific`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewScope === "season"
              ? "Cumulative season leaderboard strictly within this mini-league (Net Points after hit deductions)"
              : `Single gameweek rank within this mini-league for GW ${selectedGw}`}
          </p>
        </div>

        {/* View Scope & GW Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Scope Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => {
                setViewScope("season");
                setSortField("league_rank");
                setSortAsc(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewScope === "season"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Overall Season</span>
            </button>

            <button
              onClick={() => {
                setViewScope("gameweek");
                setSortField("league_rank");
                setSortAsc(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewScope === "gameweek"
                  ? "bg-cyan-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>GW {selectedGw} Only</span>
            </button>
          </div>

          {/* GW Dropdown */}
          {onSelectGw && (
            <div className="relative">
              <select
                value={selectedGw}
                onChange={(e) => onSelectGw(Number(e.target.value))}
                className="appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold py-1.5 pl-3 pr-8 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {Array.from(
                  { length: Math.max(maxAvailableGw, 1) },
                  (_, i) => i + 1
                ).map((gw) => (
                  <option key={gw} value={gw}>
                    Gameweek {gw}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>
          )}

          {/* Search Bar */}
          <div className="relative flex-1 sm:w-48 lg:w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
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
                    {viewScope === "season" ? "Season Net Points" : `GW${selectedGw} Net Score`}
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
                    {viewScope === "season" ? "GW Hits" : `GW${selectedGw} Hits`}
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
                    {viewScope === "season" ? `GW${selectedGw} Net` : "Season Total Net"}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredStandings.map((manager, idx) => {
              const chip = getChipLabel(manager.chip_used);
              const isLeader = manager.league_rank === 1;

              return (
                <tr
                  key={manager.manager_id}
                  onClick={() => onSelectManager(manager.manager_id)}
                  className={`cursor-pointer transition-colors ${
                    isLeader
                      ? "bg-emerald-950/20 hover:bg-emerald-950/30"
                      : idx % 2 === 0
                      ? "bg-transparent hover:bg-slate-800/40"
                      : "bg-slate-950/20 hover:bg-slate-800/40"
                  }`}
                >
                  {/* Leftmost Mini-League Rank strictly (1 to N) */}
                  <td className="py-3.5 px-4 font-bold tabular-nums">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                          isLeader
                            ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/30"
                            : manager.league_rank <= 3
                            ? "bg-slate-800 text-slate-200 border border-slate-700"
                            : "text-slate-400 font-bold"
                        }`}
                      >
                        {manager.league_rank}
                      </span>
                    </div>
                  </td>

                  {/* Manager & Team Name */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white hover:text-emerald-400 transition-colors">
                      {manager.player_name || "Manager"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium truncate max-w-[180px] sm:max-w-none">
                      {manager.entry_name || "Squad"}
                    </div>
                  </td>

                  {/* Primary Hero Points (Season Total or GW Net) */}
                  <td className="py-3.5 px-4 font-black tabular-nums text-sm text-emerald-400">
                    {viewScope === "season" ? (
                      <>
                        <span>{manager.total_net_points} pts</span>
                        <span className="text-[10px] text-slate-500 font-normal ml-1.5 hidden sm:inline">
                          ({manager.total_points} gross)
                        </span>
                      </>
                    ) : (
                      <>
                        <span>{manager.net_points} pts</span>
                        <span className="text-[10px] text-slate-500 font-normal ml-1.5 hidden sm:inline">
                          ({manager.points} gross)
                        </span>
                      </>
                    )}
                  </td>

                  {/* Transfer Hits */}
                  <td className="py-3.5 px-4 tabular-nums hidden md:table-cell">
                    {manager.event_transfers_cost > 0 ? (
                      <span className="font-bold text-rose-400 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        -{manager.event_transfers_cost} pts
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">0 pts</span>
                    )}
                  </td>

                  {/* 3-GW Form Badge */}
                  <td className="py-3.5 px-4 tabular-nums">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getFormColor(
                        manager.rolling_3_avg
                      )}`}
                    >
                      {manager.rolling_3_avg !== null && manager.rolling_3_avg !== undefined
                        ? manager.rolling_3_avg.toFixed(1)
                        : "—"}
                    </span>
                  </td>

                  {/* Secondary Points Column */}
                  <td className="py-3.5 px-4 tabular-nums font-semibold text-slate-200 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <span>
                        {viewScope === "season"
                          ? `${manager.net_points} pts`
                          : `${manager.total_net_points} pts`}
                      </span>
                      {chip && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${chip.color}`}
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          {chip.name}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Global FPL Rank */}
                  <td className="py-3.5 px-4 tabular-nums text-slate-400 font-medium hidden lg:table-cell">
                    {manager.overall_rank
                      ? manager.overall_rank.toLocaleString()
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
