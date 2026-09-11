"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { StandingsEntry } from "../lib/types";

interface StandingsTableProps {
  standings: StandingsEntry[];
  selectedGw: number;
  onSelectManager: (managerId: number) => void;
}

type SortField = "rank" | "net_points" | "rolling_3gw_average" | "gameweek_net_points" | "total_hits_cost";

export const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  selectedGw,
  onSelectManager,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "rank" || field === "total_hits_cost");
    }
  };

  const filteredStandings = standings
    .filter(
      (s) =>
        s.manager_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.team_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let valA = a[sortField] || 0;
      let valB = b[sortField] || 0;
      return sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });

  const getFormColor = (form: number) => {
    if (form >= 75) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    if (form >= 60) return "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
    if (form >= 45) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-rose-500/20 text-rose-400 border-rose-500/40";
  };

  const getChipLabel = (chip: string | null) => {
    if (!chip) return null;
    const map: Record<string, { name: string; color: string }> = {
      wildcard: { name: "Wildcard", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
      freehit: { name: "Free Hit", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
      bboost: { name: "Bench Boost", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
      "3xc": { name: "Triple Captain", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
    };
    return map[chip] || { name: chip, color: "bg-slate-700 text-slate-300 border-slate-600" };
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Table Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>Mini-League Rival Standings</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold border border-slate-700">
              GW {selectedGw} Final
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked by true Net Points (transfer hit penalties deducted)
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search manager or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th
                onClick={() => handleSort("rank")}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Rank</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4">Manager / Squad</th>
              <th
                onClick={() => handleSort("net_points")}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Net Points</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("total_hits_cost")}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors hidden md:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>Total Hits</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("rolling_3gw_average")}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>3-GW Form</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("gameweek_net_points")}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>GW{selectedGw} Net</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4 hidden lg:table-cell">Overall Rank</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredStandings.map((manager, idx) => {
              const chip = getChipLabel(manager.active_chip);
              const isLeader = manager.rank === 1;

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
                  {/* Rank & Movement */}
                  <td className="py-3.5 px-4 font-bold tabular-nums">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                          isLeader
                            ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                            : manager.rank <= 3
                            ? "bg-slate-800 text-slate-200 border border-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        {manager.rank}
                      </span>
                      {manager.rank_delta > 0 ? (
                        <span className="flex items-center text-[11px] font-bold text-emerald-400">
                          <TrendingUp className="h-3 w-3 mr-0.5" />
                          {manager.rank_delta}
                        </span>
                      ) : manager.rank_delta < 0 ? (
                        <span className="flex items-center text-[11px] font-bold text-rose-400">
                          <TrendingDown className="h-3 w-3 mr-0.5" />
                          {Math.abs(manager.rank_delta)}
                        </span>
                      ) : (
                        <span className="flex items-center text-[11px] text-slate-600">
                          <Minus className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Manager & Team */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white hover:text-emerald-400 transition-colors">
                      {manager.manager_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium truncate max-w-[180px] sm:max-w-none">
                      {manager.team_name}
                    </div>
                  </td>

                  {/* Net Points (Hero) */}
                  <td className="py-3.5 px-4 font-black tabular-nums text-sm text-emerald-400">
                    {manager.net_points}
                    <span className="text-[10px] text-slate-500 font-normal ml-1 hidden sm:inline">
                      ({manager.total_points} gross)
                    </span>
                  </td>

                  {/* Total Hits */}
                  <td className="py-3.5 px-4 tabular-nums hidden md:table-cell">
                    {manager.total_hits_cost > 0 ? (
                      <span className="font-bold text-rose-400 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        -{manager.total_hits_cost} pts
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">0 pts</span>
                    )}
                  </td>

                  {/* 3-GW Form Badge */}
                  <td className="py-3.5 px-4 tabular-nums">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getFormColor(
                        manager.rolling_3gw_average
                      )}`}
                    >
                      {manager.rolling_3gw_average.toFixed(1)}
                    </span>
                  </td>

                  {/* GW Net Score & Active Chip */}
                  <td className="py-3.5 px-4 tabular-nums font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span>{manager.gameweek_net_points} pts</span>
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

                  {/* Overall Rank */}
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
