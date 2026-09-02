"""Unit tests for the pure DataTransformer engine."""

from data_pipeline.src.transformer import DataTransformer


def test_transform_teams():
    raw_bootstrap = {
        "teams": [
            {"id": 1, "name": "Arsenal", "short_name": "ARS", "code": 3},
            {"id": 2, "name": "Aston Villa", "short_name": "AVL", "code": 7},
        ]
    }
    transformed = DataTransformer.transform_teams(raw_bootstrap)
    assert len(transformed) == 2
    assert transformed[0]["id"] == 1
    assert transformed[0]["name"] == "Arsenal"
    assert transformed[0]["short_name"] == "ARS"
    assert transformed[0]["code"] == 3


def test_transform_elements():
    raw_bootstrap = {
        "elements": [
            {
                "id": 350,
                "web_name": "Haaland",
                "first_name": "Erling",
                "second_name": "Haaland",
                "element_type": 4,
                "team": 13,
                "now_cost": 150,
            }
        ]
    }
    transformed = DataTransformer.transform_elements(raw_bootstrap)
    assert len(transformed) == 1
    assert transformed[0]["id"] == 350
    assert transformed[0]["web_name"] == "Haaland"
    assert transformed[0]["element_type"] == 4
    assert transformed[0]["team_id"] == 13
    assert transformed[0]["now_cost"] == 150


def test_transform_managers():
    standings_data = {
        "standings": {
            "results": [
                {
                    "entry": 944559,
                    "player_name": "Varun Vohra",
                    "entry_name": "Klopp's Kids",
                },
                {
                    "entry": 100200,
                    "player_name": "John Doe",
                    "entry_name": "FC Inshallah",
                },
            ]
        }
    }
    transformed = DataTransformer.transform_managers(standings_data, league_id=944559)
    assert len(transformed) == 2
    assert transformed[0]["id"] == 944559
    assert transformed[0]["player_first_name"] == "Varun"
    assert transformed[0]["player_last_name"] == "Vohra"
    assert transformed[0]["player_name"] == "Varun Vohra"
    assert transformed[0]["entry_name"] == "Klopp's Kids"
    assert transformed[0]["fpl_league_id"] == 944559


def test_transform_gameweek_scores_metrics_and_rolling_avg():
    history_data = {
        "current": [
            {
                "event": 1,
                "points": 75,
                "total_points": 75,
                "event_transfers": 0,
                "event_transfers_cost": 0,
                "rank": 150000,
                "overall_rank": 150000,
                "bank": 10,
                "value": 1000,
                "points_on_bench": 8,
            },
            {
                "event": 2,
                "points": 62,
                "total_points": 133,
                "event_transfers": 2,
                "event_transfers_cost": 4,  # -4 pt transfer hit
                "rank": 200000,
                "overall_rank": 140000,
                "bank": 5,
                "value": 1005,
                "points_on_bench": 6,
            },
            {
                "event": 3,
                "points": 80,
                "total_points": 213,
                "event_transfers": 1,
                "event_transfers_cost": 0,
                "rank": 50000,
                "overall_rank": 95000,
                "bank": 5,
                "value": 1010,
                "points_on_bench": 4,
            },
            {
                "event": 4,
                "points": 50,
                "total_points": 263,
                "event_transfers": 0,
                "event_transfers_cost": 0,
                "rank": 400000,
                "overall_rank": 120000,
                "bank": 5,
                "value": 1012,
                "points_on_bench": 2,
            },
        ],
        "chips": [
            {"event": 3, "name": "wildcard", "time": "2024-09-01T12:00:00Z"},
        ],
    }

    scores = DataTransformer.transform_gameweek_scores(manager_id=944559, history_data=history_data)

    assert len(scores) == 4

    # GW1: Net = 75 - 0 = 75, Rolling = 75.0, Last 3 = 75
    assert scores[0]["gameweek"] == 1
    assert scores[0]["net_points"] == 75
    assert scores[0]["rolling_3_avg"] == 75.0
    assert scores[0]["last_3_gw_total"] == 75
    assert scores[0]["chip_used"] is None
    assert scores[0]["metrics"]["running_net_points"] == 75
    assert scores[0]["metrics"]["running_transfer_cost"] == 0

    # GW2: Net = 62 - 4 = 58, Window = [75, 58] -> Avg = 66.5, Total = 133
    assert scores[1]["gameweek"] == 2
    assert scores[1]["net_points"] == 58
    assert scores[1]["event_transfers_cost"] == 4
    assert scores[1]["rolling_3_avg"] == 66.5
    assert scores[1]["last_3_gw_total"] == 133
    assert scores[1]["metrics"]["running_net_points"] == 133
    assert scores[1]["metrics"]["running_transfer_cost"] == 4

    # GW3: Net = 80 - 0 = 80, Window = [75, 58, 80] -> Total = 213, Avg = 71.0, Chip = wildcard
    assert scores[2]["gameweek"] == 3
    assert scores[2]["net_points"] == 80
    assert scores[2]["rolling_3_avg"] == 71.0
    assert scores[2]["last_3_gw_total"] == 213
    assert scores[2]["chip_used"] == "wildcard"
    assert scores[2]["metrics"]["running_net_points"] == 213

    # GW4: Net = 50, Window = [58, 80, 50] -> Total = 188, Avg = 62.67
    assert scores[3]["gameweek"] == 4
    assert scores[3]["net_points"] == 50
    assert scores[3]["last_3_gw_total"] == 188
    assert scores[3]["rolling_3_avg"] == 62.67
    assert scores[3]["metrics"]["running_net_points"] == 263


def test_transform_transfers():
    raw_transfers = [
        {
            "element_in": 350,
            "element_in_cost": 150,
            "element_out": 220,
            "element_out_cost": 85,
            "event": 2,
            "time": "2024-08-20T17:30:00Z",
        }
    ]
    transfers = DataTransformer.transform_transfers(manager_id=944559, transfers_data=raw_transfers)
    assert len(transfers) == 1
    assert transfers[0]["manager_id"] == 944559
    assert transfers[0]["gameweek"] == 2
    assert transfers[0]["element_in_id"] == 350
    assert transfers[0]["element_out_id"] == 220
    assert transfers[0]["element_in_cost"] == 150
    assert transfers[0]["element_out_cost"] == 85
