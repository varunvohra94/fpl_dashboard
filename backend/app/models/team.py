"""Team model representing Premier League clubs."""

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.element import Element


class Team(Base, TimestampMixin):
    """Premier League club reference table."""

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # FPL Team ID (1-20)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    short_name: Mapped[str] = mapped_column(String(10), nullable=False)
    code: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    elements: Mapped[list["Element"]] = relationship("Element", back_populates="team")

    def __repr__(self) -> str:
        return f"<Team(id={self.id}, name='{self.name}', short_name='{self.short_name}')>"
