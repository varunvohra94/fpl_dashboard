"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers,
  ArrowRightLeft,
} from "lucide-react";
import { TransferItem, ManagerTransferGroup } from "../lib/types";

interface TransferFeedProps {
  transfers: TransferItem[];
  selectedGw: number;
  onSelectManager?: (managerId: number) => void;
}

export const TransferFeed: React.FC<TransferFeedProps> = ({
  transfers,
  selectedGw,
  onSelectManager,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "regular" | "overhaul">("all");
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  // Group transfers by manager
  const groupedByManager: Record<number, ManagerTransferGroup> = {};
  for (const t of transfers) {
    if (!groupedByManager[t.manager_id]) {
      groupedByManager[t.manager_id] = {
        managerId: t.manager_id,
        managerName: t.manager_name,
        teamName: t.team_name,
        gameweek: t.gameweek,
        chipUsed: null,
        transfersCount: 0,
        totalCost: 0,
        timestamp: t.timestamp,
        transfers: [],
      };
    }
    groupedByManager[t.manager_id].transfers.push(t);
    groupedByManager[t.manager_id].transfersCount++;
  }

  const groups = Object.values(groupedByManager);

  const toggleExpand = (managerId: number) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [managerId]: !prev[managerId],
    }));
  };

  const filteredGroups = groups.filter((g) => {
    if (filterMode === "regular") return g.transfersCount <= 2;
    if (filterMode === "overhaul") return g.transfersCount >= 3;
    return true;
  });

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md p-4 sm:p-5 shadow-2xl flex flex-col h-full">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Rival Transfer Feed</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                {transfers.length} Move{transfers.length === 1 ? "" : "s"}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Gameweek {selectedGw} market activity across rivals
            </p>
          </div>
        </div>

        {/* Filter Toggles */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              filterMode === "all"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({groups.length})
          </button>
          <button
            onClick={() => setFilterMode("regular")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              filterMode === "regular"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            1-2 Moves
          </button>
          <button
            onClick={() => setFilterMode("overhaul")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              filterMode === "overhaul"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Overhauls (3+)
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="mt-4 space-y-3 overflow-y-auto max-h-[580px] pr-1">
        {filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No transfers recorded for Gameweek {selectedGw} matching this filter.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isOverhaul = group.transfersCount >= 3;
            const isExpanded = !!expandedGroups[group.managerId];

            return (
              <div
                key={group.managerId}
                className={`rounded-xl border transition-all ${
                  isOverhaul
                    ? "bg-gradient-to-br from-purple-950/30 via-slate-900/90 to-slate-900/60 border-purple-500/30 hover:border-purple-400/50"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                } p-3.5`}
              >
                {/* Manager Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    onClick={() => onSelectManager?.(group.managerId)}
                    className="cursor-pointer hover:text-emerald-400 transition-colors"
                  >
                    <span className="text-xs font-bold text-white block">
                      {group.managerName}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {group.teamName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isOverhaul && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                        <Layers className="h-2.5 w-2.5" />
                        Squad Overhaul ({group.transfersCount})
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-medium">
                      {new Date(group.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Transfer List or Collapsible Drawer */}
                {!isOverhaul ? (
                  // Regular 1-2 Transfers List
                  <div className="space-y-2 mt-2">
                    {group.transfers.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800/60"
                      >
                        {/* Player In (Green) */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                            IN
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-slate-200 block truncate">
                              {t.element_in_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {t.element_in_team} • £{(t.element_in_cost / 10).toFixed(1)}m
                            </span>
                          </div>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-slate-600 shrink-0 mx-2" />

                        {/* Player Out (Red) */}
                        <div className="flex items-center gap-1.5 min-w-0 text-right justify-end">
                          <div className="truncate">
                            <span className="font-bold text-slate-300 block truncate">
                              {t.element_out_name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {t.element_out_team} • £{(t.element_out_cost / 10).toFixed(1)}m
                            </span>
                          </div>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                            OUT
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Overhaul Accordion
                  <div className="mt-2">
                    {/* Compact Preview (First 2 moves) */}
                    <div className="space-y-1.5">
                      {(isExpanded ? group.transfers : group.transfers.slice(0, 2)).map(
                        (t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800/60"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                IN
                              </span>
                              <span className="font-bold text-slate-200 truncate">
                                {t.element_in_name} ({t.element_in_team})
                              </span>
                            </div>
                            <ArrowRight className="h-3 w-3 text-slate-600 shrink-0 mx-1" />
                            <div className="flex items-center gap-1.5 truncate text-right">
                              <span className="font-bold text-slate-300 truncate">
                                {t.element_out_name} ({t.element_out_team})
                              </span>
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                                OUT
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Accordion Toggle Button */}
                    <button
                      onClick={() => toggleExpand(group.managerId)}
                      className="mt-2 w-full py-1.5 px-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          <span>Collapse squad overhaul</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          <span>
                            View all {group.transfersCount} transfers ({group.transfersCount - 2} more)
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
