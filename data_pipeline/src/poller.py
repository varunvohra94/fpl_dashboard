"""Orchestrator and automated polling engine for FPL data ingestion."""

import asyncio
import logging
from typing import Any

from app.models import PipelineMetadata

from .fpl_client import FPLClient
from .loader import PipelineLoader
from .transformer import DataTransformer

logger = logging.getLogger(__name__)


class FPLPipelineRunner:
    """Orchestrates end-to-end extraction, transformation, and loading of FPL data."""

    def __init__(
        self,
        fpl_client: FPLClient | None = None,
        loader: PipelineLoader | None = None,
    ) -> None:
        self.client = fpl_client or FPLClient()
        self.loader = loader or PipelineLoader()
        self.transformer = DataTransformer()

    async def sync_bootstrap(self) -> dict[str, Any]:
        """Fetch bootstrap-static payload and sync teams, elements, and pipeline metadata."""
        logger.info("Fetching master bootstrap-static payload from FPL API...")
        bootstrap_data = await self.client.get_bootstrap_static()

        teams = self.transformer.transform_teams(bootstrap_data)
        elements = self.transformer.transform_elements(bootstrap_data)
        meta_records = self.transformer.transform_pipeline_metadata(bootstrap_data)

        async with await self.loader.get_session() as session, session.begin():
            await self.loader.load_teams(session, teams)
            await self.loader.load_elements(session, elements)
            await self.loader.sync_pipeline_metadata(session, meta_records)

        logger.info(
            f"Bootstrap sync complete: {len(teams)} teams, {len(elements)} players, "
            f"{len(meta_records)} gameweek states."
        )
        return bootstrap_data

    async def ingest_league(
        self,
        league_id: int,
        target_gw: int | None = None,
        force: bool = False,
    ) -> dict[str, Any]:
        """
        Execute full batch ingestion for a mini-league.
        Extracts standings, manager histories, scores, rolling averages, and transfers.
        """
        # 1. Ensure master static data & metadata are up to date
        bootstrap_data = await self.sync_bootstrap()

        # 2. Determine target gameweek
        events = bootstrap_data.get("events", [])
        if target_gw is None:
            # Find the latest finished and data_checked gameweek
            checked_events = [e for e in events if e.get("finished") and e.get("data_checked")]
            if not checked_events:
                logger.warning("No gameweeks have finished with data_checked == True.")
                return {"status": "SKIPPED", "reason": "No finalized gameweek found"}
            target_gw = checked_events[-1]["id"]

        logger.info(f"Starting ingestion for League ID: {league_id}, Gameweek: {target_gw}...")

        # 3. Check existing pipeline status for idempotency
        async with await self.loader.get_session() as session:
            meta = await session.get(PipelineMetadata, target_gw)
            if meta and meta.pipeline_run_status == "COMPLETED" and not force:
                logger.info(
                    f"GW{target_gw} is already marked COMPLETED in database. Skipping (use force=True to re-run)."
                )
                return {"status": "SKIPPED", "gameweek": target_gw, "reason": "Already completed"}

        # 4. Update status to RUNNING
        async with await self.loader.get_session() as session:
            await self.loader.update_pipeline_status(session, target_gw, "RUNNING")

        try:
            # 5. Fetch mini-league standings
            logger.info(f"Fetching standings for mini-league {league_id}...")
            standings_data = await self.client.get_league_standings(league_id)
            managers = self.transformer.transform_managers(standings_data, league_id)

            if not managers:
                logger.warning(f"No managers found in mini-league {league_id}.")
                return {"status": "EMPTY", "gameweek": target_gw}

            # 6. Fetch manager histories and transfers concurrently
            all_scores: list[dict[str, Any]] = []
            all_transfers: list[dict[str, Any]] = []

            async def _fetch_manager_data(mgr: dict[str, Any]) -> None:
                mgr_id = mgr["id"]
                try:
                    history = await self.client.get_manager_history(mgr_id)
                    scores = self.transformer.transform_gameweek_scores(mgr_id, history)
                    all_scores.extend(scores)
                except Exception as exc:  # noqa: BLE001
                    logger.error(f"Error fetching history for manager {mgr_id}: {exc}")

                try:
                    transfers_raw = await self.client.get_manager_transfers(mgr_id)
                    transfers = self.transformer.transform_transfers(mgr_id, transfers_raw)
                    all_transfers.extend(transfers)
                except Exception as exc:  # noqa: BLE001
                    logger.error(f"Error fetching transfers for manager {mgr_id}: {exc}")

            await asyncio.gather(*[_fetch_manager_data(m) for m in managers])

            # 7. Atomically persist managers, scores, and transfers
            async with await self.loader.get_session() as session, session.begin():
                await self.loader.load_managers(session, managers)
                await self.loader.load_gameweek_scores(session, all_scores)
                await self.loader.load_transfers(session, all_transfers)

            # 8. Mark pipeline status as COMPLETED
            async with await self.loader.get_session() as session:
                await self.loader.update_pipeline_status(session, target_gw, "COMPLETED")

            summary = {
                "status": "COMPLETED",
                "gameweek": target_gw,
                "managers_count": len(managers),
                "scores_records": len(all_scores),
                "transfers_records": len(all_transfers),
            }
            logger.info(f"Ingestion successfully finished: {summary}")
            return summary

        except Exception as exc:
            logger.exception(f"Pipeline failure during GW{target_gw} ingestion")
            async with await self.loader.get_session() as session:
                await self.loader.update_pipeline_status(
                    session, target_gw, "FAILED", error_message=str(exc)
                )
            raise

    async def poll_and_execute(self, league_id: int, force: bool = False) -> dict[str, Any]:
        """
        Scheduled poller entrypoint:
        Queries bootstrap-static, inspects current gameweek, and runs ETL if ready.
        """
        logger.info("Executing scheduled poll check...")
        return await self.ingest_league(league_id=league_id, force=force)
