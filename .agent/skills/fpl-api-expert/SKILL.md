---
name: fpl-api-expert
description: Provides authoritative knowledge on the official Fantasy Premier League (FPL) API endpoints, parameters, and JSON payload structures.
---

# Goal
Ensure accurate, highly efficient data extraction from the FPL API by utilizing the correct public endpoints and parsing the nested JSON structures correctly.

# Core Endpoints Reference

The base URL for all requests is: `https://fantasy.premierleague.com/api/`

| Endpoint | Purpose | Key JSON Arrays / Fields |
| :--- | :--- | :--- |
| `bootstrap-static/` | Master payload for general game data. Should be cached or hit sparingly. | `events` (gameweeks), `elements` (players), `teams`, `element_types` (positions). |
| `fixtures/?event={gw_id}` | Returns fixture data, including kick-off times, goals, and bonus points. | `stats` (array containing goals, assists, bps). |
| `element-summary/{player_id}/` | Detailed history and upcoming fixtures for a specific player. | `history` (past GWs), `fixtures` (upcoming GWs). |
| `event/{gw_id}/live/` | Live player points and underlying stats for a specific gameweek. | `elements` -> `stats` -> `total_points`, `minutes`. |
| `entry/{team_id}/` | A specific manager's general details and overall rank. | `summary_overall_points`, `name`. |
| `entry/{team_id}/history/` | A manager's gameweek-by-gameweek history and chip usage. | `current` (GW history), `chips` (used chips). |
| `entry/{team_id}/transfers/` | A manager's complete transfer history for the season. | `element_in`, `element_out`, `time`. |
| `entry/{team_id}/event/{gw_id}/picks/` | A manager's starting XI, bench, and captaincy for a specific GW. | `picks` (array of player IDs), `multiplier` (indicates captain). |
| `leagues-classic/{league_id}/standings/` | Standings for a specific mini-league. | `standings` -> `results` (array of managers). |

# Instructions

1. Analyze the requested FPL data extraction task.
2. Identify the optimal combination of endpoints required to fulfill the request while minimizing API calls. 
    * *Example: Do not loop through `element-summary/` for 500 players if the required data (like total points) is already present in `bootstrap-static/`.*
3. Explicitly state which endpoints are being used.
4. When writing parsing code, always account for FPL's specific data types (e.g., player IDs are integers, positions are mapped 1-4).
5. Generate the Python (using `httpx`) or JavaScript data fetching logic, ensuring correct URL construction.

# Constraints

* The API requires a trailing slash `/` on almost all endpoints (except query parameters like `fixtures/?event=1`). Ensure all URLs are constructed correctly to avoid HTTP 301 redirects.
* Do not attempt to use private endpoints (like `my-team/`) without explicitly handling authentication via the `cookie` header.
* Assume all IDs (player, team, event) are integers unless otherwise specified.