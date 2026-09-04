"""Command-line entrypoint for the FPL Data Pipeline Engine."""

import argparse
import asyncio
import logging
import sys

from .config import settings
from .fpl_client import FPLClient
from .loader import PipelineLoader
from .poller import FPLPipelineRunner

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("fpl_pipeline")


async def async_main() -> None:
    """Async CLI entrypoint parsing arguments and dispatching execution."""
    parser = argparse.ArgumentParser(
        description="FPL Mini-League Data Ingestion Engine & Poller CLI"
    )
    parser.add_argument(
        "--mode",
        choices=["poll", "bootstrap", "ingest", "backfill"],
        default="poll",
        help="Execution mode: 'poll' (scheduled check), 'bootstrap' (teams/elements), 'ingest' (single GW), 'backfill' (all completed GWs)",
    )
    parser.add_argument(
        "--league-id",
        type=int,
        default=settings.FPL_LEAGUE_ID,
        help=f"Target FPL mini-league ID (default: {settings.FPL_LEAGUE_ID})",
    )
    parser.add_argument(
        "--gw",
        type=int,
        default=None,
        help="Specific gameweek number to ingest (optional)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force execution even if marked COMPLETED in metadata",
    )

    args = parser.parse_args()

    async with FPLClient() as client:
        loader = PipelineLoader()
        runner = FPLPipelineRunner(fpl_client=client, loader=loader)

        try:
            if args.mode == "bootstrap":
                logger.info("Executing bootstrap sync mode...")
                await runner.sync_bootstrap()

            elif args.mode == "poll":
                logger.info(f"Executing poller check for league {args.league_id}...")
                result = await runner.poll_and_execute(league_id=args.league_id, force=args.force)
                logger.info(f"Poll result: {result}")

            elif args.mode == "ingest":
                logger.info(
                    f"Executing batch ingestion for league {args.league_id}, GW: {args.gw}..."
                )
                result = await runner.ingest_league(
                    league_id=args.league_id, target_gw=args.gw, force=args.force
                )
                logger.info(f"Ingestion result: {result}")

            elif args.mode == "backfill":
                logger.info(f"Executing historical backfill for league {args.league_id}...")
                bootstrap = await runner.sync_bootstrap()
                events = bootstrap.get("events", [])
                completed_gws = [
                    e["id"] for e in events if e.get("finished") and e.get("data_checked")
                ]
                logger.info(
                    f"Found {len(completed_gws)} finalized gameweeks to backfill: {completed_gws}"
                )

                for gw in completed_gws:
                    logger.info(f"Backfilling GW{gw}...")
                    await runner.ingest_league(
                        league_id=args.league_id, target_gw=gw, force=args.force
                    )

            logger.info("Pipeline task completed successfully.")

        finally:
            await loader.close()


def main() -> None:
    """Synchronous entry point wrapping async_main."""
    try:
        asyncio.run(async_main())
    except KeyboardInterrupt:
        logger.warning("Pipeline interrupted by user.")
        sys.exit(130)
    except Exception as exc:  # noqa: BLE001
        logger.critical(f"Fatal error in pipeline execution: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
