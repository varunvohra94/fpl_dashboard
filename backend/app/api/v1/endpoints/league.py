"""Endpoints for mini-league standings and rival transfer feeds."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.config import settings
from app.db.session import get_db
from app.models import Element, GameweekScore, Manager, PipelineMetadata, Team, Transfer
from app.schemas.standings import LeagueStandingsResponse, StandingsEntry
from app.schemas.transfers import LeagueTransfersResponse, TransferItem

router = APIRouter()


@router.get("/standings", response_model=LeagueStandingsResponse)
async def get_league_standings(
    db: Annotated[AsyncSession, Depends(get_db)],
    league_id: Annotated[int, Query(description="FPL Mini-League ID")] = settings.FPL_LEAGUE_ID,
    gameweek: Annotated[
        int | None, Query(description="Target Gameweek (defaults to latest finalized)")
    ] = None,
) -> LeagueStandingsResponse:
    """
    Get customized mini-league standings with net score calculations,
    rolling 3-game average form, and transfer hit penalties.
    """
    # 1. Resolve target gameweek if not explicitly provided
    if gameweek is None:
        latest_gw_stmt = (
            select(PipelineMetadata.gameweek)
            .where(PipelineMetadata.finished.is_(True), PipelineMetadata.data_checked.is_(True))
            .order_by(PipelineMetadata.gameweek.desc())
            .limit(1)
        )
        gw_result = await db.execute(latest_gw_stmt)
        resolved_gw = gw_result.scalar_one_or_none()
        if resolved_gw is None:
            # Fallback to max gameweek present in gameweek_scores
            max_gw_stmt = select(func.max(GameweekScore.gameweek))
            max_gw_result = await db.execute(max_gw_stmt)
            resolved_gw = max_gw_result.scalar_one_or_none() or 1
        gameweek = resolved_gw

    # 2. Fetch managers in mini-league
    managers_stmt = select(Manager).where(Manager.fpl_league_id == league_id)
    managers_res = await db.execute(managers_stmt)
    managers = managers_res.scalars().all()

    if not managers:
        raise HTTPException(
            status_code=404,
            detail=f"No managers found for league ID {league_id}.",
        )

    # 3. Fetch scores for the target gameweek
    manager_ids = [m.id for m in managers]
    scores_stmt = select(GameweekScore).where(
        GameweekScore.manager_id.in_(manager_ids),
        GameweekScore.gameweek == gameweek,
    )
    scores_res = await db.execute(scores_stmt)
    scores_by_manager = {s.manager_id: s for s in scores_res.scalars().all()}

    # 4. Fetch cumulative net scores and hits up to the target gameweek
    cum_stmt = (
        select(
            GameweekScore.manager_id,
            func.sum(GameweekScore.net_points).label("total_net_points"),
            func.sum(GameweekScore.event_transfers_cost).label("total_hits_cost"),
        )
        .where(
            GameweekScore.manager_id.in_(manager_ids),
            GameweekScore.gameweek <= gameweek,
        )
        .group_by(GameweekScore.manager_id)
    )
    cum_res = await db.execute(cum_stmt)
    cum_by_manager = {row.manager_id: row for row in cum_res.all()}

    # 5. Assemble standings entries
    entries: list[StandingsEntry] = []
    for mgr in managers:
        score = scores_by_manager.get(mgr.id)
        cum_data = cum_by_manager.get(mgr.id)

        raw_pts = score.points if score else 0
        hits_cost = score.event_transfers_cost if score else 0
        net_pts = score.net_points if score else 0
        tot_pts = score.total_points if score else (cum_data.total_net_points if cum_data else 0)
        tot_net_pts = (
            int(cum_data.total_net_points) if cum_data and cum_data.total_net_points else tot_pts
        )

        entry = StandingsEntry(
            manager_id=mgr.id,
            player_name=mgr.player_name,
            entry_name=mgr.entry_name,
            gameweek=gameweek,
            points=raw_pts,
            event_transfers=score.event_transfers if score else 0,
            event_transfers_cost=hits_cost,
            net_points=net_pts,
            total_points=tot_pts,
            total_net_points=tot_net_pts,
            rolling_3_avg=float(score.rolling_3_avg)
            if score and score.rolling_3_avg is not None
            else None,
            last_3_gw_total=score.last_3_gw_total if score else None,
            rank=score.rank if score else None,
            overall_rank=score.overall_rank if score else None,
            bank=round((score.bank if score else 0) / 10.0, 1),
            team_value=round((score.team_value if score else 0) / 10.0, 1),
            chip_used=score.chip_used if score else None,
            metrics=score.metrics if score else {},
        )
        entries.append(entry)

    # Sort standings by total net points descending (and net points descending as tiebreaker)
    entries.sort(key=lambda e: (e.total_net_points, e.net_points), reverse=True)

    # Assign sequential Mini-League rank (1 to N)
    for idx, entry in enumerate(entries):
        entry.rank = idx + 1

    return LeagueStandingsResponse(
        league_id=league_id,
        gameweek=gameweek,
        standings=entries,
        total_managers=len(entries),
    )


@router.get("/transfers", response_model=LeagueTransfersResponse)
async def get_league_transfers(
    db: Annotated[AsyncSession, Depends(get_db)],
    league_id: Annotated[int, Query(description="FPL Mini-League ID")] = settings.FPL_LEAGUE_ID,
    gameweek: Annotated[int | None, Query(description="Filter by specific gameweek")] = None,
    limit: Annotated[int, Query(description="Max transfers to return", ge=1, le=200)] = 50,
) -> LeagueTransfersResponse:
    """
    Get the Rival News Feed containing transfers executed by all managers in the mini-league.
    """
    element_in = aliased(Element)
    element_out = aliased(Element)
    team_in = aliased(Team)
    team_out = aliased(Team)

    stmt = (
        select(
            Transfer,
            Manager.player_name.label("manager_name"),
            Manager.entry_name.label("entry_name"),
            element_in.web_name.label("in_web_name"),
            team_in.short_name.label("in_team_short"),
            element_out.web_name.label("out_web_name"),
            team_out.short_name.label("out_team_short"),
        )
        .join(Manager, Transfer.manager_id == Manager.id)
        .join(element_in, Transfer.element_in_id == element_in.id)
        .join(team_in, element_in.team_id == team_in.id)
        .join(element_out, Transfer.element_out_id == element_out.id)
        .join(team_out, element_out.team_id == team_out.id)
        .where(Manager.fpl_league_id == league_id)
    )

    if gameweek is not None:
        stmt = stmt.where(Transfer.gameweek == gameweek)

    stmt = stmt.order_by(Transfer.transfer_time.desc()).limit(limit)

    res = await db.execute(stmt)
    rows = res.all()

    items: list[TransferItem] = []
    for row in rows:
        t: Transfer = row[0]
        items.append(
            TransferItem(
                id=t.id,
                manager_id=t.manager_id,
                manager_name=row.manager_name,
                entry_name=row.entry_name,
                gameweek=t.gameweek,
                element_in_id=t.element_in_id,
                element_in_name=row.in_web_name,
                element_in_team=row.in_team_short,
                element_in_cost=round(t.element_in_cost / 10.0, 1),
                element_out_id=t.element_out_id,
                element_out_name=row.out_web_name,
                element_out_team=row.out_team_short,
                element_out_cost=round(t.element_out_cost / 10.0, 1),
                transfer_time=t.transfer_time,
            )
        )

    return LeagueTransfersResponse(
        league_id=league_id,
        gameweek=gameweek,
        transfers=items,
        total_transfers=len(items),
    )
