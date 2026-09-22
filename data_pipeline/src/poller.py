"""Orchestrator and automated polling engine for FPL data ingestion."""

import asyncio
import logging
from typing import Any

from sqlalchemy import func, select

from app.models import ManagerPick, PipelineMetadata

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
        data = await self.client.get_bootstrap_static()

        teams = self.transformer.transform_teams(data)
        elements = self.transformer.transform_elements(data)
        events = data.get("events", [])

        async with await self.loader.get_session() as session, session.begin():
            await self.loader.load_teams(session, teams)
            await self.loader.load_elements(session, elements)

            for event in events:
                gw_id = event["id"]
                is_finished = event.get("finished", False)
                is_checked = event.get("data_checked", False)
                is_current = event.get("is_current", False)

                status = "COMPLETED" if (is_finished and is_checked) else "PENDING"
                if is_current and not is_finished:
                    status = "RUNNING"

                meta = await session.get(PipelineMetadata, gw_id)
                if not meta:
                    await self.loader.update_pipeline_status(session, gw_id, status)
                elif meta.pipeline_run_status != "COMPLETED" and status == "COMPLETED":
                    await self.loader.update_pipeline_status(session, gw_id, "COMPLETED")

        logger.info("Bootstrap static sync completed successfully.")
        return data

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

        # 3. Check existing pipeline status for idempotency & ensure manager picks are populated
        async with await self.loader.get_session() as session:
            meta = await session.get(PipelineMetadata, target_gw)
            picks_count_stmt = select(func.count(ManagerPick.manager_id)).where(
                ManagerPick.gameweek == target_gw
            )
            has_picks = (await session.execute(picks_count_stmt)).scalar() or 0

            if meta and meta.pipeline_run_status == "COMPLETED" and has_picks > 0 and not force:
                logger.info(
                    f"GW{target_gw} is already marked COMPLETED with {has_picks} picks in database. Skipping (use force=True to re-run)."
                )
                return {"status": "SKIPPED", "gameweek": target_gw, "reason": "Already completed"}
            if meta and meta.pipeline_run_status == "COMPLETED" and has_picks == 0:
                logger.info(
                    f"GW{target_gw} is marked COMPLETED but has 0 manager picks. Auto-re-ingesting to populate picks..."
                )

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

            # 6. Fetch player live match statistics for target gameweek
            element_cost_map = {
                el["id"]: el.get("now_cost", 0) for el in bootstrap_data.get("elements", [])
            }
            logger.info(f"Fetching player match statistics for GW{target_gw}...")
            live_data = await self.client.get_event_live(target_gw)
            live_points_map = {
                el["id"]: el.get("stats", {}).get("total_points", 0)
                for el in live_data.get("elements", [])
            }
            element_history = self.transformer.transform_event_live_elements(
                live_data, target_gw, element_cost_map
            )

            # 7. Fetch manager histories, transfers, and gameweek picks concurrently
            all_scores: list[dict[str, Any]] = []
            all_transfers: list[dict[str, Any]] = []
            all_picks: list[dict[str, Any]] = []

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

                # Fetch squad picks for target gameweek with matching live matchday points
                try:
                    picks_raw = await self.client.get_manager_picks(mgr_id, target_gw)
                    picks = self.transformer.transform_manager_picks(
                        mgr_id, target_gw, picks_raw, live_points_map
                    )
                    all_picks.extend(picks)
                except Exception as exc:  # noqa: BLE001
                    logger.debug(f"Picks not available for manager {mgr_id} GW{target_gw}: {exc}")

            manager_tasks = [_fetch_manager_data(m) for m in managers]
            await asyncio.gather(*manager_tasks)

            # 8. Atomically persist managers, scores, transfers, picks, and player match history
            async with await self.loader.get_session() as session, session.begin():
                await self.loader.load_managers(session, managers)
                await self.loader.load_gameweek_scores(session, all_scores)
                await self.loader.load_transfers(session, all_transfers)
                if all_picks:
                    await self.loader.load_manager_picks(session, all_picks)
                if element_history:
                    await self.loader.load_element_history(session, element_history)

            # 9. Mark pipeline status as COMPLETED
            async with await self.loader.get_session() as session:
                await self.loader.update_pipeline_status(session, target_gw, "COMPLETED")

            summary = {
                "status": "COMPLETED",
                "gameweek": target_gw,
                "managers_count": len(managers),
                "scores_records": len(all_scores),
                "transfers_records": len(all_transfers),
                "picks_records": len(all_picks),
                "player_history_records": len(element_history),
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
        Queries bootstrap-static, inspects finalized gameweeks, auto-backfills any missing
        historical picks, and runs ETL for current/target gameweek if ready.
        """
        logger.info("Executing scheduled poll check...")
        bootstrap_data = await self.sync_bootstrap()
        events = bootstrap_data.get("events", [])
        completed_gws = [e["id"] for e in events if e.get("finished") and e.get("data_checked")]

        # Auto self-heal: check if any previously finalized gameweeks are missing manager picks
        async with await self.loader.get_session() as session:
            for gw in completed_gws:
                picks_count_stmt = select(func.count(ManagerPick.manager_id)).where(
                    ManagerPick.gameweek == gw
                )
                count = (await session.execute(picks_count_stmt)).scalar() or 0
                if count == 0:
                    logger.info(
                        f"Detected 0 manager picks for finalized GW{gw}. Auto-backfilling GW{gw}..."
                    )
                    await self.ingest_league(league_id=league_id, target_gw=gw, force=True)

        return await self.ingest_league(league_id=league_id, force=force)

