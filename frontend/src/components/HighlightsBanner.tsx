"use client";

import React from "react";
import {
  Trophy,
  Zap,
  Armchair,
  Crown,
  Sparkles,
  Flame,
  ChevronRight,
  Users,
} from "lucide-react";
import { HighlightCardData } from "../lib/types";

interface HighlightsBannerProps {
  cards: HighlightCardData[];
  onSelectManager?: (managerName: string) => void;
}

const colorMap = {
  emerald: {
    bg: "from-emerald-950/40 via-slate-900/80 to-slate-900/60",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    iconBg: "bg-emerald-500/20 text-emerald-400",
    statColor: "text-emerald-400",
    glow: "hover:shadow-emerald-500/10",
  },
  rose: {
    bg: "from-rose-950/40 via-slate-900/80 to-slate-900/60",
    border: "border-rose-500/30 hover:border-rose-400/60",
    badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    iconBg: "bg-rose-500/20 text-rose-400",
    statColor: "text-rose-400",
    glow: "hover:shadow-rose-500/10",
  },
  amber: {
    bg: "from-amber-950/40 via-slate-900/80 to-slate-900/60",
    border: "border-amber-500/30 hover:border-amber-400/60",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    iconBg: "bg-amber-500/20 text-amber-400",
    statColor: "text-amber-400",
    glow: "hover:shadow-amber-500/10",
  },
  purple: {
    bg: "from-purple-950/40 via-slate-900/80 to-slate-900/60",
    border: "border-purple-500/30 hover:border-purple-400/60",
    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    iconBg: "bg-purple-500/20 text-purple-400",
    statColor: "text-purple-400",
    glow: "hover:shadow-purple-500/10",
  },
  cyan: {
    bg: "from-cyan-950/40 via-slate-900/80 to-slate-900/60",
    border: "border-cyan-500/30 hover:border-cyan-400/60",
    badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    iconBg: "bg-cyan-500/20 text-cyan-400",
    statColor: "text-cyan-400",
    glow: "hover:shadow-cyan-500/10",
  },
  blue: {
    bg: "from-blue-950/40 via-slate-900/80 to-slate-900/60",
    border: "border-blue-500/30 hover:border-blue-400/60",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    iconBg: "bg-blue-500/20 text-blue-400",
    statColor: "text-blue-400",
    glow: "hover:shadow-blue-500/10",
  },
};

const renderIcon = (iconType: HighlightCardData["iconType"]) => {
  switch (iconType) {
    case "trophy":
      return <Trophy className="h-5 w-5" />;
    case "chair":
      return <Armchair className="h-5 w-5" />;
    case "zap":
      return <Zap className="h-5 w-5" />;
    case "crown":
      return <Crown className="h-5 w-5" />;
    case "sparkles":
      return <Sparkles className="h-5 w-5" />;
    case "flame":
    default:
      return <Flame className="h-5 w-5" />;
  }
};

export const HighlightsBanner: React.FC<HighlightsBannerProps> = ({
  cards,
  onSelectManager,
}) => {
  if (!cards.length) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Gameweek Intelligence & Rival Highlights
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          {cards.length} Key Narratives Tracked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const theme = colorMap[card.accentColor] || colorMap.emerald;
          const isTied = card.managers.length > 1;

          return (
            <div
              key={card.id}
              className={`rounded-2xl p-4 bg-gradient-to-br ${theme.bg} border ${theme.border} backdrop-blur-md shadow-xl ${theme.glow} transition-all duration-300 flex flex-col justify-between relative overflow-hidden group`}
            >
              {/* Card Header & Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${theme.iconBg}`}>
                    {renderIcon(card.iconType)}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      {card.title}
                    </span>
                    <span
                      className={`inline-block mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${theme.badgeBg}`}
                    >
                      {card.badgeText}
                    </span>
                  </div>
                </div>

                {/* Big Stat Value */}
                <div className="text-right">
                  <span className={`text-xl font-black tabular-nums block ${theme.statColor}`}>
                    {card.statValue}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    {card.statLabel}
                  </span>
                </div>
              </div>

              {/* Headline */}
              <div className="my-2">
                <p className="text-sm font-bold text-white leading-snug line-clamp-2">
                  {card.headline}
                </p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                  {card.subtext}
                </p>
              </div>

              {/* Manager List / Tie Details */}
              <div className="mt-3 pt-3 border-t border-slate-800/60">
                {isTied ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <span>{card.managers.length} Managers Tied:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {card.managers.map((m, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSelectManager?.(m.managerName)}
                          className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/50 transition-colors flex items-center gap-1"
                        >
                          <span>{m.managerName}</span>
                          {m.detail && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({m.detail})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  card.managers[0] && (
                    <button
                      onClick={() => onSelectManager?.(card.managers[0].managerName)}
                      className="w-full flex items-center justify-between text-left group-hover:text-emerald-300 transition-colors"
                    >
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-200 block truncate">
                          {card.managers[0].managerName}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {card.managers[0].teamName}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-0.5 group-hover:text-emerald-400 transition-all" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
