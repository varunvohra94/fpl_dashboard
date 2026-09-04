"""Endpoints for gameweek status and ingestion pipeline health."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import PipelineMetadata
from app.schemas.gameweeks import GameweekState, PipelineStatusResponse

router = APIRouter()


@router.get("/status", response_model=PipelineStatusResponse)
async def get_gameweek_status(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PipelineStatusResponse:
    """
    Get the state machine status of all 38 Premier League gameweeks,
    including current gameweek, latest finalized gameweek, and pipeline ingestion states.
    """
    stmt = select(PipelineMetadata).order_by(PipelineMetadata.gameweek.asc())
    res = await db.execute(stmt)
    metadata_list = res.scalars().all()

    current_gw: int | None = None
    latest_completed_gw: int | None = None
    next_gw: int | None = None
    states: list[GameweekState] = []

    for m in metadata_list:
        if m.is_current:
            current_gw = m.gameweek
        if m.is_next:
            next_gw = m.gameweek
        if m.finished and m.data_checked:
            latest_completed_gw = m.gameweek

        states.append(
            GameweekState(
                gameweek=m.gameweek,
                is_current=m.is_current,
                is_next=m.is_next,
                is_previous=m.is_previous,
                finished=m.finished,
                data_checked=m.data_checked,
                pipeline_run_status=m.pipeline_run_status,
                last_polled_at=m.last_polled_at,
                last_processed_at=m.last_processed_at,
            )
        )

    return PipelineStatusResponse(
        current_gameweek=current_gw,
        latest_completed_gameweek=latest_completed_gw,
        next_gameweek=next_gw,
        gameweeks=states,
    )
