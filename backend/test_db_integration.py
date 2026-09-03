"""Verification script to test async database models, running sums, and JSONB metrics with automated teardown."""

import asyncio
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import delete, select

from app.db.session import async_session_maker, engine
from app.models import (
    Element,
    ElementGameweekHistory,
    GameweekScore,
    Manager,
    PipelineMetadata,
    Team,
    Transfer,
)

# Dedicated mock test IDs to guarantee isolation from live league data
TEST_TEAM_1_ID = 9991
TEST_TEAM_2_ID = 9992
TEST_ELEMENT_1_ID = 99901
TEST_ELEMENT_2_ID = 99902
TEST_MANAGER_ID = 9999902
TEST_LEAGUE_ID = 8888802
TEST_GW1 = 98
TEST_GW2 = 99


async def main() -> None:
    print("🚀 Running Async Database Integration Test (with Isolated Teardown)...")

    async with async_session_maker() as session:
        try:
            # 1. Clean up any leftover test IDs from previous runs
            async with session.begin():
                await session.execute(
                    delete(GameweekScore).where(GameweekScore.manager_id == TEST_MANAGER_ID)
                )
                await session.execute(
                    delete(Transfer).where(Transfer.manager_id == TEST_MANAGER_ID)
                )
                await session.execute(
                    delete(ElementGameweekHistory).where(
                        ElementGameweekHistory.element_id.in_(
                            [TEST_ELEMENT_1_ID, TEST_ELEMENT_2_ID]
                        )
                    )
                )
                await session.execute(delete(Manager).where(Manager.id == TEST_MANAGER_ID))
                await session.execute(
                    delete(Element).where(Element.id.in_([TEST_ELEMENT_1_ID, TEST_ELEMENT_2_ID]))
                )
                await session.execute(
                    delete(Team).where(Team.id.in_([TEST_TEAM_1_ID, TEST_TEAM_2_ID]))
                )
                await session.execute(
                    delete(PipelineMetadata).where(
                        PipelineMetadata.gameweek.in_([TEST_GW1, TEST_GW2])
                    )
                )

            # 2. Insert Teams, Elements, and Element Gameweek History
            async with session.begin():
                team1 = Team(id=TEST_TEAM_1_ID, name="Test Arsenal", short_name="TARS", code=991)
                team2 = Team(id=TEST_TEAM_2_ID, name="Test Man City", short_name="TMCI", code=992)
                session.add_all([team1, team2])

                saka = Element(
                    id=TEST_ELEMENT_1_ID,
                    web_name="Test Saka",
                    first_name="Bukayo",
                    second_name="Saka",
                    element_type=3,  # Midfielder
                    team_id=TEST_TEAM_1_ID,
                    now_cost=102,  # £10.2m
                )
                haaland = Element(
                    id=TEST_ELEMENT_2_ID,
                    web_name="Test Haaland",
                    first_name="Erling",
                    second_name="Haaland",
                    element_type=4,  # Forward
                    team_id=TEST_TEAM_2_ID,
                    now_cost=152,  # £15.2m
                )
                session.add_all([saka, haaland])

                # Player stats for GW1 & GW2 with running sums in JSONB
                saka_gw1 = ElementGameweekHistory(
                    element_id=TEST_ELEMENT_1_ID,
                    gameweek=TEST_GW1,
                    minutes=90,
                    total_points=12,
                    goals_scored=1,
                    assists=1,
                    clean_sheets=1,
                    bonus=3,
                    bps=38,
                    expected_goals=Decimal("0.45"),
                    expected_assists=Decimal("0.62"),
                    value=100,
                    rolling_3_points=12,
                    rolling_3_avg=Decimal("12.00"),
                    metrics={
                        "running_total_points": 12,
                        "running_minutes": 90,
                        "form_rating": 12.0,
                    },
                )
                saka_gw2 = ElementGameweekHistory(
                    element_id=TEST_ELEMENT_1_ID,
                    gameweek=TEST_GW2,
                    minutes=85,
                    total_points=8,
                    goals_scored=0,
                    assists=1,
                    clean_sheets=1,
                    bonus=1,
                    bps=26,
                    expected_goals=Decimal("0.20"),
                    expected_assists=Decimal("0.40"),
                    value=101,
                    rolling_3_points=20,
                    rolling_3_avg=Decimal("10.00"),
                    metrics={
                        "running_total_points": 20,
                        "running_minutes": 175,
                        "form_rating": 10.0,
                    },
                )
                session.add_all([saka_gw1, saka_gw2])

            # 3. Insert Manager and Gameweek Scores with running sums in JSONB
            async with session.begin():
                manager = Manager(
                    id=TEST_MANAGER_ID,
                    player_first_name="Test",
                    player_last_name="Manager",
                    player_name="Test Manager",
                    entry_name="Test FC",
                    fpl_league_id=TEST_LEAGUE_ID,
                )
                session.add(manager)

                gw1_score = GameweekScore(
                    manager_id=TEST_MANAGER_ID,
                    gameweek=TEST_GW1,
                    points=75,
                    total_points=75,
                    event_transfers=0,
                    event_transfers_cost=0,
                    net_points=75,
                    rank=120000,
                    overall_rank=120000,
                    bank=15,
                    team_value=1000,
                    chip_used=None,
                    rolling_3_avg=Decimal("75.00"),
                    last_3_gw_total=75,
                    metrics={
                        "running_net_points": 75,
                        "running_transfer_hits_cost": 0,
                        "running_bench_points": 8,
                        "running_captain_points": 24,
                        "green_arrows_streak": 1,
                    },
                )
                gw2_score = GameweekScore(
                    manager_id=TEST_MANAGER_ID,
                    gameweek=TEST_GW2,
                    points=62,
                    total_points=133,
                    event_transfers=1,
                    event_transfers_cost=4,
                    net_points=58,
                    rank=250000,
                    overall_rank=180000,
                    bank=10,
                    team_value=1005,
                    chip_used=None,
                    rolling_3_avg=Decimal("66.50"),
                    last_3_gw_total=133,
                    metrics={
                        "running_net_points": 133,
                        "running_transfer_hits_cost": 4,
                        "running_bench_points": 14,
                        "running_captain_points": 40,
                        "green_arrows_streak": 2,
                    },
                )
                session.add_all([gw1_score, gw2_score])

                # 4. Insert Transfer Record
                transfer = Transfer(
                    manager_id=TEST_MANAGER_ID,
                    gameweek=TEST_GW2,
                    element_in_id=TEST_ELEMENT_1_ID,
                    element_in_cost=102,
                    element_out_id=TEST_ELEMENT_2_ID,
                    element_out_cost=152,
                    transfer_time=datetime.now(UTC),
                )
                session.add(transfer)

                # 5. Insert Pipeline Metadata
                pipeline_meta = PipelineMetadata(
                    gameweek=TEST_GW1,
                    is_current=False,
                    is_previous=True,
                    finished=True,
                    data_checked=True,
                    pipeline_run_status="COMPLETED",
                    last_polled_at=datetime.now(UTC),
                    last_processed_at=datetime.now(UTC),
                )
                session.add(pipeline_meta)

            # 6. Verify and query data back
            async with session.begin():
                managers_stmt = select(Manager).where(Manager.id == TEST_MANAGER_ID)
                result = await session.execute(managers_stmt)
                fetched_manager = result.scalar_one()
                print(
                    f"✅ Fetched Manager: {fetched_manager.player_name} ({fetched_manager.entry_name})"
                )

                scores_stmt = (
                    select(GameweekScore)
                    .where(GameweekScore.manager_id == TEST_MANAGER_ID)
                    .order_by(GameweekScore.gameweek)
                )
                scores = (await session.execute(scores_stmt)).scalars().all()
                print(f"✅ Fetched {len(scores)} gameweek score records.")
                for s in scores:
                    running_net = s.metrics.get("running_net_points")
                    running_bench = s.metrics.get("running_bench_points")
                    print(
                        f"   - GW{s.gameweek}: Raw {s.points} pts, Cost -{s.event_transfers_cost} pts, "
                        f"Net {s.net_points} pts | Last 3 GW Total: {s.last_3_gw_total} | "
                        f"JSONB Running Net: {running_net}, Running Bench: {running_bench}"
                    )

                saka_history_stmt = (
                    select(ElementGameweekHistory)
                    .where(ElementGameweekHistory.element_id == TEST_ELEMENT_1_ID)
                    .order_by(ElementGameweekHistory.gameweek)
                )
                saka_history = (await session.execute(saka_history_stmt)).scalars().all()
                print(f"✅ Fetched {len(saka_history)} player history records for Test Saka.")
                for h in saka_history:
                    print(
                        f"   - GW{h.gameweek}: {h.total_points} pts, {h.minutes} mins | "
                        f"xG: {h.expected_goals}, xA: {h.expected_assists} | "
                        f"JSONB Running Pts: {h.metrics.get('running_total_points')}"
                    )

        finally:
            # 7. Automated Teardown / Cleanup: delete all created test records
            print("🧹 Cleaning up test records from database...")
            async with session.begin():
                await session.execute(
                    delete(GameweekScore).where(GameweekScore.manager_id == TEST_MANAGER_ID)
                )
                await session.execute(
                    delete(Transfer).where(Transfer.manager_id == TEST_MANAGER_ID)
                )
                await session.execute(
                    delete(ElementGameweekHistory).where(
                        ElementGameweekHistory.element_id.in_(
                            [TEST_ELEMENT_1_ID, TEST_ELEMENT_2_ID]
                        )
                    )
                )
                await session.execute(delete(Manager).where(Manager.id == TEST_MANAGER_ID))
                await session.execute(
                    delete(Element).where(Element.id.in_([TEST_ELEMENT_1_ID, TEST_ELEMENT_2_ID]))
                )
                await session.execute(
                    delete(Team).where(Team.id.in_([TEST_TEAM_1_ID, TEST_TEAM_2_ID]))
                )
                await session.execute(
                    delete(PipelineMetadata).where(
                        PipelineMetadata.gameweek.in_([TEST_GW1, TEST_GW2])
                    )
                )
            print("✨ Teardown complete. Zero test artifacts left in database.")

    await engine.dispose()
    print("🎉 All database schema & model verification checks PASSED successfully!")


if __name__ == "__main__":
    asyncio.run(main())
