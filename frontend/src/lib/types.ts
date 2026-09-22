/**
 * TypeScript definitions strictly matching backend FastAPI Pydantic schemas.
 */

export interface StandingsEntry {
  manager_id: number;
  player_name: string;
  entry_name: string;
  gameweek: number;
  points: number;
  event_transfers: number;
  event_transfers_cost: number;
  net_points: number;
  total_points: number;
  total_net_points: number;
  rolling_3_avg: number | null;
  last_3_gw_total: number | null;
  rank: number | null;
  overall_rank: number | null;
  bank: number;
  team_value: number;
  chip_used: string | null;
  metrics: Record<string, any>;
}

export interface LeagueStandingsResponse {
  league_id: number;
  gameweek: number;
  total_managers: number;
  standings: StandingsEntry[];
}

export interface TransferItem {
  id: number;
  manager_id: number;
  manager_name: string;
  entry_name: string;
  gameweek: number;
  element_in_id: number;
  element_in_name: string;
  element_in_team: string;
  element_in_cost: number;
  element_out_id: number;
  element_out_name: string;
  element_out_team: string;
  element_out_cost: number;
  transfer_time: string;
}

export interface LeagueTransfersResponse {
  league_id: number;
  gameweek: number | null;
  total_transfers: number;
  transfers: TransferItem[];
}

export interface ManagerGameweekScore {
  gameweek: number;
  points: number;
  event_transfers: number;
  event_transfers_cost: number;
  net_points: number;
  total_points: number;
  rank: number | null;
  overall_rank: number | null;
  percentile_rank?: number | null;
  bank: number;
  team_value: number;
  chip_used: string | null;
  rolling_3_avg: number | null;
  last_3_gw_total: number | null;
  metrics: Record<string, any>;
}

export interface ChipEvent {
  chip: string;
  gameweek: number;
  time?: string;
}

export interface ManagerProfileResponse {
  id: number;
  player_name: string;
  player_first_name: string;
  player_last_name: string;
  entry_name: string;
  fpl_league_id: number;
  total_points: number;
  total_net_points: number;
  total_hits_cost: number;
  latest_rank: number | null;
  chips_used: ChipEvent[];
  history: ManagerGameweekScore[];
}

export interface GameweekState {
  gameweek: number;
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
  finished: boolean;
  data_checked: boolean;
  pipeline_run_status: string;
  last_polled_at: string | null;
  last_processed_at: string | null;
}

export interface PipelineStatusResponse {
  current_gameweek: number | null;
  latest_completed_gameweek: number | null;
  next_gameweek: number | null;
  gameweeks: GameweekState[];
}

export interface PlayerPerformanceItem {
  element_id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  position: string;
  team_name: string;
  team_short_name: string;
  now_cost: number;
  gameweek: number;
  minutes: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  bonus: number;
  bps: number;
  expected_goals: number | null;
  expected_assists: number | null;
  expected_goal_involvements: number | null;
  expected_goals_conceded: number | null;
  threat: number | null;
  influence: number | null;
  creativity: number | null;
  ict_index: number | null;
  metrics: Record<string, any>;
}

export interface TopPlayersResponse {
  gameweek: number | null;
  count: number;
  players: PlayerPerformanceItem[];
}

// UI Story Card Model
export interface HighlightCardData {
  id: string;
  title: string;
  badgeText: string;
  accentColor: "emerald" | "rose" | "amber" | "cyan" | "purple" | "blue";
  headline: string;
  subtext: string;
  statValue: string | number;
  statLabel: string;
  managers: {
    managerName: string;
    teamName: string;
    detail?: string;
  }[];
  iconType: "crown" | "zap" | "chair" | "trophy" | "sparkles" | "flame";
}

// Grouped Manager Transfers for Wildcard/Free Hit Feed
export interface ManagerTransferGroup {
  managerId: number;
  managerName: string;
  entryName: string;
  gameweek: number;
  transfersCount: number;
  timestamp: string;
  transfers: TransferItem[];
}

// Positional Points Breakdown Types
export interface TopScorerInPosition {
  element_id: number;
  web_name: string;
  team_name: string;
  points: number;
  gameweek?: number | null;
}

export interface ManagerPositionBreakdown {
  manager_id: number;
  player_name: string;
  entry_name: string;
  rank: number;
  gkp_points: number;
  def_points: number;
  mid_points: number;
  fwd_points: number;
  total_position_points: number;
  active_position_points: number;
  position_percentage: number;
  top_scorers: TopScorerInPosition[];
}

export interface LeaguePositionalStatsResponse {
  league_id: number;
  gameweek: number | null;
  position: "DEF" | "MID" | "FWD" | "GKP" | "ALL";
  total_managers: number;
  managers: ManagerPositionBreakdown[];
}

// Best Captaincy Performance Types
export interface CaptainPickItem {
  gameweek: number;
  element_id: number;
  player_name: string;
  team_name: string;
  opponent_name?: string | null;
  raw_points: number;
  multiplier: number;
  total_points: number;
  is_haul: boolean;
  is_blank: boolean;
}

export interface ManagerCaptainStats {
  manager_id: number;
  player_name: string;
  entry_name: string;
  rank: number;
  total_captain_points: number;
  total_raw_points: number;
  average_captain_points: number;
  hauls_count: number;
  blanks_count: number;
  captain_success_rate: number;
  current_pick?: CaptainPickItem | null;
  history: CaptainPickItem[];
}

export interface LeagueCaptaincyResponse {
  league_id: number;
  gameweek: number | null;
  total_managers: number;
  captains: ManagerCaptainStats[];
}

