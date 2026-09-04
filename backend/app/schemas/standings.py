"""Pydantic schemas for mini-league standings and leaderboard."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class StandingsEntry(BaseModel):
    """Represents an individual manager's score and standing in a mini-league."""

    model_config = ConfigDict(from_attributes=True)

    manager_id: int = Field(..., description="FPL Entry ID for the manager")
    player_name: str = Field(..., description="Manager real name (e.g. Varun Vohra)")
    entry_name: str = Field(..., description="Manager team name (e.g. Blue Nerdz)")
    gameweek: int = Field(..., description="Target Gameweek number")
    points: int = Field(..., description="Raw points scored this gameweek")
    event_transfers: int = Field(0, description="Transfers made for this gameweek")
    event_transfers_cost: int = Field(
        0, description="Transfer point hits deducted (-4 pts per hit)"
    )
    net_points: int = Field(..., description="Calculated net score (points - event_transfers_cost)")
    total_points: int = Field(..., description="Cumulative season raw score")
    total_net_points: int = Field(
        ..., description="Cumulative season net score after all hit deductions"
    )
    rolling_3_avg: float | None = Field(None, description="Rolling 3-game average net score form")
    last_3_gw_total: int | None = Field(
        None, description="Sum of net points across last 3 gameweeks"
    )
    rank: int | None = Field(None, description="Gameweek global rank")
    overall_rank: int | None = Field(None, description="Season overall global rank")
    bank: float = Field(0.0, description="Money in the bank in £m")
    team_value: float = Field(0.0, description="Squad value in £m")
    chip_used: str | None = Field(None, description="Active chip (wildcard, 3xc, bboost, freehit)")
    metrics: dict[str, Any] = Field(
        default_factory=dict, description="Extensible JSONB calculated metrics"
    )


class LeagueStandingsResponse(BaseModel):
    """API response envelope for mini-league standings."""

    league_id: int = Field(..., description="FPL Mini-League ID")
    gameweek: int = Field(..., description="Gameweek of the standings")
    standings: list[StandingsEntry] = Field(
        default_factory=list, description="Ranked list of managers"
    )
    total_managers: int = Field(..., description="Total participants in mini-league")
