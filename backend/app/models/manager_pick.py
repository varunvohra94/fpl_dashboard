"""ManagerPick model representing a manager's squad selection and captaincy per gameweek."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.element import Element
    from app.models.manager import Manager


class ManagerPick(Base):
    """Manager squad picks per gameweek including starting position, active multiplier, and captaincy."""

    __tablename__ = "manager_picks"
    __table_args__ = (
        UniqueConstraint(
            "manager_id",
            "gameweek",
            "element_id",
            name="uq_manager_gw_element",
        ),
        Index("idx_manager_picks_manager_gw", "manager_id", "gameweek"),
        Index("idx_manager_picks_gw_element", "gameweek", "element_id"),
        Index("idx_manager_picks_element_id", "element_id"),
        Index("idx_manager_picks_multiplier", "multiplier"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    manager_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("managers.id", ondelete="CASCADE"), nullable=False
    )
    gameweek: Mapped[int] = mapped_column(Integer, nullable=False)
    element_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("elements.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # 1 to 15 (1-11 starters, 12-15 bench)
    multiplier: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False
    )  # 0=bench, 1=starter, 2=captain, 3=triple captain
    is_captain: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_vice_captain: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    raw_points: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )  # Base player points scored in this gameweek (1x)
    total_points: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )  # Effective points contributed = raw_points * multiplier
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    manager: Mapped["Manager"] = relationship("Manager", back_populates="picks")
    element: Mapped["Element"] = relationship("Element")

    def __repr__(self) -> str:
        return (
            f"<ManagerPick(manager_id={self.manager_id}, gw={self.gameweek}, "
            f"element_id={self.element_id}, pos={self.position}, mult={self.multiplier})>"
        )
