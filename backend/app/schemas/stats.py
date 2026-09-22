"""Pydantic schemas for Positional Points Breakdown and Best Captaincy performance statistics."""

from pydantic import BaseModel, Field


class TopScorerInPosition(BaseModel):
    """Top-scoring player within a specific position for a manager."""

    element_id: int
    web_name: str
    team_name: str
    points: int
    gameweek: int | None = None


class ManagerPositionBreakdown(BaseModel):
    """Aggregated points and ranking for a manager across positional categories."""

    manager_id: int
    player_name: str
    entry_name: str
    rank: int = 0
    gkp_points: int = 0
    def_points: int = 0
    mid_points: int = 0
    fwd_points: int = 0
    total_position_points: int = 0
    active_position_points: int = 0  # Points for currently selected position (e.g. DEF)
    position_percentage: float = 0.0  # Percentage of team's total points from this position
    top_scorers: list[TopScorerInPosition] = Field(default_factory=list)


class LeaguePositionalStatsResponse(BaseModel):
    """Response payload for positional rankings in a mini-league."""

    league_id: int
    gameweek: int | None = None  # None or 0 = Overall Season
    position: str = "DEF"  # "DEF", "MID", "FWD", "GKP", "ALL"
    total_managers: int = 0
    managers: list[ManagerPositionBreakdown] = Field(default_factory=list)


class CaptainPickItem(BaseModel):
    """Details of a single gameweek captaincy choice."""

    gameweek: int
    element_id: int
    player_name: str
    team_name: str
    opponent_name: str | None = None
    raw_points: int = 0  # Base (1x) player points
    multiplier: int = 2  # 2 (standard captain) or 3 (triple captain)
    total_points: int = 0  # Effective points = raw_points * multiplier
    is_haul: bool = False  # raw_points >= 10
    is_blank: bool = False  # raw_points <= 3


class ManagerCaptainStats(BaseModel):
    """Season and gameweek captaincy performance metrics for a manager."""

    manager_id: int
    player_name: str
    entry_name: str
    rank: int = 0
    total_captain_points: int = 0  # Season cumulative points contributed by captains (with multiplier)
    total_raw_points: int = 0  # Season cumulative base (1x) points from captain picks
    average_captain_points: float = 0.0
    hauls_count: int = 0  # Number of 10+ pt raw hauls
    blanks_count: int = 0  # Number of <= 3 pt blanks
    captain_success_rate: float = 0.0  # Percentage of non-blank captain choices
    current_pick: CaptainPickItem | None = None  # Captain choice for the selected or latest GW
    history: list[CaptainPickItem] = Field(default_factory=list)


class LeagueCaptaincyResponse(BaseModel):
    """Response payload for captaincy performance rankings in a mini-league."""

    league_id: int
    gameweek: int | None = None  # None or 0 = Overall Season
    total_managers: int = 0
    captains: list[ManagerCaptainStats] = Field(default_factory=list)
