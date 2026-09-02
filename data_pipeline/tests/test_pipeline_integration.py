"""Integration and orchestration tests for the end-to-end ETL Pipeline."""

import pytest
from backend.app.models import PipelineMetadata
from sqlalchemy import select

from data_pipeline.src.fpl_client import FPLClient
from data_pipeline.src.loader import PipelineLoader
from data_pipeline.src.poller import FPLPipelineRunner


class MockFPLClient(FPLClient):
    """Mock client returning deterministic FPL fixtures for integration testing."""

    async def get_bootstrap_static(self):
        return {
            "teams": [
                {"id": 1, "name": "Arsenal", "short_name": "ARS", "code": 3},
                {"id": 2, "name": "Aston Villa", "short_name": "AVL", "code": 7},
            ],
            "elements": [
                {
                    "id": 350,
                    "web_name": "Haaland",
                    "first_name": "Erling",
                    "second_name": "Haaland",
                    "element_type": 4,
                    "team": 1,
                    "now_cost": 150,
                },
                {
                    "id": 19,
                    "web_name": "Saka",
                    "first_name": "Bukayo",
                    "second_name": "Saka",
                    "element_type": 3,
                    "team": 1,
                    "now_cost": 100,
                },
            ],
            "events": [
                {
                    "id": 1,
                    "finished": True,
                    "data_checked": True,
                    "is_current": False,
                    "is_next": False,
                    "is_previous": True,
                },
                {
                    "id": 2,
                    "finished": True,
                    "data_checked": True,
                    "is_current": True,
                    "is_next": False,
                    "is_previous": False,
                },
                {
                    "id": 3,
                    "finished": False,
                    "data_checked": False,
                    "is_current": False,
                    "is_next": True,
                    "is_previous": False,
                },
            ],
        }

    async def get_league_standings(self, league_id: int):
        return {
            "standings": {
                "results": [
                    {
                        "entry": 944559,
                        "player_name": "Varun Vohra",
                        "entry_name": "Klopp's Kids",
                    },
                ]
            }
        }

    async def get_manager_history(self, entry_id: int):
        return {
            "current": [
                {
                    "event": 1,
                    "points": 70,
                    "total_points": 70,
                    "event_transfers": 0,
                    "event_transfers_cost": 0,
                    "rank": 10000,
                    "overall_rank": 10000,
                    "bank": 15,
                    "value": 1000,
                    "points_on_bench": 5,
                },
                {
                    "event": 2,
                    "points": 65,
                    "total_points": 131,
                    "event_transfers": 2,
                    "event_transfers_cost": 4,
                    "rank": 5000,
                    "overall_rank": 8000,
                    "bank": 10,
                    "value": 1005,
                    "points_on_bench": 7,
                },
            ],
            "chips": [{"event": 2, "name": "3xc", "time": "2024-08-25T11:00:00Z"}],
        }

    async def get_manager_transfers(self, entry_id: int):
        return [
            {
                "element_in": 350,
                "element_in_cost": 150,
                "element_out": 19,
                "element_out_cost": 100,
                "event": 2,
                "time": "2024-08-24T18:00:00Z",
            }
        ]


class MockPipelineLoader(PipelineLoader):
    """In-memory loader mock for validating orchestration without requiring live PostgreSQL container."""

    def __init__(self):
        self.teams = []
        self.elements = []
        self.managers = []
        self.scores = []
        self.transfers = []
        self.metadata = {}
        self.statuses = {}

    async def get_session(self):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    def begin(self):
        return self

    async def get(self, model, pk):
        if model == PipelineMetadata:
            m = self.metadata.get(pk)
            if m:
                from types import SimpleNamespace

                return SimpleNamespace(**m)
        return None

    async def load_teams(self, session, teams):
        self.teams.extend(teams)
        return len(teams)

    async def load_elements(self, session, elements):
        self.elements.extend(elements)
        return len(elements)

    async def load_managers(self, session, managers):
        self.managers.extend(managers)
        return len(managers)

    async def load_gameweek_scores(self, session, scores):
        self.scores.extend(scores)
        return len(scores)

    async def load_transfers(self, session, transfers):
        self.transfers.extend(transfers)
        return len(transfers)

    async def sync_pipeline_metadata(self, session, metadata_list):
        for m in metadata_list:
            self.metadata[m["gameweek"]] = {**m, "pipeline_run_status": "PENDING"}
        return len(metadata_list)

    async def update_pipeline_status(self, session, gameweek, status, error_message=None):
        self.statuses[gameweek] = status
        if gameweek in self.metadata:
            self.metadata[gameweek]["pipeline_run_status"] = status


@pytest.mark.asyncio
async def test_pipeline_runner_orchestration():
    """Verify end-to-end orchestration logic through FPLPipelineRunner."""
    mock_client = MockFPLClient()
    mock_loader = MockPipelineLoader()
    runner = FPLPipelineRunner(fpl_client=mock_client, loader=mock_loader)

    # 1. Test bootstrap sync
    bootstrap = await runner.sync_bootstrap()
    assert len(bootstrap["teams"]) == 2
    assert len(mock_loader.teams) == 2
    assert len(mock_loader.elements) == 2

    # 2. Test full league ingestion
    result = await runner.ingest_league(league_id=944559, target_gw=2, force=True)
    assert result["status"] == "COMPLETED"
    assert result["gameweek"] == 2
    assert result["managers_count"] == 1
    assert result["scores_records"] == 2
    assert result["transfers_records"] == 1

    # Verify score calculations
    gw1 = next(s for s in mock_loader.scores if s["gameweek"] == 1)
    assert gw1["net_points"] == 70
    assert gw1["rolling_3_avg"] == 70.0

    gw2 = next(s for s in mock_loader.scores if s["gameweek"] == 2)
    assert gw2["net_points"] == 61
    assert gw2["event_transfers_cost"] == 4
    assert gw2["chip_used"] == "3xc"
    assert gw2["metrics"]["running_net_points"] == 131

    # Verify status completed
    assert mock_loader.statuses[2] == "COMPLETED"


@pytest.mark.asyncio
async def test_live_postgresql_ingestion():
    """Test against live PostgreSQL container if reachable on localhost:5432."""
    loader = PipelineLoader()
    try:
        async with await loader.get_session() as session:
            await session.execute(select(1))
    except Exception:  # noqa: BLE001
        pytest.skip("PostgreSQL container not running on localhost:5432 (Docker Desktop idle).")

    mock_client = MockFPLClient()
    runner = FPLPipelineRunner(fpl_client=mock_client, loader=loader)

    try:
        result = await runner.ingest_league(league_id=944559, target_gw=2, force=True)
        assert result["status"] == "COMPLETED"
    finally:
        await loader.close()
