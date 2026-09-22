"""Endpoints for Advanced Mini-League Statistical Analytics (Positional Breakdowns & Best Captaincy)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models import Element, ElementGameweekHistory, Manager, ManagerPick, PipelineMetadata, Team
from app.schemas.stats import (
    CaptainPickItem,
    LeagueCaptaincyResponse,
    LeaguePositionalStatsResponse,
    ManagerCaptainStats,
    ManagerPositionBreakdown,
    TopScorerInPosition,
)

router = APIRouter()

# Mapping of element_type integer to string position
POSITION_TYPE_MAP = {
    1: "GKP",
    2: "DEF",
    3: "MID",
    4: "FWD",
}
POSITION_NAME_MAP = {
    "GKP": 1,
    "DEF": 2,
    "MID": 3,
    "FWD": 4,
}


@router.get("/positions", response_model=LeaguePositionalStatsResponse)
async def get_league_positional_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    league_id: Annotated[int, Query(description="FPL Mini-League ID")] = settings.FPL_LEAGUE_ID,
    gameweek: Annotated[
        int | None, Query(description="Gameweek filter (None or 0 = Overall Season)")
    ] = None,
    position: Annotated[
        str, Query(description="Active position tab ('DEF', 'MID', 'FWD', 'GKP', 'ALL')")
    ] = "DEF",
) -> LeaguePositionalStatsResponse:
    """
    Get manager rankings and points breakdowns by position (DEF, MID, FWD, GKP).
    Excludes benched players (multiplier == 0) and uses raw non-doubled points for captain picks.
    """
    normalized_pos = position.upper().strip()
    if normalized_pos not in ["DEF", "MID", "FWD", "GKP", "ALL"]:
        normalized_pos = "DEF"

    # 1. Fetch all managers in the mini-league
    managers_stmt = select(Manager).where(Manager.fpl_league_id == league_id)
    managers_res = await db.execute(managers_stmt)
    managers = managers_res.scalars().all()

    if not managers:
        raise HTTPException(
            status_code=404,
            detail=f"No managers found for league ID {league_id}.",
        )

    manager_ids = [m.id for m in managers]
    gw_filter = gameweek if (gameweek and gameweek > 0) else None

    # 2. Query active picks (multiplier > 0: starters & subbed-in players)
    # Join ElementGameweekHistory to ensure exact gameweek-by-gameweek player scores are used
    picks_query = (
        select(
            ManagerPick.manager_id,
            ManagerPick.gameweek,
            ManagerPick.element_id,
            func.coalesce(ElementGameweekHistory.total_points, ManagerPick.raw_points, 0).label(
                "raw_points"
            ),
            Element.element_type,
            Element.web_name,
            Team.short_name.label("team_name"),
        )
        .join(Element, ManagerPick.element_id == Element.id)
        .join(Team, Element.team_id == Team.id)
        .outerjoin(
            ElementGameweekHistory,
            (ElementGameweekHistory.element_id == ManagerPick.element_id)
            & (ElementGameweekHistory.gameweek == ManagerPick.gameweek),
        )
        .where(
            ManagerPick.manager_id.in_(manager_ids),
            ManagerPick.multiplier > 0,  # Exclude benched players!
        )
    )
    if gw_filter is not None:
        picks_query = picks_query.where(ManagerPick.gameweek == gw_filter)

    picks_res = await db.execute(picks_query)
    picks = picks_res.all()

    # 3. Aggregate points per manager across all positions
    manager_breakdowns: dict[int, ManagerPositionBreakdown] = {}
    manager_top_players: dict[int, dict[int, dict[int, dict[str, Any]]]] = {}

    for mgr in managers:
        manager_breakdowns[mgr.id] = ManagerPositionBreakdown(
            manager_id=mgr.id,
            player_name=mgr.player_name,
            entry_name=mgr.entry_name,
            rank=0,
            gkp_points=0,
            def_points=0,
            mid_points=0,
            fwd_points=0,
            total_position_points=0,
            active_position_points=0,
            position_percentage=0.0,
            top_scorers=[],
        )
        # manager_top_players[mgr.id][pos_type][element_id] = { ... }
        manager_top_players[mgr.id] = {1: {}, 2: {}, 3: {}, 4: {}}

    for p in picks:
        mb = manager_breakdowns.get(p.manager_id)
        if not mb:
            continue

        pos_type = p.element_type  # 1: GKP, 2: DEF, 3: MID, 4: FWD
        pts = p.raw_points

        if pos_type == 1:
            mb.gkp_points += pts
        elif pos_type == 2:
            mb.def_points += pts
        elif pos_type == 3:
            mb.mid_points += pts
        elif pos_type == 4:
            mb.fwd_points += pts

        # Track top scorers in position
        pos_dict = manager_top_players[p.manager_id][pos_type]
        if p.element_id not in pos_dict:
            pos_dict[p.element_id] = {
                "element_id": p.element_id,
                "web_name": p.web_name,
                "team_name": p.team_name,
                "points": 0,
                "gameweek": p.gameweek if gw_filter else None,
            }
        pos_dict[p.element_id]["points"] += pts

    # 4. Finalize totals, percentages, top scorers, and active points
    target_pos_type = POSITION_NAME_MAP.get(normalized_pos, 2)  # Default DEF = 2

    results: list[ManagerPositionBreakdown] = []
    for mgr_id, mb in manager_breakdowns.items():
        mb.total_position_points = mb.gkp_points + mb.def_points + mb.mid_points + mb.fwd_points

        if normalized_pos == "DEF":
            mb.active_position_points = mb.def_points
        elif normalized_pos == "MID":
            mb.active_position_points = mb.mid_points
        elif normalized_pos == "FWD":
            mb.active_position_points = mb.fwd_points
        elif normalized_pos == "GKP":
            mb.active_position_points = mb.gkp_points
        else:
            mb.active_position_points = mb.total_position_points

        if mb.total_position_points > 0:
            mb.position_percentage = round(
                (mb.active_position_points / mb.total_position_points) * 100.0, 1
            )
        else:
            mb.position_percentage = 0.0

        # Top 3 scorers for the active position
        pos_scorers = list(manager_top_players[mgr_id][target_pos_type].values())
        pos_scorers.sort(key=lambda x: x["points"], reverse=True)
        mb.top_scorers = [TopScorerInPosition(**s) for s in pos_scorers[:3]]

        results.append(mb)

    # 5. Sort descending by active position points (tiebreaker: total position points)
    results.sort(
        key=lambda m: (m.active_position_points, m.total_position_points),
        reverse=True,
    )

    # Assign sequential ranks
    for idx, r in enumerate(results):
        r.rank = idx + 1

    return LeaguePositionalStatsResponse(
        league_id=league_id,
        gameweek=gw_filter,
        position=normalized_pos,
        total_managers=len(results),
        managers=results,
    )


@router.get("/captains", response_model=LeagueCaptaincyResponse)
async def get_league_captaincy_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    league_id: Annotated[int, Query(description="FPL Mini-League ID")] = settings.FPL_LEAGUE_ID,
    gameweek: Annotated[
        int | None, Query(description="Gameweek filter (None or 0 = Overall Season)")
    ] = None,
) -> LeagueCaptaincyResponse:
    """
    Get rankings for Best Captain Picker across the season or in a specific gameweek.
    Tracks total captain multiplier points, raw points, average returns, and haul frequencies.
    """
    # 1. Fetch all managers in the mini-league
    managers_stmt = select(Manager).where(Manager.fpl_league_id == league_id)
    managers_res = await db.execute(managers_stmt)
    managers = managers_res.scalars().all()

    if not managers:
        raise HTTPException(
            status_code=404,
            detail=f"No managers found for league ID {league_id}.",
        )

    manager_ids = [m.id for m in managers]
    gw_filter = gameweek if (gameweek and gameweek > 0) else None

    # 2. Query captain picks (multiplier >= 2 or is_captain with multiplier > 0)
    # Join ElementGameweekHistory to ensure exact gameweek-by-gameweek player scores are used
    captain_query = (
        select(
            ManagerPick.manager_id,
            ManagerPick.gameweek,
            ManagerPick.element_id,
            func.coalesce(ElementGameweekHistory.total_points, ManagerPick.raw_points, 0).label(
                "raw_points"
            ),
            ManagerPick.multiplier,
            Element.web_name,
            Team.short_name.label("team_name"),
        )
        .join(Element, ManagerPick.element_id == Element.id)
        .join(Team, Element.team_id == Team.id)
        .outerjoin(
            ElementGameweekHistory,
            (ElementGameweekHistory.element_id == ManagerPick.element_id)
            & (ElementGameweekHistory.gameweek == ManagerPick.gameweek),
        )
        .where(
            ManagerPick.manager_id.in_(manager_ids),
            (ManagerPick.multiplier >= 2)
            | (ManagerPick.is_captain & (ManagerPick.multiplier > 0)),
        )
        .order_by(ManagerPick.gameweek.asc())
    )

    cap_res = await db.execute(captain_query)
    captain_rows = cap_res.all()

    # 3. Organize captain choices per manager
    manager_stats_map: dict[int, ManagerCaptainStats] = {}
    for mgr in managers:
        manager_stats_map[mgr.id] = ManagerCaptainStats(
            manager_id=mgr.id,
            player_name=mgr.player_name,
            entry_name=mgr.entry_name,
            rank=0,
            total_captain_points=0,
            total_raw_points=0,
            average_captain_points=0.0,
            hauls_count=0,
            blanks_count=0,
            captain_success_rate=0.0,
            current_pick=None,
            history=[],
        )

    for row in captain_rows:
        ms = manager_stats_map.get(row.manager_id)
        if not ms:
            continue

        raw_pts = row.raw_points
        mult = max(row.multiplier, 2)
        tot_pts = raw_pts * mult
        is_haul = raw_pts >= 10
        is_blank = raw_pts <= 3

        item = CaptainPickItem(
            gameweek=row.gameweek,
            element_id=row.element_id,
            player_name=row.web_name,
            team_name=row.team_name,
            opponent_name=None,
            raw_points=raw_pts,
            multiplier=mult,
            total_points=tot_pts,
            is_haul=is_haul,
            is_blank=is_blank,
        )
        ms.history.append(item)

    # 4. Filter and aggregate metrics based on requested scope
    results: list[ManagerCaptainStats] = []
    for mgr in managers:
        ms = manager_stats_map[mgr.id]

        if gw_filter is not None:
            # Single Gameweek scope
            filtered_history = [p for p in ms.history if p.gameweek == gw_filter]
            if filtered_history:
                ms.current_pick = filtered_history[0]
                ms.total_captain_points = filtered_history[0].total_points
                ms.total_raw_points = filtered_history[0].raw_points
                ms.average_captain_points = float(filtered_history[0].total_points)
                ms.hauls_count = 1 if filtered_history[0].is_haul else 0
                ms.blanks_count = 1 if filtered_history[0].is_blank else 0
                ms.captain_success_rate = 100.0 if not filtered_history[0].is_blank else 0.0
            else:
                ms.current_pick = None
                ms.total_captain_points = 0
                ms.total_raw_points = 0
                ms.average_captain_points = 0.0
                ms.hauls_count = 0
                ms.blanks_count = 0
                ms.captain_success_rate = 0.0
            ms.history = filtered_history
        else:
            # Overall Season scope
            if ms.history:
                ms.current_pick = ms.history[-1]  # Latest GW pick
                ms.total_captain_points = sum(p.total_points for p in ms.history)
                ms.total_raw_points = sum(p.raw_points for p in ms.history)
                ms.average_captain_points = round(
                    ms.total_captain_points / len(ms.history), 1
                )
                ms.hauls_count = sum(1 for p in ms.history if p.is_haul)
                ms.blanks_count = sum(1 for p in ms.history if p.is_blank)
                non_blanks = len(ms.history) - ms.blanks_count
                ms.captain_success_rate = round(
                    (non_blanks / len(ms.history)) * 100.0, 1
                )
            else:
                ms.current_pick = None
                ms.total_captain_points = 0
                ms.total_raw_points = 0
                ms.average_captain_points = 0.0
                ms.hauls_count = 0
                ms.blanks_count = 0
                ms.captain_success_rate = 0.0

        results.append(ms)

    # 5. Sort descending by total captain points (tiebreaker: total raw points, hauls)
    results.sort(
        key=lambda m: (m.total_captain_points, m.total_raw_points, m.hauls_count),
        reverse=True,
    )

    # Assign sequential ranks
    for idx, r in enumerate(results):
        r.rank = idx + 1

    return LeagueCaptaincyResponse(
        league_id=league_id,
        gameweek=gw_filter,
        total_managers=len(results),
        captains=results,
    )
