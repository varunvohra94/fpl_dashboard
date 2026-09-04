"""Pure transformation engine for FPL raw API JSON payloads."""

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any


class DataTransformer:
    """Transforms raw FPL API responses into sanitized, metric-rich database records."""

    @staticmethod
    def transform_teams(bootstrap_data: dict[str, Any]) -> list[dict[str, Any]]:
        """Transform bootstrap-static teams array into teams table records."""
        teams = []
        for raw_team in bootstrap_data.get("teams", []):
            teams.append(
                {
                    "id": raw_team["id"],
                    "name": raw_team["name"],
                    "short_name": raw_team["short_name"],
                    "code": raw_team["code"],
                }
            )
        return teams

    @staticmethod
    def transform_elements(bootstrap_data: dict[str, Any]) -> list[dict[str, Any]]:
        """Transform bootstrap-static elements (players) array into elements table records."""
        elements = []
        for raw_el in bootstrap_data.get("elements", []):
            elements.append(
                {
                    "id": raw_el["id"],
                    "web_name": raw_el["web_name"],
                    "first_name": raw_el.get("first_name", ""),
                    "second_name": raw_el.get("second_name", ""),
                    "element_type": raw_el["element_type"],
                    "team_id": raw_el["team"],
                    "now_cost": raw_el["now_cost"],
                }
            )
        return elements

    @staticmethod
    def transform_managers(standings_data: dict[str, Any], league_id: int) -> list[dict[str, Any]]:
        """Transform mini-league standings results into managers table records."""
        managers = []
        results = standings_data.get("standings", {}).get("results", [])
        for entry in results:
            full_name = entry.get("player_name", "").strip()
            name_parts = full_name.split(" ", 1)
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            managers.append(
                {
                    "id": entry["entry"],
                    "player_first_name": first_name,
                    "player_last_name": last_name,
                    "player_name": full_name,
                    "entry_name": entry.get("entry_name", ""),
                    "fpl_league_id": league_id,
                }
            )
        return managers

    @staticmethod
    def transform_gameweek_scores(
        manager_id: int,
        history_data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Transform manager history into gameweek_scores records.
        Computes net points, rolling 3-game average form, last 3 GW sums, and JSONB running totals.
        """
        raw_current = history_data.get("current", [])
        raw_chips = history_data.get("chips", [])

        # Map gameweek -> chip name
        chips_by_gw: dict[int, str] = {
            chip["event"]: chip["name"] for chip in raw_chips if "event" in chip
        }

        scores: list[dict[str, Any]] = []
        net_history: list[int] = []
        running_net_points = 0
        running_transfer_cost = 0
        running_points = 0

        for gw_entry in raw_current:
            gw = gw_entry["event"]
            points = gw_entry["points"]
            transfer_cost = gw_entry.get("event_transfers_cost", 0)
            net_points = points - transfer_cost

            net_history.append(net_points)
            running_net_points += net_points
            running_transfer_cost += transfer_cost
            running_points += points

            # Calculate rolling 3-game window (GW N-2 to GW N)
            recent_window = net_history[-3:] if len(net_history) >= 3 else net_history
            last_3_total = sum(recent_window)
            rolling_3_avg = round(Decimal(last_3_total) / Decimal(len(recent_window)), 2)

            chip_used = chips_by_gw.get(gw)

            metrics = {
                "running_net_points": running_net_points,
                "running_points": running_points,
                "running_transfer_cost": running_transfer_cost,
                "points_on_bench": gw_entry.get("points_on_bench", 0),
            }

            scores.append(
                {
                    "manager_id": manager_id,
                    "gameweek": gw,
                    "points": points,
                    "total_points": gw_entry.get("total_points", points),
                    "event_transfers": gw_entry.get("event_transfers", 0),
                    "event_transfers_cost": transfer_cost,
                    "net_points": net_points,
                    "rank": gw_entry.get("rank"),
                    "overall_rank": gw_entry.get("overall_rank"),
                    "percentile_rank": gw_entry.get("percentile_rank"),
                    "bank": gw_entry.get("bank", 0),
                    "team_value": gw_entry.get("value", 0),
                    "chip_used": chip_used,
                    "rolling_3_avg": float(rolling_3_avg),
                    "last_3_gw_total": last_3_total,
                    "metrics": metrics,
                }
            )

        return scores

    @staticmethod
    def transform_transfers(
        manager_id: int,
        transfers_data: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Transform manager transfer history into transfers table records."""
        transfers = []
        for t in transfers_data:
            # Parse transfer timestamp
            time_str = t.get("time")
            transfer_time = datetime.fromisoformat(time_str) if time_str else datetime.now(UTC)

            transfers.append(
                {
                    "manager_id": manager_id,
                    "gameweek": t["event"],
                    "element_in_id": t["element_in"],
                    "element_in_cost": t.get("element_in_cost", 0),
                    "element_out_id": t["element_out"],
                    "element_out_cost": t.get("element_out_cost", 0),
                    "transfer_time": transfer_time,
                }
            )
        return transfers

    @staticmethod
    def transform_element_history(
        element_id: int,
        summary_data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Transform an individual player's summary history into element_gameweek_history records.
        Computes rolling 3-game average points and compiles underlying stats (xG, xA).
        """
        raw_history = summary_data.get("history", [])
        history_records = []
        points_history: list[int] = []
        running_pts = 0

        for match in raw_history:
            gw = match["round"]
            pts = match["total_points"]
            points_history.append(pts)
            running_pts += pts

            recent_pts = points_history[-3:] if len(points_history) >= 3 else points_history
            rolling_3_pts = sum(recent_pts)
            rolling_3_avg = round(Decimal(rolling_3_pts) / Decimal(len(recent_pts)), 2)

            metrics = {
                "running_points": running_pts,
                "creativity": float(match.get("creativity", 0)),
                "ict_index": float(match.get("ict_index", 0)),
                "threat": float(match.get("threat", 0)),
                "influence": float(match.get("influence", 0)),
            }

            def _to_decimal(val: Any) -> float | None:
                if val is None:
                    return None
                try:
                    return float(val)
                except (ValueError, TypeError):
                    return None

            history_records.append(
                {
                    "element_id": element_id,
                    "gameweek": gw,
                    "minutes": match.get("minutes", 0),
                    "total_points": pts,
                    "goals_scored": match.get("goals_scored", 0),
                    "assists": match.get("assists", 0),
                    "clean_sheets": match.get("clean_sheets", 0),
                    "goals_conceded": match.get("goals_conceded", 0),
                    "bonus": match.get("bonus", 0),
                    "bps": match.get("bps", 0),
                    "expected_goals": _to_decimal(match.get("expected_goals")),
                    "expected_assists": _to_decimal(match.get("expected_assists")),
                    "expected_goal_involvements": _to_decimal(
                        match.get("expected_goal_involvements")
                    ),
                    "expected_goals_conceded": _to_decimal(match.get("expected_goals_conceded")),
                    "value": match.get("value", 0),
                    "selected": match.get("selected"),
                    "rolling_3_points": rolling_3_pts,
                    "rolling_3_avg": float(rolling_3_avg),
                    "metrics": metrics,
                }
            )

        return history_records

    @staticmethod
    def transform_pipeline_metadata(bootstrap_data: dict[str, Any]) -> list[dict[str, Any]]:
        """Transform bootstrap events into pipeline_metadata records."""
        metadata = []
        for event in bootstrap_data.get("events", []):
            metadata.append(
                {
                    "gameweek": event["id"],
                    "is_current": event.get("is_current", False),
                    "is_next": event.get("is_next", False),
                    "is_previous": event.get("is_previous", False),
                    "finished": event.get("finished", False),
                    "data_checked": event.get("data_checked", False),
                }
            )
        return metadata
