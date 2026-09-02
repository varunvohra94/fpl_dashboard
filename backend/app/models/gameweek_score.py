"""GameweekScore model representing manager performance per gameweek."""

from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.manager import Manager


class GameweekScore(Base, TimestampMixin):
    """Weekly points, hits, rank, and extensible metrics for a manager."""

    __tablename__ = "gameweek_scores"
    __table_args__ = (
        UniqueConstraint("manager_id", "gameweek", name="uq_manager_gameweek"),
        Index("idx_gw_scores_manager_id", "manager_id"),
        Index("idx_gw_scores_gameweek", "gameweek"),
        Index("idx_gw_scores_metrics", "metrics", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    manager_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("managers.id", ondelete="CASCADE"), nullable=False
    )
    gameweek: Mapped[int] = mapped_column(Integer, nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    total_points: Mapped[int] = mapped_column(Integer, nullable=False)
    event_transfers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    event_transfers_cost: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )  # Hits deduction
    net_points: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # points - event_transfers_cost
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overall_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentile_rank: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    bank: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # In tenths of £m
    team_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # In tenths of £m
    chip_used: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )  # 'bboost', 'freehit', etc.
    rolling_3_avg: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    last_3_gw_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metrics: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}", nullable=False
    )  # Extensible metrics (running sums, bench points, streaks)

    # Relationships
    manager: Mapped["Manager"] = relationship("Manager", back_populates="gameweek_scores")

    def __repr__(self) -> str:
        return (
            f"<GameweekScore(manager_id={self.manager_id}, gw={self.gameweek}, "
            f"net_points={self.net_points}, total={self.total_points})>"
        )
