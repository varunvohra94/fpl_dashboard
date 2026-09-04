"""Pydantic schemas for individual manager scorecards and history."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ManagerGameweekScore(BaseModel):
    """Gameweek scorecard for a manager."""

    model_config = ConfigDict(from_attributes=True)

    gameweek: int = Field(..., description="Gameweek number")
    points: int = Field(..., description="Raw points scored")
    event_transfers: int = Field(0, description="Transfers made")
    event_transfers_cost: int = Field(0, description="Points deducted for transfer hits")
    net_points: int = Field(..., description="Net points (points - transfer hit cost)")
    total_points: int = Field(..., description="Cumulative raw points")
    rank: int | None = Field(None, description="Gameweek global rank")
    overall_rank: int | None = Field(None, description="Season overall rank")
    percentile_rank: int | None = Field(None, description="Percentile rank if available")
    bank: float = Field(0.0, description="Bank in £m")
    team_value: float = Field(0.0, description="Team value in £m")
    chip_used: str | None = Field(None, description="Chip used (e.g. wildcard, 3xc)")
    rolling_3_avg: float | None = Field(None, description="Rolling 3-game average form")
    last_3_gw_total: int | None = Field(None, description="Total points over last 3 gameweeks")
    metrics: dict[str, Any] = Field(default_factory=dict, description="Extensible JSONB metrics")


class ManagerProfileResponse(BaseModel):
    """Full manager profile and season history."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Manager Entry ID")
    player_name: str = Field(..., description="Full name")
    player_first_name: str = Field("", description="First name")
    player_last_name: str = Field("", description="Last name")
    entry_name: str = Field(..., description="Team name")
    fpl_league_id: int = Field(..., description="League ID")
    total_points: int = Field(0, description="Total season raw points")
    total_net_points: int = Field(0, description="Total season net points after hits")
    total_hits_cost: int = Field(0, description="Total points spent on transfer hits")
    latest_rank: int | None = Field(None, description="Latest overall global rank")
    chips_used: list[dict[str, Any]] = Field(
        default_factory=list, description="Timeline of chips activated"
    )
    history: list[ManagerGameweekScore] = Field(
        default_factory=list, description="Chronological gameweek scorecards"
    )
