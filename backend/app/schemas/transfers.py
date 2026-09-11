"""Pydantic schemas for rival transfer news feed."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TransferItem(BaseModel):
    """Represents a single transfer event by a mini-league rival."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Unique transfer ID")
    manager_id: int = Field(..., description="FPL Manager entry ID")
    manager_name: str = Field(..., description="Manager real name")
    entry_name: str = Field(..., description="Manager team name")
    gameweek: int = Field(..., description="Gameweek the transfer was played in")
    element_in_id: int = Field(..., description="Player brought in ID")
    element_in_name: str = Field(..., description="Player brought in web name (e.g. Haaland)")
    element_in_team: str = Field(..., description="Player brought in club (e.g. MCI)")
    element_in_cost: float = Field(..., description="Purchase price in £m (e.g. 15.2)")
    element_out_id: int = Field(..., description="Player sold ID")
    element_out_name: str = Field(..., description="Player sold web name (e.g. Saka)")
    element_out_team: str = Field(..., description="Player sold club (e.g. ARS)")
    element_out_cost: float = Field(..., description="Sale price in £m (e.g. 10.1)")
    transfer_time: datetime = Field(..., description="ISO timestamp when transfer was executed")


class LeagueTransfersResponse(BaseModel):
    """API response envelope for mini-league transfer news feed."""

    league_id: int = Field(..., description="FPL Mini-League ID")
    gameweek: int | None = Field(None, description="Gameweek filter if specified")
    transfers: list[TransferItem] = Field(
        default_factory=list, description="List of transfers ordered newest first"
    )
    total_transfers: int = Field(..., description="Total count of transfers returned")
