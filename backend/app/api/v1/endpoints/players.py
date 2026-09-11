"""Endpoints for Premier League top player matchday performances and statistics."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Element, ElementGameweekHistory, PipelineMetadata, Team
from app.schemas.players import PlayerPerformanceItem, TopPlayersResponse

router = APIRouter()

POSITION_MAP = {
    1: "GKP",
    2: "DEF",
    3: "MID",
    4: "FWD",
}


@router.get("/top", response_model=TopPlayersResponse)
async def get_top_players(
    db: Annotated[AsyncSession, Depends(get_db)],
    gameweek: Annotated[
        int | None, Query(description="Target Gameweek (defaults to latest finalized)")
    ] = None,
    limit: Annotated[int, Query(description="Number of top players to return", ge=1, le=100)] = 20,
) -> TopPlayersResponse:
    """
    Get top performing Premier League players for a given gameweek,
    including xG, xA, Threat, Influence, Creativity, and Bonus points.
    """
    # 1. Resolve gameweek if not provided
    if gameweek is None:
        latest_gw_stmt = (
            select(PipelineMetadata.gameweek)
            .where(PipelineMetadata.finished.is_(True), PipelineMetadata.data_checked.is_(True))
            .order_by(PipelineMetadata.gameweek.desc())
            .limit(1)
        )
        gw_res = await db.execute(latest_gw_stmt)
        gameweek = gw_res.scalar_one_or_none() or 1

    # 2. Query top players for target gameweek
    stmt = (
        select(ElementGameweekHistory, Element, Team)
        .join(Element, ElementGameweekHistory.element_id == Element.id)
        .join(Team, Element.team_id == Team.id)
        .where(ElementGameweekHistory.gameweek == gameweek)
        .order_by(ElementGameweekHistory.total_points.desc(), ElementGameweekHistory.bps.desc())
        .limit(limit)
    )

    res = await db.execute(stmt)
    rows = res.all()

    players: list[PlayerPerformanceItem] = []
    for hist, elem, team in rows:
        metrics = hist.metrics or {}
        players.append(
            PlayerPerformanceItem(
                element_id=elem.id,
                web_name=elem.web_name,
                first_name=elem.first_name,
                second_name=elem.second_name,
                position=POSITION_MAP.get(elem.element_type, "MID"),
                team_name=team.name,
                team_short_name=team.short_name,
                now_cost=round(elem.now_cost / 10.0, 1),
                gameweek=hist.gameweek,
                minutes=hist.minutes,
                total_points=hist.total_points,
                goals_scored=hist.goals_scored,
                assists=hist.assists,
                clean_sheets=hist.clean_sheets,
                goals_conceded=hist.goals_conceded,
                bonus=hist.bonus,
                bps=hist.bps,
                expected_goals=float(hist.expected_goals)
                if hist.expected_goals is not None
                else None,
                expected_assists=float(hist.expected_assists)
                if hist.expected_assists is not None
                else None,
                expected_goal_involvements=(
                    float(hist.expected_goal_involvements)
                    if hist.expected_goal_involvements is not None
                    else None
                ),
                expected_goals_conceded=(
                    float(hist.expected_goals_conceded)
                    if hist.expected_goals_conceded is not None
                    else None
                ),
                threat=float(metrics.get("threat")) if metrics.get("threat") is not None else None,
                influence=float(metrics.get("influence"))
                if metrics.get("influence") is not None
                else None,
                creativity=float(metrics.get("creativity"))
                if metrics.get("creativity") is not None
                else None,
                ict_index=float(metrics.get("ict_index"))
                if metrics.get("ict_index") is not None
                else None,
                metrics=metrics,
            )
        )

    return TopPlayersResponse(
        gameweek=gameweek,
        players=players,
        count=len(players),
    )
