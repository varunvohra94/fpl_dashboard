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
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase tracking-wider">
            Strategic Tracker
          </span>
          <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
            Chip Usage Metrics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor which rivals still hold power chips for double & blank gameweeks
          </p>
        </div>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Manager / Team</th>
              {CHIP_LIST.map((c) => (
                <th key={c.key} className="py-3 px-4 text-center">
                  {c.label}
                </th>
              ))}
              <th className="py-3 px-4 text-right">Remaining</th>
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
                <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-white block">
                      {p.player_name || "Manager"}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {p.entry_name || "Squad"}
                    </span>
                  </td>

                  {CHIP_LIST.map((c) => {
                    const playedGw = chipMap[c.key];

                    return (
                      <td key={c.key} className="py-3 px-4 text-center">
                        {playedGw ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold">
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

                  <td className="py-3 px-4 text-right font-black tabular-nums">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs ${
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
