"""Manager model representing mini-league participants."""

from typing import TYPE_CHECKING

from sqlalchemy import Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.gameweek_score import GameweekScore
    from app.models.transfer import Transfer


class Manager(Base, TimestampMixin):
    """Mini-league participant / FPL Entry."""

    __tablename__ = "managers"
    __table_args__ = (Index("idx_managers_league_id", "fpl_league_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # FPL Entry / Team ID (e.g. 944559)
    player_first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    player_last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    player_name: Mapped[str] = mapped_column(String(200), nullable=False)
    entry_name: Mapped[str] = mapped_column(String(200), nullable=False)  # Team name
    fpl_league_id: Mapped[int] = mapped_column(Integer, nullable=False)  # Mini-league ID

    # Relationships
    gameweek_scores: Mapped[list["GameweekScore"]] = relationship(
        "GameweekScore", back_populates="manager", cascade="all, delete-orphan"
    )
    transfers: Mapped[list["Transfer"]] = relationship(
        "Transfer", back_populates="manager", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Manager(id={self.id}, name='{self.player_name}', team='{self.entry_name}')>"
