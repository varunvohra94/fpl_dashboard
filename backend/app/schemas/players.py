"""Pydantic schemas for Premier League player match performance and underlying analytics."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PlayerPerformanceItem(BaseModel):
    """Player performance record for a specific gameweek."""

    model_config = ConfigDict(from_attributes=True)

    element_id: int = Field(..., description="Player ID")
    web_name: str = Field(..., description="Display name (e.g. Haaland)")
    first_name: str = Field(..., description="First name")
    second_name: str = Field(..., description="Last name")
    position: str = Field(..., description="Position: GKP, DEF, MID, FWD")
    team_name: str = Field(..., description="Full club name (e.g. Arsenal)")
    team_short_name: str = Field(..., description="Club short code (e.g. ARS)")
    now_cost: float = Field(..., description="Current price in £m (e.g. 15.2)")
    gameweek: int = Field(..., description="Gameweek number")
    minutes: int = Field(..., description="Minutes played")
    total_points: int = Field(..., description="Total FPL points earned")
    goals_scored: int = Field(..., description="Goals scored")
    assists: int = Field(..., description="Assists provided")
    clean_sheets: int = Field(..., description="Clean sheets kept")
    goals_conceded: int = Field(..., description="Goals conceded")
    bonus: int = Field(..., description="Bonus points awarded (0-3)")
    bps: int = Field(..., description="Bonus Point System raw score")
    expected_goals: float | None = Field(None, description="Expected Goals (xG)")
    expected_assists: float | None = Field(None, description="Expected Assists (xA)")
    expected_goal_involvements: float | None = Field(
        None, description="Expected Goal Involvements (xGI)"
    )
    expected_goals_conceded: float | None = Field(None, description="Expected Goals Conceded (xGC)")
    threat: float | None = Field(None, description="FPL Threat rating")
    influence: float | None = Field(None, description="FPL Influence rating")
    creativity: float | None = Field(None, description="FPL Creativity rating")
    ict_index: float | None = Field(None, description="ICT Index score")
    metrics: dict[str, Any] = Field(default_factory=dict, description="Additional match metrics")


class TopPlayersResponse(BaseModel):
    """Response envelope for top performing players."""

    gameweek: int | None = Field(None, description="Gameweek filter if provided")
    players: list[PlayerPerformanceItem] = Field(
        default_factory=list, description="Top players ranked by points"
    )
    count: int = Field(..., description="Number of player records returned")
