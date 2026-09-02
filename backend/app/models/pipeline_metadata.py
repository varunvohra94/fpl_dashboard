"""PipelineMetadata model for tracking gameweek status and ETL execution."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class PipelineMetadata(Base, TimestampMixin):
    """Orchestration metadata to ensure idempotent data pipeline runs."""

    __tablename__ = "pipeline_metadata"
    __table_args__ = (Index("idx_pipeline_meta_status", "pipeline_run_status"),)

    gameweek: Mapped[int] = mapped_column(Integer, primary_key=True)  # 1 to 38
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_next: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_previous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    finished: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )  # Matches finished
    data_checked: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )  # Finalized points
    pipeline_run_status: Mapped[str] = mapped_column(
        String(30), default="PENDING", nullable=False
    )  # PENDING, RUNNING, COMPLETED, FAILED
    last_polled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<PipelineMetadata(gw={self.gameweek}, finished={self.finished}, "
            f"checked={self.data_checked}, status='{self.pipeline_run_status}')>"
        )
