"use client";

import React, { useState } from "react";
import { PlayerPerformanceItem } from "../lib/types";
import { ArrowUpDown, Search } from "lucide-react";

interface TopPlayersTableProps {
  players: PlayerPerformanceItem[];
  selectedGw: number;
}

type SortField =
  | "total_points"
  | "goals_scored"
  | "assists"
  | "expected_goals"
  | "expected_assists"
  | "bonus"
  | "ict_index"
  | "now_cost";

export const TopPlayersTable: React.FC<TopPlayersTableProps> = ({
  players,
  selectedGw,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("total_points");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for stats
    }
  };

  const filteredPlayers = (players || [])
    .filter((p) => {
      const wName = (p.web_name || "").toLowerCase();
      const tName = (p.team_short_name || "").toLowerCase();
      const query = searchTerm.toLowerCase();
      const matchesSearch = wName.includes(query) || tName.includes(query);
      const matchesPos = posFilter === "ALL" || p.position === posFilter;
      return matchesSearch && matchesPos;
    })
    .sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      return sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });

  const getPosBadgeColor = (pos: string) => {
    switch (pos) {
      case "GKP":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "DEF":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "MID":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "FWD":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      default:
        return "bg-slate-700 text-slate-300 border-slate-600";
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>Matchday Premier League Performers</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
              GW {selectedGw} Stats
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Player performance and underlying expected metrics (xG, xA, ICT)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Position Filters */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
              <button
                key={pos}
                onClick={() => setPosFilter(pos)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  posFilter === pos
                    ? "bg-slate-800 text-emerald-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search player / club..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4">Club</th>
              <th className="py-3 px-4">Pos</th>
              <th
                onClick={() => handleSort("now_cost")}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Price</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-4">Mins</th>
              <th
                onClick={() => handleSort("total_points")}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Points</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("goals_scored")}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Goals</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("assists")}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Assists</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("expected_goals")}
                className="py-3 px-4 cursor-pointer hover:text-white hidden sm:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>xG</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("expected_assists")}
                className="py-3 px-4 cursor-pointer hover:text-white hidden sm:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>xA</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("bonus")}
                className="py-3 px-4 cursor-pointer hover:text-white hidden md:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>Bonus</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("ict_index")}
                className="py-3 px-4 cursor-pointer hover:text-white hidden lg:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>ICT</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 tabular-nums">
            {filteredPlayers.map((p, idx) => (
              <tr
                key={`${p.element_id}-${p.gameweek}`}
                className={idx % 2 === 0 ? "hover:bg-slate-800/40" : "bg-slate-950/20 hover:bg-slate-800/40"}
              >
                <td className="py-3 px-4 font-bold text-white">{p.web_name}</td>
                <td className="py-3 px-4 font-semibold text-slate-300">{p.team_short_name}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPosBadgeColor(
                      p.position
                    )}`}
                  >
                    {p.position}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">£{p.now_cost?.toFixed(1)}m</td>
                <td className="py-3 px-4 text-slate-400">{p.minutes}'</td>
                <td className="py-3 px-4 font-black text-emerald-400 text-sm">{p.total_points} pts</td>
                <td className="py-3 px-4 font-bold text-slate-200">{p.goals_scored}</td>
                <td className="py-3 px-4 font-bold text-slate-200">{p.assists}</td>
                <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                  {p.expected_goals !== null && p.expected_goals !== undefined
                    ? p.expected_goals.toFixed(2)
                    : "0.00"}
                </td>
                <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                  {p.expected_assists !== null && p.expected_assists !== undefined
                    ? p.expected_assists.toFixed(2)
                    : "0.00"}
                </td>
                <td className="py-3 px-4 text-amber-400 font-bold hidden md:table-cell">{p.bonus}</td>
                <td className="py-3 px-4 text-purple-400 font-bold hidden lg:table-cell">
                  {p.ict_index !== null && p.ict_index !== undefined ? p.ict_index.toFixed(1) : "0.0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
