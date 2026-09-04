"""API v1 Router aggregation."""

from fastapi import APIRouter

from app.api.v1.endpoints import gameweeks, league, managers, players

api_router = APIRouter()

api_router.include_router(league.router, prefix="/league", tags=["Mini-League & Rivalries"])
api_router.include_router(managers.router, prefix="/managers", tags=["Managers & Scorecards"])
api_router.include_router(
    gameweeks.router, prefix="/gameweeks", tags=["Gameweek Status & Orchestration"]
)
api_router.include_router(
    players.router, prefix="/players", tags=["Player Performance & Analytics"]
)
