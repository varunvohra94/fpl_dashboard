"""Transfer model representing manager transfer activity."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.element import Element
    from app.models.manager import Manager


class Transfer(Base):
    """Transfer log for post-deadline activity feed."""

    __tablename__ = "transfers"
    __table_args__ = (
        UniqueConstraint(
            "manager_id",
            "gameweek",
            "element_in_id",
            "element_out_id",
            "transfer_time",
            name="uq_transfer_event",
        ),
        Index("idx_transfers_manager_gw", "manager_id", "gameweek"),
        Index("idx_transfers_element_in", "element_in_id"),
        Index("idx_transfers_element_out", "element_out_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    manager_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("managers.id", ondelete="CASCADE"), nullable=False
    )
    gameweek: Mapped[int] = mapped_column(Integer, nullable=False)
    element_in_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("elements.id", ondelete="RESTRICT"), nullable=False
    )
    element_in_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    element_out_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("elements.id", ondelete="RESTRICT"), nullable=False
    )
    element_out_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    transfer_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    manager: Mapped["Manager"] = relationship("Manager", back_populates="transfers")
    element_in: Mapped["Element"] = relationship(
        "Element", foreign_keys=[element_in_id], back_populates="transfers_in"
    )
    element_out: Mapped["Element"] = relationship(
        "Element", foreign_keys=[element_out_id], back_populates="transfers_out"
    )

    def __repr__(self) -> str:
        return (
            f"<Transfer(manager_id={self.manager_id}, gw={self.gameweek}, "
            f"in={self.element_in_id}, out={self.element_out_id})>"
        )
