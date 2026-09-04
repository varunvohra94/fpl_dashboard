"""Pydantic schemas for gameweek status and pipeline state machine."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GameweekState(BaseModel):
    """Gameweek orchestration state."""

    model_config = ConfigDict(from_attributes=True)

    gameweek: int = Field(..., description="Gameweek number (1-38)")
    is_current: bool = Field(False, description="Is currently active gameweek")
    is_next: bool = Field(False, description="Is next upcoming gameweek")
    is_previous: bool = Field(False, description="Is immediately preceding gameweek")
    finished: bool = Field(False, description="All 10 matches in gameweek completed")
    data_checked: bool = Field(False, description="FPL has verified bonus points and autosubs")
    pipeline_run_status: str = Field(
        "PENDING", description="Status: PENDING, RUNNING, COMPLETED, FAILED"
    )
    last_polled_at: datetime | None = Field(None, description="Last polled timestamp")
    last_processed_at: datetime | None = Field(
        None, description="Last successful ingestion timestamp"
    )


class PipelineStatusResponse(BaseModel):
    """Response envelope for system gameweek and pipeline state."""

    current_gameweek: int | None = Field(None, description="Active gameweek number")
    latest_completed_gameweek: int | None = Field(
        None, description="Most recent gameweek with data_checked == True"
    )
    next_gameweek: int | None = Field(None, description="Next upcoming gameweek")
    gameweeks: list[GameweekState] = Field(
        default_factory=list, description="All 38 gameweek states"
    )
