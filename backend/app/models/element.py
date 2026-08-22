"""Element model representing FPL players."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.element_gameweek_history import ElementGameweekHistory
    from app.models.team import Team
    from app.models.transfer import Transfer


class Element(Base, TimestampMixin):
    """FPL Player reference table."""

    __tablename__ = "elements"
    __table_args__ = (
        Index("idx_elements_team_id", "team_id"),
        Index("idx_elements_element_type", "element_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # FPL Player ID
    web_name: Mapped[str] = mapped_column(String(100), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    second_name: Mapped[str] = mapped_column(String(100), nullable=False)
    element_type: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # 1: GK, 2: DEF, 3: MID, 4: FWD
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    now_cost: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # In tenths of £m (e.g. 150 = £15.0m)

    # Relationships
    team: Mapped["Team"] = relationship("Team", back_populates="elements")
    gameweek_history: Mapped[list["ElementGameweekHistory"]] = relationship(
        "ElementGameweekHistory", back_populates="element", cascade="all, delete-orphan"
    )
    transfers_in: Mapped[list["Transfer"]] = relationship(
        "Transfer", foreign_keys="[Transfer.element_in_id]", back_populates="element_in"
    )
    transfers_out: Mapped[list["Transfer"]] = relationship(
        "Transfer", foreign_keys="[Transfer.element_out_id]", back_populates="element_out"
    )

    def __repr__(self) -> str:
        return f"<Element(id={self.id}, web_name='{self.web_name}', cost={self.now_cost})>"
