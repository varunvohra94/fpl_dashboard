"use client";

import React, { useEffect, useState } from "react";
import { X, Sparkles, AlertCircle } from "lucide-react";
import { ManagerProfileResponse } from "../lib/types";
import { fetchManagerHistory } from "../lib/api";

interface ManagerModalProps {
  managerId: number | null;
  onClose: () => void;
}

export const ManagerModal: React.FC<ManagerModalProps> = ({ managerId, onClose }) => {
  const [profile, setProfile] = useState<ManagerProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!managerId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchManagerHistory(managerId)
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load manager profile");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [managerId]);

  if (!managerId) return null;

  // Convert chips_used array to map: chip -> gameweek
  const chipMap: Record<string, number> = {};
  if (Array.isArray(profile?.chips_used)) {
    for (const item of profile.chips_used) {
      if (item?.chip) {
        chipMap[item.chip] = item.gameweek;
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                Manager Scorecard
              </span>
              {profile && (
                <span className="text-xs text-slate-500 font-medium">
                  Entry #{profile.id}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {profile?.player_name || "Loading Manager..."}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {profile?.entry_name || "Fetching historical statistics..."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-3" />
              Loading season history & scorecard...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : profile ? (
            <>
              {/* Quick Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Total Net Points
                  </span>
                  <span className="text-xl font-black text-emerald-400 tabular-nums block mt-0.5">
                    {profile.total_net_points}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Total Hit Costs
                  </span>
                  <span className="text-xl font-black text-rose-400 tabular-nums block mt-0.5">
                    -{profile.total_hits_cost} pts
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Gameweeks Played
                  </span>
                  <span className="text-xl font-black text-cyan-400 tabular-nums block mt-0.5">
                    {profile.history?.length || 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Chips Deployed
                  </span>
                  <span className="text-xl font-black text-purple-400 tabular-nums block mt-0.5">
                    {Object.keys(chipMap).length} / 4
                  </span>
                </div>
              </div>

              {/* Chip Timeline */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span>Chip Strategy Timeline</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {["wildcard", "freehit", "bboost", "3xc"].map((chipKey) => {
                    const usedInGw = chipMap[chipKey];
                    const labels: Record<string, string> = {
                      wildcard: "Wildcard",
                      freehit: "Free Hit",
                      bboost: "Bench Boost",
                      "3xc": "Triple Captain",
                    };
                    const name = labels[chipKey] || chipKey;

                    return (
                      <div
                        key={chipKey}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                          usedInGw
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm"
                            : "bg-slate-900/60 text-slate-500 border-slate-800"
                        }`}
                      >
                        <span>{name}</span>
                        {usedInGw ? (
                          <span className="px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-200 text-[10px]">
                            GW {usedInGw}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-medium">Available</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Season Scorecard Table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="p-3.5 border-b border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Gameweek-by-Gameweek Scorecard
                  </h4>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900/80 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-800">
                        <th className="py-2.5 px-3.5">GW</th>
                        <th className="py-2.5 px-3.5">Gross Pts</th>
                        <th className="py-2.5 px-3.5">Hit Cost</th>
                        <th className="py-2.5 px-3.5">Net Pts</th>
                        <th className="py-2.5 px-3.5">3-GW Form</th>
                        <th className="py-2.5 px-3.5">Benched</th>
                        <th className="py-2.5 px-3.5">Chip</th>
                        <th className="py-2.5 px-3.5">Overall Rank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 tabular-nums">
                      {(profile.history || []).map((gw) => {
                        const benched = gw.metrics?.points_on_bench || 0;
                        return (
                          <tr key={gw.gameweek} className="hover:bg-slate-900/50">
                            <td className="py-2.5 px-3.5 font-bold text-white">GW {gw.gameweek}</td>
                            <td className="py-2.5 px-3.5 font-semibold text-slate-300">{gw.points}</td>
                            <td className="py-2.5 px-3.5">
                              {gw.event_transfers_cost > 0 ? (
                                <span className="font-bold text-rose-400">-{gw.event_transfers_cost}</span>
                              ) : (
                                <span className="text-slate-600">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 font-bold text-emerald-400">{gw.net_points}</td>
                            <td className="py-2.5 px-3.5 text-cyan-400 font-semibold">
                              {gw.rolling_3_avg !== null && gw.rolling_3_avg !== undefined
                                ? gw.rolling_3_avg.toFixed(1)
                                : "—"}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-400">
                              {benched > 0 ? (
                                <span className="text-amber-400 font-medium">{benched} pts</span>
                              ) : (
                                <span className="text-slate-600">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 font-bold text-purple-400">
                              {gw.chip_used || "—"}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-400">
                              {gw.overall_rank ? gw.overall_rank.toLocaleString() : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
