"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  TransferItem,
  ManagerTransferGroup,
  ManagerProfileResponse,
} from "../lib/types";

interface TransferFeedProps {
  transfers: TransferItem[];
  profiles?: ManagerProfileResponse[];
  selectedGw: number;
  maxAvailableGw: number;
  onSelectGw?: (gw: number) => void;
  onSelectManager?: (managerId: number) => void;
}

export const TransferFeed: React.FC<TransferFeedProps> = ({
  transfers,
  profiles = [],
  selectedGw,
  maxAvailableGw,
  onSelectGw,
  onSelectManager,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Lookup map: (managerId_gw) -> { chip: string | null, hitsCost: number }
  const managerGwMeta = useMemo(() => {
    const map: Record<string, { chip: string | null; hitsCost: number }> = {};
    (profiles || []).forEach((p) => {
      // 1. From history
      (p.history || []).forEach((h) => {
        const key = `${p.id}_gw${h.gameweek}`;
        map[key] = {
          chip: h.chip_used || null,
          hitsCost: h.event_transfers_cost || 0,
        };
      });
      // 2. From chips_used array
      (p.chips_used || []).forEach((c) => {
        const key = `${p.id}_gw${c.gameweek}`;
        if (map[key]) {
          if (!map[key].chip && c.chip) {
            map[key].chip = c.chip;
          }
        } else {
          map[key] = {
            chip: c.chip || null,
            hitsCost: 0,
          };
        }
      });
    });
    return map;
  }, [profiles]);

  const getChipBadgeInfo = (chip: string | null) => {
    if (!chip) return null;
    const lower = chip.toLowerCase();
    if (lower === "wildcard" || lower === "wc") {
      return {
        label: "Wildcard",
        color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      };
    }
    if (lower === "freehit" || lower === "fh") {
      return {
        label: "Free Hit",
        color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
      };
    }
    if (lower === "bboost" || lower === "bb" || lower === "benchboost") {
      return {
        label: "Bench Boost",
        color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      };
    }
    if (lower === "3xc" || lower === "tc" || lower === "triplecaptain") {
      return {
        label: "Triple Captain",
        color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      };
    }
    return {
      label: chip.toUpperCase(),
      color: "bg-slate-700 text-slate-300 border-slate-600",
    };
  };

  // 1. Filter transfers based on selectedGw (0 = Overall Season)
  const activeTransfers =
    selectedGw > 0
      ? (transfers || []).filter((t) => t.gameweek === selectedGw)
      : transfers || [];

  // 2. Group transfers by manager & gameweek batch, ordered latest transfers first
  const groupedMap: Record<string, ManagerTransferGroup> = {};

  // Sort transfers latest first before grouping
  const sortedTransfers = [...activeTransfers].sort((a, b) => {
    const timeA = a.transfer_time ? new Date(a.transfer_time).getTime() : 0;
    const timeB = b.transfer_time ? new Date(b.transfer_time).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    return (b.gameweek || 0) - (a.gameweek || 0);
  });

  for (const t of sortedTransfers) {
    const groupKey = `${t.manager_id}_gw${t.gameweek}`;

    if (!groupedMap[groupKey]) {
      groupedMap[groupKey] = {
        managerId: t.manager_id,
        managerName: t.manager_name || "Manager",
        entryName: t.entry_name || "Squad",
        gameweek: t.gameweek,
        transfersCount: 0,
        timestamp: t.transfer_time || new Date().toISOString(),
        transfers: [],
      };
    }
    groupedMap[groupKey].transfers.push(t);
    groupedMap[groupKey].transfersCount++;
  }

  // Convert to array and sort groups by timestamp / gameweek descending
  const groups = Object.entries(groupedMap)
    .sort(([, a], [, b]) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.gameweek || 0) - (a.gameweek || 0);
    })
    .map(([key, group]) => ({ key, ...group }));

  const toggleExpand = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Header & Controls Bar */}
      <div className="p-3 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-sm sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>Rival Transfer Feed</span>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
              {activeTransfers.length} Move{activeTransfers.length === 1 ? "" : "s"}
            </span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            {selectedGw > 0
              ? `Gameweek ${selectedGw} Transfer Activity`
              : "Overall Season Activity (Latest First)"}
          </p>
        </div>

        {/* View Scope Dropdown Menu */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {onSelectGw && (
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedGw}
                onChange={(e) => onSelectGw(Number(e.target.value))}
                aria-label="Select Gameweek for Transfer Feed"
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
          )}
        </div>
      </div>

      {/* Feed List */}
      <div className="p-3 sm:p-5 space-y-2.5 overflow-y-auto flex-1 min-h-0 max-h-[520px]">
        {groups.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No transfers recorded {selectedGw > 0 ? `for Gameweek ${selectedGw}` : ""}.
          </div>
        ) : (
          groups.map((group) => {
            const meta = managerGwMeta[`${group.managerId}_gw${group.gameweek}`] || {
              chip: null,
              hitsCost: 0,
            };
            const chipBadge = getChipBadgeInfo(meta.chip);
            const hasHits = meta.hitsCost > 0;
            const hasMultipleTransfers = group.transfersCount > 2;
            const isExpanded = !!expandedGroups[group.key];

            return (
              <div
                key={group.key}
                className={`rounded-xl border transition-all ${
                  chipBadge
                    ? "bg-gradient-to-br from-purple-950/30 via-slate-900/90 to-slate-900/60 border-purple-500/30 hover:border-purple-400/50"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                } p-3 sm:p-3.5`}
              >
                {/* Manager Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    onClick={() => onSelectManager?.(group.managerId)}
                    className="cursor-pointer hover:text-emerald-400 transition-colors min-w-0"
                  >
                    <span className="text-xs sm:text-sm font-extrabold text-white block truncate">
                      {group.managerName}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate font-medium">
                      {group.entryName}
                    </span>
                  </div>

                  {/* Badges: Gameweek, Hits, and Chip Indicator */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
                    {/* Gameweek pill when viewing overall season */}
                    {selectedGw === 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                        GW{group.gameweek}
                      </span>
                    )}

                    {/* Hits Cost Badge */}
                    {hasHits && (
                      <span
                        className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                        title={`Spent -${meta.hitsCost} points in transfer hits`}
                      >
                        -{meta.hitsCost} pts
                      </span>
                    )}

                    {/* Chip Badge (Wildcard, Free Hit, etc.) or Overhaul indicator */}
                    {chipBadge ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-sm ${chipBadge.color}`}
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {chipBadge.label} ({group.transfersCount})
                      </span>
                    ) : hasMultipleTransfers ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                        <Layers className="h-2.5 w-2.5" />
                        {group.transfersCount} Transfers
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Transfer List or Collapsible Drawer */}
                {!hasMultipleTransfers ? (
                  // Regular Transfers List (1 or 2 moves)
                  <div className="space-y-1.5 mt-2">
                    {group.transfers.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800/60"
                      >
                        {/* Player In (Green) */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                            IN
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-slate-200 block truncate text-xs">
                              {t.element_in_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {t.element_in_team} • £{t.element_in_cost?.toFixed(1)}m
                            </span>
                          </div>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-slate-600 shrink-0 mx-1.5" />

                        {/* Player Out (Red) */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 text-right justify-end">
                          <div className="truncate">
                            <span className="font-bold text-slate-300 block truncate text-xs">
                              {t.element_out_name}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {t.element_out_team} • £{t.element_out_cost?.toFixed(1)}m
                            </span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                            OUT
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Multiple Moves Accordion (>2 transfers)
                  <div className="mt-2">
                    {/* Compact Preview: First 2 moves */}
                    <div className="space-y-1.5">
                      {(isExpanded ? group.transfers : group.transfers.slice(0, 2)).map(
                        (t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800/60"
                          >
                            <div className="flex items-center gap-1.5 truncate flex-1">
                              <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                                IN
                              </span>
                              <span className="font-bold text-slate-200 truncate text-xs">
                                {t.element_in_name} ({t.element_in_team})
                              </span>
                            </div>
                            <ArrowRight className="h-3 w-3 text-slate-600 shrink-0 mx-1" />
                            <div className="flex items-center gap-1.5 truncate flex-1 text-right justify-end">
                              <span className="font-bold text-slate-300 truncate text-xs">
                                {t.element_out_name} ({t.element_out_team})
                              </span>
                              <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 shrink-0">
                                OUT
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Accordion Toggle Button */}
                    <button
                      onClick={() => toggleExpand(group.key)}
                      className="mt-2 w-full py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          <span>Collapse transfers</span>
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
