"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import { ManagerProfileResponse } from "../lib/types";

interface BarChartRaceProps {
  profiles: ManagerProfileResponse[];
  maxGw: number;
}

interface ManagerGwCumulative {
  managerId: number;
  managerName: string;
  teamName: string;
  cumulativeNetPoints: number;
  prevRank: number;
  currentRank: number;
}

export const BarChartRace: React.FC<BarChartRaceProps> = ({ profiles, maxGw }) => {
  const [currentGw, setCurrentGw] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 4x
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute cumulative standings for a given gameweek
  const getStandingsForGw = (targetGw: number): ManagerGwCumulative[] => {
    const list: { managerId: number; managerName: string; teamName: string; cumulativeNetPoints: number }[] = [];

    for (const p of profiles || []) {
      let cumulativeNet = 0;
      const history = p.history || [];
      for (const h of history) {
        if (h.gameweek <= targetGw) {
          cumulativeNet += h.net_points ?? 0;
        }
      }
      list.push({
        managerId: p.id,
        managerName: p.player_name || "Manager",
        teamName: p.entry_name || "Squad",
        cumulativeNetPoints: cumulativeNet,
      });
    }

    // Sort by cumulative points descending
    list.sort((a, b) => b.cumulativeNetPoints - a.cumulativeNetPoints);

    // Compute previous rank (at GW - 1)
    const prevMap: Record<number, number> = {};
    if (targetGw > 1) {
      const prevList = getStandingsForGw(targetGw - 1);
      prevList.forEach((item, idx) => {
        prevMap[item.managerId] = idx + 1;
      });
    }

    return list.map((item, idx) => ({
      ...item,
      currentRank: idx + 1,
      prevRank: prevMap[item.managerId] || idx + 1,
    }));
  };

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(400, 1600 / speed);
      timerRef.current = setInterval(() => {
        setCurrentGw((prev) => {
          if (prev >= maxGw) {
            setIsPlaying(false);
            return maxGw;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, maxGw]);

  const standings = getStandingsForGw(currentGw);
  const maxPoints = Math.max(...standings.map((s) => s.cumulativeNetPoints), 1);

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-2xl">
      {/* Race Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              Animated Race
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Gameweek {currentGw} of {maxGw}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
            Mini-League Rank Progression Race
          </h3>
        </div>

        {/* Playback Button Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Play / Pause */}
          <button
            onClick={() => {
              if (currentGw >= maxGw) setCurrentGw(1);
              setIsPlaying(!isPlaying);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>{currentGw >= maxGw ? "REPLAY" : "PLAY RACE"}</span>
              </>
            )}
          </button>

          {/* Reset */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentGw(1);
            }}
            title="Reset to Gameweek 1"
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Speed Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  speed === s
                    ? "bg-slate-800 text-emerald-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gameweek Scrubber Slider */}
      <div className="my-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
          <span>GW 1</span>
          <span className="text-emerald-400 font-extrabold text-sm">
            Active: Gameweek {currentGw}
          </span>
          <span>GW {maxGw}</span>
        </div>
        <input
          type="range"
          min={1}
          max={Math.max(maxGw, 1)}
          value={currentGw}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentGw(Number(e.target.value));
          }}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />
      </div>

      {/* Race Bars Area */}
      <div className="space-y-2.5 mt-6">
        {standings.map((m) => {
          const percentage = Math.max(12, (m.cumulativeNetPoints / maxPoints) * 100);
          const rankDelta = m.prevRank - m.currentRank;
          const isLeader = m.currentRank === 1;

          return (
            <div
              key={m.managerId}
              className="flex items-center gap-3 transition-all duration-500 ease-out"
            >
              {/* Rank Position Pill */}
              <div className="w-8 shrink-0 flex items-center justify-center">
                <span
                  className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                    isLeader
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                      : m.currentRank <= 3
                      ? "bg-slate-800 text-slate-200 border border-slate-700"
                      : "text-slate-500"
                  }`}
                >
                  {m.currentRank}
                </span>
              </div>

              {/* Manager Name Label */}
              <div className="w-28 sm:w-36 shrink-0 truncate">
                <span className="text-xs font-bold text-white block truncate">
                  {m.managerName}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {m.teamName}
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="flex-1 h-9 rounded-xl bg-slate-950/80 border border-slate-800/80 p-1 flex items-center relative overflow-hidden">
                <div
                  style={{ width: `${percentage}%` }}
                  className={`h-full rounded-lg transition-all duration-500 ease-out flex items-center justify-end pr-3 ${
                    isLeader
                      ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-md shadow-emerald-500/20"
                      : "bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-500"
                  }`}
                >
                  <span className="text-xs font-black text-slate-950 tabular-nums drop-shadow-sm">
                    {m.cumulativeNetPoints} pts
                  </span>
                </div>
              </div>

              {/* Weekly Delta Badge */}
              <div className="w-12 shrink-0 text-right">
                {rankDelta > 0 ? (
                  <span className="inline-flex items-center text-[11px] font-extrabold text-emerald-400">
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                    +{rankDelta}
                  </span>
                ) : rankDelta < 0 ? (
                  <span className="inline-flex items-center text-[11px] font-extrabold text-rose-400">
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                    {rankDelta}
                  </span>
                ) : (
                  <span className="text-slate-600 text-xs font-bold">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
