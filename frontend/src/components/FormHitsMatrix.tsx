"use client";

import React from "react";
import { StandingsEntry } from "../lib/types";
import { Target, Zap, Shield, AlertTriangle } from "lucide-react";

interface FormHitsMatrixProps {
  standings: StandingsEntry[];
  selectedGw: number;
}

export const FormHitsMatrix: React.FC<FormHitsMatrixProps> = ({ standings, selectedGw }) => {
  if (!standings.length) return null;

  // Calculate median thresholds for 2x2 split
  const forms = standings.map((s) => s.rolling_3gw_average);
  const avgForm = forms.reduce((a, b) => a + b, 0) / forms.length || 60;
  const hitsThreshold = 4; // 1 transfer hit (-4 pts) threshold

  const pureStrategists = standings.filter(
    (s) => s.rolling_3gw_average >= avgForm && s.total_hits_cost < hitsThreshold
  );
  const highRollers = standings.filter(
    (s) => s.rolling_3gw_average >= avgForm && s.total_hits_cost >= hitsThreshold
  );
  const silentDrifters = standings.filter(
    (s) => s.rolling_3gw_average < avgForm && s.total_hits_cost < hitsThreshold
  );
  const inTheMud = standings.filter(
    (s) => s.rolling_3gw_average < avgForm && s.total_hits_cost >= hitsThreshold
  );

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
            Behavioral Matrix
          </span>
          <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
            Form vs. Transfer Hits Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Classifying rival tactical styles based on rolling form vs penalty aggression
          </p>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Quadrant 1: The Pure Strategists (High Form, Low Hits) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-950 to-slate-950 border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                <Target className="h-4 w-4" />
                The Pure Strategists
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                High Form • Low Hits
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Rivals delivering elite points returns without taking costly point penalties.
            </p>
          </div>

          <div className="space-y-1.5 mt-2">
            {pureStrategists.length === 0 ? (
              <span className="text-xs text-slate-600 italic">No managers in this quadrant</span>
            ) : (
              pureStrategists.map((m) => (
                <div
                  key={m.manager_id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/80 border border-slate-800"
                >
                  <span className="font-bold text-white">{m.manager_name}</span>
                  <span className="text-emerald-400 font-extrabold tabular-nums">
                    {m.rolling_3gw_average.toFixed(1)} form (0 hits)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quadrant 2: The High Rollers (High Form, High Hits) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-950 to-slate-950 border border-purple-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                The High Rollers
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                High Form • High Hits
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Aggressive transfer traders whose points gambles are currently paying off.
            </p>
          </div>

          <div className="space-y-1.5 mt-2">
            {highRollers.length === 0 ? (
              <span className="text-xs text-slate-600 italic">No managers in this quadrant</span>
            ) : (
              highRollers.map((m) => (
                <div
                  key={m.manager_id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/80 border border-slate-800"
                >
                  <span className="font-bold text-white">{m.manager_name}</span>
                  <span className="text-purple-400 font-extrabold tabular-nums">
                    {m.rolling_3gw_average.toFixed(1)} form (-{m.total_hits_cost} hits)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quadrant 3: The Silent Drifters (Low Form, Low Hits) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-slate-400 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-slate-500" />
                The Silent Drifters
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                Low Form • Low Hits
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Conservative managers refusing to take hits despite falling behind in weekly form.
            </p>
          </div>

          <div className="space-y-1.5 mt-2">
            {silentDrifters.length === 0 ? (
              <span className="text-xs text-slate-600 italic">No managers in this quadrant</span>
            ) : (
              silentDrifters.map((m) => (
                <div
                  key={m.manager_id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/80 border border-slate-800"
                >
                  <span className="font-bold text-slate-300">{m.manager_name}</span>
                  <span className="text-slate-400 font-semibold tabular-nums">
                    {m.rolling_3gw_average.toFixed(1)} form
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quadrant 4: In The Mud (Low Form, High Hits) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/30 via-slate-950 to-slate-950 border border-rose-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                In The Mud
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                Low Form • High Hits
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Managers burning point deductions on transfers but continuing to suffer low scores.
            </p>
          </div>

          <div className="space-y-1.5 mt-2">
            {inTheMud.length === 0 ? (
              <span className="text-xs text-slate-600 italic">No managers in this quadrant</span>
            ) : (
              inTheMud.map((m) => (
                <div
                  key={m.manager_id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/80 border border-slate-800"
                >
                  <span className="font-bold text-white">{m.manager_name}</span>
                  <span className="text-rose-400 font-extrabold tabular-nums">
                    {m.rolling_3gw_average.toFixed(1)} form (-{m.total_hits_cost} hits)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
