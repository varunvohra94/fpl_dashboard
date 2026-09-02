"""Asynchronous Database Loader with PostgreSQL upserts and atomic transactions."""

import logging
from datetime import UTC, datetime
from typing import Any

from app.models import (
    Element,
    ElementGameweekHistory,
    GameweekScore,
    Manager,
    PipelineMetadata,
    Team,
    Transfer,
)
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import settings

logger = logging.getLogger(__name__)


class PipelineLoader:
    """Handles atomic database upserts and execution state tracking."""

    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or settings.DATABASE_URL
        self.engine: AsyncEngine = create_async_engine(
            self.database_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        self.session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    async def close(self) -> None:
        """Dispose of the async engine connection pool."""
        await self.engine.dispose()

    async def get_session(self) -> AsyncSession:
        """Create a new async database session."""
        return self.session_factory()

    async def load_teams(self, session: AsyncSession, teams: list[dict[str, Any]]) -> int:
        """Upsert teams into the teams table."""
        if not teams:
            return 0

        stmt = pg_insert(Team).values(teams)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Team.id],
            set_={
                "name": stmt.excluded.name,
                "short_name": stmt.excluded.short_name,
                "code": stmt.excluded.code,
                "updated_at": datetime.now(UTC),
            },
        )
        await session.execute(stmt)
        logger.info(f"Upserted {len(teams)} Premier League teams.")
        return len(teams)

    async def load_elements(self, session: AsyncSession, elements: list[dict[str, Any]]) -> int:
        """Upsert players into the elements table."""
        if not elements:
            return 0

        stmt = pg_insert(Element).values(elements)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Element.id],
            set_={
                "web_name": stmt.excluded.web_name,
                "first_name": stmt.excluded.first_name,
                "second_name": stmt.excluded.second_name,
                "element_type": stmt.excluded.element_type,
                "team_id": stmt.excluded.team_id,
                "now_cost": stmt.excluded.now_cost,
                "updated_at": datetime.now(UTC),
            },
        )
        await session.execute(stmt)
        logger.info(f"Upserted {len(elements)} players into elements table.")
        return len(elements)

    async def load_managers(self, session: AsyncSession, managers: list[dict[str, Any]]) -> int:
        """Upsert mini-league managers into the managers table."""
        if not managers:
            return 0

        stmt = pg_insert(Manager).values(managers)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Manager.id],
            set_={
                "player_first_name": stmt.excluded.player_first_name,
                "player_last_name": stmt.excluded.player_last_name,
                "player_name": stmt.excluded.player_name,
                "entry_name": stmt.excluded.entry_name,
                "fpl_league_id": stmt.excluded.fpl_league_id,
                "updated_at": datetime.now(UTC),
            },
        )
        await session.execute(stmt)
        logger.info(f"Upserted {len(managers)} managers into managers table.")
        return len(managers)

    async def load_gameweek_scores(
        self, session: AsyncSession, scores: list[dict[str, Any]]
    ) -> int:
        """Upsert manager weekly scorecards into gameweek_scores table."""
        if not scores:
            return 0

        stmt = pg_insert(GameweekScore).values(scores)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_manager_gameweek",
            set_={
                "points": stmt.excluded.points,
                "total_points": stmt.excluded.total_points,
                "event_transfers": stmt.excluded.event_transfers,
                "event_transfers_cost": stmt.excluded.event_transfers_cost,
                "net_points": stmt.excluded.net_points,
                "rank": stmt.excluded.rank,
                "overall_rank": stmt.excluded.overall_rank,
                "percentile_rank": stmt.excluded.percentile_rank,
                "bank": stmt.excluded.bank,
                "team_value": stmt.excluded.team_value,
                "chip_used": stmt.excluded.chip_used,
                "rolling_3_avg": stmt.excluded.rolling_3_avg,
                "last_3_gw_total": stmt.excluded.last_3_gw_total,
                "metrics": stmt.excluded.metrics,
                "updated_at": datetime.now(UTC),
            },
        )
        await session.execute(stmt)
        logger.info(f"Upserted {len(scores)} score records into gameweek_scores.")
        return len(scores)

    async def load_transfers(self, session: AsyncSession, transfers: list[dict[str, Any]]) -> int:
        """Upsert transfers into the transfers table."""
        if not transfers:
            return 0

        stmt = pg_insert(Transfer).values(transfers)
        stmt = stmt.on_conflict_do_nothing(
            constraint="uq_transfer_event",
        )
        await session.execute(stmt)
        logger.info(f"Processed {len(transfers)} transfers.")
        return len(transfers)

    async def load_element_history(
        self, session: AsyncSession, history_records: list[dict[str, Any]]
    ) -> int:
        """Upsert player performance records into element_gameweek_history table."""
        if not history_records:
            return 0

        stmt = pg_insert(ElementGameweekHistory).values(history_records)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_element_gameweek",
            set_={
                "minutes": stmt.excluded.minutes,
                "total_points": stmt.excluded.total_points,
                "goals_scored": stmt.excluded.goals_scored,
                "assists": stmt.excluded.assists,
                "clean_sheets": stmt.excluded.clean_sheets,
                "goals_conceded": stmt.excluded.goals_conceded,
                "bonus": stmt.excluded.bonus,
                "bps": stmt.excluded.bps,
                "expected_goals": stmt.excluded.expected_goals,
                "expected_assists": stmt.excluded.expected_assists,
                "expected_goal_involvements": stmt.excluded.expected_goal_involvements,
                "expected_goals_conceded": stmt.excluded.expected_goals_conceded,
                "value": stmt.excluded.value,
                "selected": stmt.excluded.selected,
                "rolling_3_points": stmt.excluded.rolling_3_points,
                "rolling_3_avg": stmt.excluded.rolling_3_avg,
                "metrics": stmt.excluded.metrics,
            },
        )
        await session.execute(stmt)
        logger.info(f"Upserted {len(history_records)} player history records.")
        return len(history_records)

    async def sync_pipeline_metadata(
        self, session: AsyncSession, metadata_list: list[dict[str, Any]]
    ) -> int:
        """Sync gameweek event statuses into pipeline_metadata."""
        if not metadata_list:
            return 0

        stmt = pg_insert(PipelineMetadata).values(metadata_list)
        stmt = stmt.on_conflict_do_update(
            index_elements=[PipelineMetadata.gameweek],
            set_={
                "is_current": stmt.excluded.is_current,
                "is_next": stmt.excluded.is_next,
                "is_previous": stmt.excluded.is_previous,
                "finished": stmt.excluded.finished,
                "data_checked": stmt.excluded.data_checked,
                "last_polled_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            },
        )
        await session.execute(stmt)
        return len(metadata_list)

    async def update_pipeline_status(
        self,
        session: AsyncSession,
        gameweek: int,
        status: str,
        error_message: str | None = None,
    ) -> None:
        """Update execution status for a specific gameweek in pipeline_metadata."""
        meta = await session.get(PipelineMetadata, gameweek)
        if meta:
            meta.pipeline_run_status = status
            meta.last_processed_at = datetime.now(UTC)
            meta.error_message = error_message
            await session.commit()
            logger.info(f"Updated GW{gameweek} pipeline status to: {status}")

    async def get_latest_checked_gameweek(self, session: AsyncSession) -> int | None:
        """Find the latest gameweek that is finished and data_checked by FPL."""
        stmt = (
            select(PipelineMetadata.gameweek)
            .where(
                PipelineMetadata.finished.is_(True),
                PipelineMetadata.data_checked.is_(True),
            )
            .order_by(PipelineMetadata.gameweek.desc())
            .limit(1)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
