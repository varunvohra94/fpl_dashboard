"""Endpoints for individual manager profile, scorecard history, and analytics."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import GameweekScore, Manager
from app.schemas.managers import ManagerGameweekScore, ManagerProfileResponse

router = APIRouter()


@router.get("/{manager_id}/history", response_model=ManagerProfileResponse)
async def get_manager_history(
    manager_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ManagerProfileResponse:
    """
    Get a manager's complete season scorecard, rolling averages, hit costs, and chip timeline.
    """
    # 1. Fetch manager profile
    manager = await db.get(Manager, manager_id)
    if not manager:
        raise HTTPException(
            status_code=404,
            detail=f"Manager with ID {manager_id} not found.",
        )

    # 2. Fetch all gameweek scores
    scores_stmt = (
        select(GameweekScore)
        .where(GameweekScore.manager_id == manager_id)
        .order_by(GameweekScore.gameweek.asc())
    )
    scores_res = await db.execute(scores_stmt)
    scores = scores_res.scalars().all()

    # 3. Calculate cumulative statistics & chip usage
    history_entries: list[ManagerGameweekScore] = []
    total_raw_points = 0
    total_net_points = 0
    total_hits_cost = 0
    chips_used: list[dict[str, Any]] = []

    for s in scores:
        total_raw_points = s.total_points
        total_net_points += s.net_points
        total_hits_cost += s.event_transfers_cost

        if s.chip_used:
            chips_used.append(
                {
                    "gameweek": s.gameweek,
                    "chip": s.chip_used,
                }
            )

        history_entries.append(
            ManagerGameweekScore(
                gameweek=s.gameweek,
                points=s.points,
                event_transfers=s.event_transfers,
                event_transfers_cost=s.event_transfers_cost,
                net_points=s.net_points,
                total_points=s.total_points,
                rank=s.rank,
                overall_rank=s.overall_rank,
                percentile_rank=s.percentile_rank,
                bank=round(s.bank / 10.0, 1),
                team_value=round(s.team_value / 10.0, 1),
                chip_used=s.chip_used,
                rolling_3_avg=float(s.rolling_3_avg) if s.rolling_3_avg is not None else None,
                last_3_gw_total=s.last_3_gw_total,
                metrics=s.metrics,
            )
        )

    latest_rank = scores[-1].overall_rank if scores else None

    return ManagerProfileResponse(
        id=manager.id,
        player_name=manager.player_name,
        player_first_name=manager.player_first_name,
        player_last_name=manager.player_last_name,
        entry_name=manager.entry_name,
        fpl_league_id=manager.fpl_league_id,
        total_points=total_raw_points,
        total_net_points=total_net_points,
        total_hits_cost=total_hits_cost,
        latest_rank=latest_rank,
        chips_used=chips_used,
        history=history_entries,
    )
