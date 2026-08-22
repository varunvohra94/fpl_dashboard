-- ==============================================================================
-- FPL League Platform - PostgreSQL Database Initialization DDL
-- ==============================================================================

-- Enable UUID extension if needed in the future
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Reference Table: Teams (Premier League Clubs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,                      -- FPL Team ID (1 to 20)
    name VARCHAR(100) NOT NULL,                  -- Full name (e.g. 'Arsenal')
    short_name VARCHAR(10) NOT NULL,             -- Short 3-letter name (e.g. 'ARS')
    code INTEGER NOT NULL,                       -- Official FPL club code
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. Reference Table: Elements (FPL Players)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS elements (
    id INTEGER PRIMARY KEY,                      -- FPL Player ID (e.g. 350)
    web_name VARCHAR(100) NOT NULL,              -- Display name on shirts / UI (e.g. 'Haaland')
    first_name VARCHAR(100) NOT NULL,
    second_name VARCHAR(100) NOT NULL,
    element_type INTEGER NOT NULL,               -- 1: GK, 2: DEF, 3: MID, 4: FWD
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    now_cost INTEGER NOT NULL,                   -- Cost in tenths of a million (e.g. 150 = £15.0m)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_elements_team_id ON elements(team_id);
CREATE INDEX IF NOT EXISTS idx_elements_element_type ON elements(element_type);

-- ------------------------------------------------------------------------------
-- 3. Core Table: Element Gameweek History (Player Stats Per Gameweek)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS element_gameweek_history (
    id BIGSERIAL PRIMARY KEY,
    element_id INTEGER NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,                   -- Gameweek (1 to 38)
    minutes INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    goals_scored INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    clean_sheets INTEGER NOT NULL DEFAULT 0,
    goals_conceded INTEGER NOT NULL DEFAULT 0,
    bonus INTEGER NOT NULL DEFAULT 0,
    bps INTEGER NOT NULL DEFAULT 0,              -- Bonus Points System score
    expected_goals NUMERIC(5, 2),                -- xG
    expected_assists NUMERIC(5, 2),              -- xA
    expected_goal_involvements NUMERIC(5, 2),    -- xGI
    expected_goals_conceded NUMERIC(5, 2),       -- xGC
    value INTEGER NOT NULL,                      -- Player cost in tenths of £m at that GW
    selected INTEGER,                            -- Total FPL managers owning this player
    rolling_3_points INTEGER,                    -- Total points in last 3 GWs (GW N-2 to N)
    rolling_3_avg NUMERIC(5, 2),                 -- Average points in last 3 GWs
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Extensible metrics (running sums, form, streaks)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_element_gameweek UNIQUE (element_id, gameweek)
);

CREATE INDEX IF NOT EXISTS idx_element_gw_hist_element ON element_gameweek_history(element_id);
CREATE INDEX IF NOT EXISTS idx_element_gw_hist_gw ON element_gameweek_history(gameweek);
CREATE INDEX IF NOT EXISTS idx_element_gw_hist_metrics ON element_gameweek_history USING GIN (metrics);

-- ------------------------------------------------------------------------------
-- 4. Core Table: Managers (Mini-League Participants)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS managers (
    id INTEGER PRIMARY KEY,                      -- FPL Entry / Team ID (e.g. 944559)
    player_first_name VARCHAR(100) NOT NULL,
    player_last_name VARCHAR(100) NOT NULL,
    player_name VARCHAR(200) NOT NULL,           -- Full manager display name
    entry_name VARCHAR(200) NOT NULL,            -- FPL Team Name
    fpl_league_id INTEGER NOT NULL,              -- Mini-League ID (e.g. 944559)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_managers_league_id ON managers(fpl_league_id);

-- ------------------------------------------------------------------------------
-- 5. Core Table: Gameweek Scores (Weekly Performance & Extensible Metrics)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gameweek_scores (
    id BIGSERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,                   -- Gameweek (1 to 38)
    points INTEGER NOT NULL,                     -- Raw gameweek score
    total_points INTEGER NOT NULL,               -- Cumulative total points
    event_transfers INTEGER NOT NULL DEFAULT 0,  -- Number of transfers made in GW
    event_transfers_cost INTEGER NOT NULL DEFAULT 0, -- Points deducted for transfer hits (e.g. 4, 8)
    net_points INTEGER NOT NULL,                 -- points - event_transfers_cost
    rank INTEGER,                                -- Rank within GW
    overall_rank INTEGER,                        -- Global overall rank
    percentile_rank NUMERIC(5, 2),               -- Percentile ranking
    bank INTEGER NOT NULL DEFAULT 0,             -- Bank balance in tenths (e.g. 15 = £1.5m)
    team_value INTEGER NOT NULL DEFAULT 0,       -- Squad value in tenths (e.g. 1015 = £101.5m)
    chip_used VARCHAR(30),                       -- 'bboost', 'freehit', '3xc', 'wildcard', NULL
    rolling_3_avg NUMERIC(6, 2),                 -- Rolling 3-game average score
    last_3_gw_total INTEGER,                     -- Running sum of net points over last 3 GWs
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Extensible metrics (running sums, bench points, streaks)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_manager_gameweek UNIQUE (manager_id, gameweek)
);

CREATE INDEX IF NOT EXISTS idx_gw_scores_manager_id ON gameweek_scores(manager_id);
CREATE INDEX IF NOT EXISTS idx_gw_scores_gameweek ON gameweek_scores(gameweek);
CREATE INDEX IF NOT EXISTS idx_gw_scores_chip_used ON gameweek_scores(chip_used) WHERE chip_used IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gw_scores_metrics ON gameweek_scores USING GIN (metrics);

-- ------------------------------------------------------------------------------
-- 6. Core Table: Transfers (Post-deadline audit log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transfers (
    id BIGSERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,                   -- Gameweek the transfer was made for
    element_in_id INTEGER NOT NULL REFERENCES elements(id) ON DELETE RESTRICT,
    element_in_cost INTEGER NOT NULL,            -- Purchase price in tenths of million
    element_out_id INTEGER NOT NULL REFERENCES elements(id) ON DELETE RESTRICT,
    element_out_cost INTEGER NOT NULL,           -- Selling price in tenths of million
    transfer_time TIMESTAMPTZ NOT NULL,          -- Timestamp transfer was recorded by FPL
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_transfer_event UNIQUE (manager_id, gameweek, element_in_id, element_out_id, transfer_time)
);

CREATE INDEX IF NOT EXISTS idx_transfers_manager_gw ON transfers(manager_id, gameweek);
CREATE INDEX IF NOT EXISTS idx_transfers_element_in ON transfers(element_in_id);
CREATE INDEX IF NOT EXISTS idx_transfers_element_out ON transfers(element_out_id);

-- ------------------------------------------------------------------------------
-- 7. Core Table: Pipeline Metadata (Orchestration & Idempotency)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_metadata (
    gameweek INTEGER PRIMARY KEY,                -- 1 to 38
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    is_next BOOLEAN NOT NULL DEFAULT FALSE,
    is_previous BOOLEAN NOT NULL DEFAULT FALSE,
    finished BOOLEAN NOT NULL DEFAULT FALSE,     -- FPL marked all matches finished
    data_checked BOOLEAN NOT NULL DEFAULT FALSE, -- FPL finalized points, bonuses & leagues
    pipeline_run_status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
    last_polled_at TIMESTAMPTZ,
    last_processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipeline_meta_status ON pipeline_metadata(pipeline_run_status);
