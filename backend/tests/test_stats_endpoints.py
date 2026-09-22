"""Integration tests for Advanced Stats endpoints (Positional Breakdowns & Best Captaincy)."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_league_positional_stats_overall(async_client: AsyncClient):
    """Verify positional stats endpoint returns rankings and position percentage for overall season."""
    response = await async_client.get("/api/v1/stats/positions?league_id=944559&position=DEF")
    assert response.status_code == 200
    data = response.json()
    assert data["league_id"] == 944559
    assert data["position"] == "DEF"
    assert "managers" in data
    assert len(data["managers"]) > 0

    first = data["managers"][0]
    assert "manager_id" in first
    assert "player_name" in first
    assert "def_points" in first
    assert "mid_points" in first
    assert "fwd_points" in first
    assert "gkp_points" in first
    assert "position_percentage" in first
    assert "rank" in first


@pytest.mark.asyncio
async def test_get_league_positional_stats_midfielders(async_client: AsyncClient):
    """Verify positional stats correctly filters and ranks midfielders."""
    response = await async_client.get("/api/v1/stats/positions?league_id=944559&position=MID")
    assert response.status_code == 200
    data = response.json()
    assert data["position"] == "MID"
    assert len(data["managers"]) > 0


@pytest.mark.asyncio
async def test_get_league_positional_stats_explicit_gw(async_client: AsyncClient):
    """Verify positional stats can be filtered to a specific gameweek."""
    response = await async_client.get("/api/v1/stats/positions?league_id=944559&gameweek=1&position=FWD")
    assert response.status_code == 200
    data = response.json()
    assert data["gameweek"] == 1
    assert data["position"] == "FWD"


@pytest.mark.asyncio
async def test_get_league_captaincy_stats_overall(async_client: AsyncClient):
    """Verify captaincy stats endpoint returns rankings, haul counts, and success rates."""
    response = await async_client.get("/api/v1/stats/captains?league_id=944559")
    assert response.status_code == 200
    data = response.json()
    assert data["league_id"] == 944559
    assert "captains" in data
    assert len(data["captains"]) > 0

    first = data["captains"][0]
    assert "manager_id" in first
    assert "player_name" in first
    assert "total_captain_points" in first
    assert "average_captain_points" in first
    assert "hauls_count" in first
    assert "blanks_count" in first
    assert "captain_success_rate" in first
    assert "rank" in first


@pytest.mark.asyncio
async def test_get_league_captaincy_stats_explicit_gw(async_client: AsyncClient):
    """Verify captaincy stats for an explicit gameweek."""
    response = await async_client.get("/api/v1/stats/captains?league_id=944559&gameweek=1")
    assert response.status_code == 200
    data = response.json()
    assert data["gameweek"] == 1
    assert len(data["captains"]) > 0
