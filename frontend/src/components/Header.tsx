"use client";

import React from "react";
import { ShieldCheck, RefreshCw, Trophy, Activity } from "lucide-react";
import { PipelineStatusResponse } from "../lib/types";

interface HeaderProps {
  leagueName: string;
  pipelineStatus: PipelineStatusResponse | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  leagueName,
  pipelineStatus,
  onRefresh,
  isLoading,
}) => {
  const activeGw =
    pipelineStatus?.latest_completed_gameweek ||
    pipelineStatus?.current_gameweek ||
    1;

  const currentGwState = pipelineStatus?.gameweeks?.find(
    (g) => g.gameweek === activeGw
  );

  const isChecked = currentGwState?.data_checked ?? true;

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Brand & Mini-League */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Trophy className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                FPL RIVAL INTEL
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                  v1.0
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 truncate font-medium">
              Mini-League: <span className="text-slate-200 font-semibold">{leagueName || "Premier League"}</span>
            </p>
          </div>
        </div>

        {/* Status & Refresh Controls */}
        <div className="flex items-center gap-3">
          {/* Pipeline Sync Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              isChecked
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse"
            }`}
          >
            {isChecked ? (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ) : (
              <Activity className="h-4 w-4 text-cyan-400" />
            )}
            <span>{isChecked ? "LIVE SYNC FINALIZED" : "MATCHDAY SYNC ACTIVE"}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh latest data"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
