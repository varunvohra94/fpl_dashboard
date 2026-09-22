"use client";

import React from "react";
import { Check } from "lucide-react";
import { ManagerProfileResponse } from "../lib/types";

interface ChipMatrixProps {
  profiles: ManagerProfileResponse[];
}

export const ChipMatrix: React.FC<ChipMatrixProps> = ({ profiles }) => {
  const CHIP_LIST = [
    { key: "wildcard", label: "Wildcard" },
    { key: "freehit", label: "Free Hit" },
    { key: "bboost", label: "Bench Boost" },
    { key: "3xc", label: "Triple Captain" },
  ];

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col">
      {/* Header Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>Chip Usage Metrics</span>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold">
              4 Chips
            </span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Track available power chips for double & blank gameweeks
          </p>
        </div>
      </div>

      {/* Scrollable Matrix with Pinned Left Manager Column and Pinned Top Chip Header */}
      <div className="overflow-auto max-h-[360px]">
        <table className="w-full text-left text-xs border-separate border-spacing-0">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {/* Top-Left Intersection Cell: Sticky Top & Sticky Left */}
              <th className="py-2.5 px-3.5 sticky top-0 left-0 z-30 bg-slate-950/95 border-b border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.4)] min-w-[125px] sm:min-w-[145px] text-white">
                Manager
              </th>

              {/* Sticky Top Chip Headers */}
              {CHIP_LIST.map((c) => (
                <th
                  key={c.key}
                  className="py-2.5 px-3 text-center sticky top-0 z-20 bg-slate-950/95 border-b border-slate-800/80 min-w-[90px] sm:min-w-[105px] whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}

              {/* Sticky Top Remaining Header */}
              <th className="py-2.5 px-3 text-right sticky top-0 z-20 bg-slate-950/95 border-b border-slate-800/80 min-w-[80px] whitespace-nowrap pr-4">
                Remaining
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {(profiles || []).map((p) => {
              // Convert chips_used array to map: chip -> gameweek
              const chipMap: Record<string, number> = {};
              if (Array.isArray(p.chips_used)) {
                for (const item of p.chips_used) {
                  if (item?.chip) {
                    chipMap[item.chip] = item.gameweek;
                  }
                }
              }

              const usedChipsCount = Object.keys(chipMap).length;
              const remainingCount = Math.max(0, CHIP_LIST.length - usedChipsCount);

              return (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors group">
                  {/* Sticky Left Manager Cell */}
                  <td className="py-2.5 px-3.5 sticky left-0 z-10 bg-slate-950/95 group-hover:bg-slate-900/95 border-r border-slate-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.4)] transition-colors min-w-[125px] sm:min-w-[145px]">
                    <span className="font-bold text-white block truncate text-xs">
                      {p.player_name || "Manager"}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate font-medium">
                      {p.entry_name || "Squad"}
                    </span>
                  </td>

                  {/* Chip Status Cells */}
                  {CHIP_LIST.map((c) => {
                    const playedGw = chipMap[c.key];

                    return (
                      <td key={c.key} className="py-2.5 px-3 text-center border-b border-slate-800/40">
                        {playedGw ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10.5px] font-bold">
                            <Check className="h-3 w-3" />
                            <span>GW {playedGw}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            Available
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Remaining Chips Cell */}
                  <td className="py-2.5 px-3 text-right font-black tabular-nums pr-4 border-b border-slate-800/40">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-lg text-xs ${
                        remainingCount === CHIP_LIST.length
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : remainingCount > 0
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {remainingCount} / {CHIP_LIST.length}
                    </span>
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
