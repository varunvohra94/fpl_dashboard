/**
 * Extensible Gameweek Intelligence & Season Narrative Highlight Card Generator.
 * Pluggable registry pattern with full multi-manager tie-handling.
 */

import {
  HighlightCardData,
  LeagueCaptaincyResponse,
  ManagerProfileResponse,
  StandingsEntry,
} from "../lib/types";

export type CardEvaluator = (
  standings: StandingsEntry[],
  profiles: ManagerProfileResponse[],
  selectedGw: number,
  captainStats?: LeagueCaptaincyResponse | null
) => HighlightCardData | null;

/**
 * 1. Season Record Haul - Highest Single Gameweek Score Achieved
 */
export const evalSeasonRecordHaul: CardEvaluator = (
  _standings,
  profiles,
  _selectedGw
) => {
  if (!profiles || !profiles.length) return null;

  let maxScore = -1;
  interface RecordHolder {
    managerName: string;
    teamName: string;
    gw: number;
    points: number;
  }
  let holders: RecordHolder[] = [];

  for (const p of profiles) {
    const history = p.history || [];
    for (const h of history) {
      if (h.points > maxScore) {
        maxScore = h.points;
        holders = [
          {
            managerName: p.player_name || "Manager",
            teamName: p.entry_name || "Squad",
            gw: h.gameweek,
            points: h.points,
          },
        ];
      } else if (h.points === maxScore && maxScore > 0) {
        holders.push({
          managerName: p.player_name || "Manager",
          teamName: p.entry_name || "Squad",
          gw: h.gameweek,
          points: h.points,
        });
      }
    }
  }

  if (maxScore <= 0 || holders.length === 0) return null;

  const isTied = holders.length > 1;
  const headline = isTied
    ? "Joint Highest Gameweek Score"
    : "Highest Single GW Score";
  const subtext = isTied
    ? `${holders.length} managers tied at ${maxScore} pts`
    : `Achieved in Gameweek ${holders[0].gw}`;

  return {
    id: "season_record_haul",
    title: "RECORD HAUL",
    badgeText: isTied ? "🏆 Joint High" : "🏆 Season High",
    accentColor: "emerald",
    headline,
    subtext,
    statValue: maxScore,
    statLabel: "GW Score",
    managers: holders.map((h) => ({
      managerName: h.managerName,
      teamName: h.teamName,
      detail: `GW${h.gw}: ${h.points} pts`,
    })),
    iconType: "trophy",
  };
};

/**
 * 2. Bench Regrets King - Season Total Points Left on Bench
 */
export const evalBenchRegrets: CardEvaluator = (
  _standings,
  profiles,
  _selectedGw
) => {
  if (!profiles || !profiles.length) return null;

  let maxBenchPoints = -1;
  interface BenchHolder {
    managerName: string;
    teamName: string;
    totalBench: number;
  }
  let holders: BenchHolder[] = [];

  for (const p of profiles) {
    const history = p.history || [];
    const totalBench = history.reduce((sum, gw) => {
      const benched = gw.metrics?.points_on_bench || 0;
      return sum + benched;
    }, 0);

    if (totalBench > maxBenchPoints) {
      maxBenchPoints = totalBench;
      holders = [
        {
          managerName: p.player_name || "Manager",
          teamName: p.entry_name || "Squad",
          totalBench,
        },
      ];
    } else if (totalBench === maxBenchPoints && maxBenchPoints > 0) {
      holders.push({
        managerName: p.player_name || "Manager",
        teamName: p.entry_name || "Squad",
        totalBench,
      });
    }
  }

  if (maxBenchPoints <= 0 || holders.length === 0) return null;

  const isTied = holders.length > 1;
  const headline = isTied
    ? "Joint Most Points Left on Bench"
    : "Most Points Left on Bench";
  const subtext = "Total bench points";

  return {
    id: "bench_regrets",
    title: "BENCH REGRETS",
    badgeText: isTied ? "🪑 Joint Benched" : "🪑 Stranded Pts",
    accentColor: "amber",
    headline,
    subtext,
    statValue: maxBenchPoints,
    statLabel: "Bench Points",
    managers: holders.map((h) => ({
      managerName: h.managerName,
      teamName: h.teamName,
      detail: `${h.totalBench} pts benched`,
    })),
    iconType: "chair",
  };
};

/**
 * 3. The Season Gambler - Cumulative Transfer Hits Deductions
 */
export const evalTheGambler: CardEvaluator = (
  _standings,
  profiles,
  _selectedGw
) => {
  if (!profiles || !profiles.length) return null;

  let maxHitsCost = -1;
  interface GamblerHolder {
    managerName: string;
    teamName: string;
    totalHitsCost: number;
  }
  let holders: GamblerHolder[] = [];

  for (const p of profiles) {
    const totalHits = p.total_hits_cost || 0;

    if (totalHits > maxHitsCost) {
      maxHitsCost = totalHits;
      holders = [
        {
          managerName: p.player_name || "Manager",
          teamName: p.entry_name || "Squad",
          totalHitsCost: totalHits,
        },
      ];
    } else if (totalHits === maxHitsCost && maxHitsCost > 0) {
      holders.push({
        managerName: p.player_name || "Manager",
        teamName: p.entry_name || "Squad",
        totalHitsCost: totalHits,
      });
    }
  }

  if (maxHitsCost <= 0 || holders.length === 0) return null;

  const isTied = holders.length > 1;
  const headline = isTied
    ? `Tied Gamblers: ${holders.map((h) => h.managerName).join(" & ")} (-${maxHitsCost} pts)`
    : `${holders[0].managerName} has burned -${maxHitsCost} pts on transfer hits`;

  return {
    id: "the_gambler",
    title: "THE SEASON GAMBLER",
    badgeText: isTied ? "⚡ Tied Hit Takers" : "⚡ Transfer Hits",
    accentColor: "rose",
    headline,
    subtext: "Cumulative points deducted from transfer penalties",
    statValue: `-${maxHitsCost}`,
    statLabel: "Total Hit Costs",
    managers: holders.map((h) => ({
      managerName: h.managerName,
      teamName: h.teamName,
      detail: `-${h.totalHitsCost} pts penalty`,
    })),
    iconType: "zap",
  };
};

/**
 * 4. Form King - Leader in Rolling 3-Gameweek Average
 */
export const evalFormKing: CardEvaluator = (
  standings,
  _profiles,
  selectedGw
) => {
  if (!standings || !standings.length) return null;

  let maxForm = -1;
  interface FormHolder {
    managerName: string;
    teamName: string;
    form: number;
  }
  let holders: FormHolder[] = [];

  for (const s of standings) {
    const form = s.rolling_3_avg ?? 0;
    if (form > maxForm) {
      maxForm = form;
      holders = [
        {
          managerName: s.player_name || "Manager",
          teamName: s.entry_name || "Squad",
          form: form,
        },
      ];
    } else if (form === maxForm && maxForm > 0) {
      holders.push({
        managerName: s.player_name || "Manager",
        teamName: s.entry_name || "Squad",
        form: form,
      });
    }
  }

  if (maxForm <= 0 || holders.length === 0) return null;

  const isTied = holders.length > 1;
  const headline = isTied
    ? "Joint Form Leaders"
    : "Best 3-GW Form";
  const subtext = "Last 3 gameweeks average";

  return {
    id: "in_form_manager",
    title: "IN-FORM",
    badgeText: isTied ? "🔥 Joint Leaders" : "🔥 Hot Form",
    accentColor: "purple",
    headline,
    subtext,
    statValue: `${maxForm.toFixed(1)}`,
    statLabel: "Avg Pts / GW",
    managers: holders.map((h) => ({
      managerName: h.managerName,
      teamName: h.teamName,
      detail: `${h.form.toFixed(1)} avg`,
    })),
    iconType: "flame",
  };
};

/**
 * 5. Captain King - Highest Cumulative Points from Captain Picks
 */
export const evalCaptainKing: CardEvaluator = (
  _standings,
  _profiles,
  _selectedGw,
  captainStats
) => {
  if (!captainStats || !captainStats.captains || !captainStats.captains.length) {
    return null;
  }

  const sorted = [...captainStats.captains].sort(
    (a, b) => b.total_captain_points - a.total_captain_points
  );
  const leader = sorted[0];
  if (!leader || leader.total_captain_points <= 0) return null;

  const tied = sorted.filter(
    (c) => c.total_captain_points === leader.total_captain_points
  );
  const isTied = tied.length > 1;

  const headline = isTied
    ? `Joint Captain Kings (${leader.total_captain_points} pts)`
    : `${leader.player_name} leads with ${leader.total_captain_points} captain pts`;

  return {
    id: "captain_king",
    title: "CAPTAIN KING",
    badgeText: isTied ? "👑 Joint Leaders" : "👑 Master Tactician",
    accentColor: "amber",
    headline,
    subtext: `Armband performance: ${leader.average_captain_points.toFixed(1)} avg/gw • ${leader.hauls_count} hauls`,
    statValue: `${leader.total_captain_points}`,
    statLabel: "Captain Points",
    managers: tied.map((m) => ({
      managerName: m.player_name,
      teamName: m.entry_name,
      detail: `${m.captain_success_rate.toFixed(0)}% success rate`,
    })),
    iconType: "crown",
  };
};

/**
 * Master Registry of Evaluators.
 */
export const CARD_EVALUATORS: CardEvaluator[] = [
  evalSeasonRecordHaul,
  evalCaptainKing,
  evalFormKing,
  evalBenchRegrets,
  evalTheGambler,
];

/**
 * Evaluates all registered cards and returns the active list.
 */
export function generateHighlightCards(
  standings: StandingsEntry[],
  profiles: ManagerProfileResponse[],
  selectedGw: number,
  captainStats?: LeagueCaptaincyResponse | null
): HighlightCardData[] {
  const cards: HighlightCardData[] = [];
  for (const evaluator of CARD_EVALUATORS) {
    const card = evaluator(standings, profiles, selectedGw, captainStats);
    if (card) {
      cards.push(card);
    }
  }
  return cards;
}

