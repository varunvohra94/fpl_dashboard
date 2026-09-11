"""Integration tests for all FastAPI REST endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """Verify root endpoint returns service metadata."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "FPL Rival Intelligence API"
    assert data["documentation"] == "/docs"


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    """Verify healthcheck endpoint returns healthy status and DB connection."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_get_league_standings(async_client: AsyncClient):
    """Verify mini-league standings endpoint returns sorted standings with net points and rolling avg."""
    response = await async_client.get("/api/v1/league/standings?league_id=944559")
    assert response.status_code == 200
    data = response.json()
    assert data["league_id"] == 944559
    assert data["total_managers"] > 0
    assert len(data["standings"]) > 0

    first = data["standings"][0]
    assert "player_name" in first
    assert "entry_name" in first
    assert "net_points" in first
    assert "total_net_points" in first
    assert "rolling_3_avg" in first


@pytest.mark.asyncio
async def test_get_league_standings_with_explicit_gw(async_client: AsyncClient):
    """Verify standings endpoint returns data for an explicit gameweek."""
    response = await async_client.get("/api/v1/league/standings?league_id=944559&gameweek=1")
    assert response.status_code == 200
    data = response.json()
    assert data["gameweek"] == 1
    assert data["total_managers"] > 0


@pytest.mark.asyncio
async def test_get_league_transfers(async_client: AsyncClient):
    """Verify rival transfer feed returns formatted transfer items."""
    response = await async_client.get("/api/v1/league/transfers?league_id=944559&limit=20")
    assert response.status_code == 200
    data = response.json()
    assert data["league_id"] == 944559
    assert isinstance(data["transfers"], list)

    if data["transfers"]:
        t = data["transfers"][0]
        assert "manager_name" in t
        assert "element_in_name" in t
        assert "element_out_name" in t
        assert "transfer_time" in t


@pytest.mark.asyncio
async def test_get_manager_history_valid(async_client: AsyncClient):
    """Verify manager history endpoint returns profile and chronological scorecards."""
    # Using real manager ID 4410212 (Varun Vohra / Blue Nerdz)
    response = await async_client.get("/api/v1/managers/4410212/history")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 4410212
    assert data["player_name"] == "Varun Vohra"
    assert data["entry_name"] == "Blue Nerdz"
    assert len(data["history"]) >= 2

    gw1 = data["history"][0]
    assert gw1["gameweek"] == 1
    assert "net_points" in gw1
    assert "rolling_3_avg" in gw1


@pytest.mark.asyncio
async def test_get_manager_history_not_found(async_client: AsyncClient):
    """Verify 404 response when querying a non-existent manager ID."""
    response = await async_client.get("/api/v1/managers/99999999/history")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


@pytest.mark.asyncio
async def test_get_gameweeks_status(async_client: AsyncClient):
    """Verify gameweek status endpoint returns state machine flags."""
    response = await async_client.get("/api/v1/gameweeks/status")
    assert response.status_code == 200
    data = response.json()
    assert "latest_completed_gameweek" in data
    assert len(data["gameweeks"]) >= 2


@pytest.mark.asyncio
async def test_get_top_players(async_client: AsyncClient):
    """Verify top players endpoint returns player stats with xG, xA, and ICT metrics."""
    response = await async_client.get("/api/v1/players/top?gameweek=2&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["gameweek"] == 2
    assert len(data["players"]) <= 10

    if data["players"]:
        top_player = data["players"][0]
        assert "web_name" in top_player
        assert "team_short_name" in top_player
        assert "total_points" in top_player
        assert "expected_goals" in top_player
