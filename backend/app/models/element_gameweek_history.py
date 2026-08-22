"""ElementGameweekHistory model representing individual player match stats per gameweek."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.element import Element


class ElementGameweekHistory(Base):
    """Player performance stats and metrics per gameweek."""

    __tablename__ = "element_gameweek_history"
    __table_args__ = (
        UniqueConstraint("element_id", "gameweek", name="uq_element_gameweek"),
        Index("idx_element_gw_hist_element", "element_id"),
        Index("idx_element_gw_hist_gw", "gameweek"),
        Index("idx_element_gw_hist_metrics", "metrics", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    element_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("elements.id", ondelete="CASCADE"), nullable=False
    )
    gameweek: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 38
    minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    goals_scored: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    assists: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    clean_sheets: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    goals_conceded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bonus: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expected_goals: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)  # xG
    expected_assists: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)  # xA
    expected_goal_involvements: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )  # xGI
    expected_goals_conceded: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )  # xGC
    value: Mapped[int] = mapped_column(Integer, nullable=False)  # Cost in tenths of £m at this GW
    selected: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Ownership count
    rolling_3_points: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Last 3 GWs total
    rolling_3_avg: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )  # Last 3 GWs avg
    metrics: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}", nullable=False
    )  # Extensible stats (e.g. running totals, form)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    element: Mapped["Element"] = relationship("Element", back_populates="gameweek_history")

    def __repr__(self) -> str:
        return (
            f"<ElementGameweekHistory(element_id={self.element_id}, gw={self.gameweek}, "
            f"pts={self.total_points}, mins={self.minutes})>"
        )
