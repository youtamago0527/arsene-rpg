CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  player_key TEXT NOT NULL UNIQUE,
  display_name TEXT CHECK(length(display_name) BETWEEN 2 AND 20)
);

CREATE TABLE auth_replays (
  signature_key TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX auth_replay_expiry ON auth_replays (expires_at);

CREATE TABLE auth_limits (
  client_key TEXT NOT NULL,
  minute INTEGER NOT NULL,
  requests INTEGER NOT NULL,
  PRIMARY KEY (client_key, minute)
);

CREATE TABLE ranked_runs (
  nonce TEXT PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  client_run_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE (player_id, client_run_id)
);
CREATE INDEX ranked_run_player_time ON ranked_runs (player_id, started_at);
CREATE INDEX ranked_run_expiry ON ranked_runs (expires_at);

CREATE TABLE scores (
  nonce TEXT PRIMARY KEY REFERENCES ranked_runs(nonce),
  player_id INTEGER NOT NULL REFERENCES players(id),
  floor INTEGER NOT NULL CHECK(floor BETWEEN 1 AND 9999),
  received_at INTEGER NOT NULL,
  week_start INTEGER NOT NULL
);

CREATE INDEX scores_snapshot ON scores (week_start, received_at, player_id, floor);

CREATE TABLE weekly_best (
  week_start INTEGER NOT NULL,
  player_id INTEGER NOT NULL REFERENCES players(id),
  floor INTEGER NOT NULL CHECK(floor BETWEEN 1 AND 9999),
  received_at INTEGER NOT NULL,
  PRIMARY KEY (week_start, player_id)
);

CREATE INDEX weekly_best_order ON weekly_best (week_start, floor DESC, received_at, player_id);

CREATE TRIGGER score_updates_weekly_best AFTER INSERT ON scores
BEGIN
  INSERT INTO weekly_best (week_start, player_id, floor, received_at)
  VALUES (NEW.week_start, NEW.player_id, NEW.floor, NEW.received_at)
  ON CONFLICT (week_start, player_id) DO UPDATE SET floor = NEW.floor, received_at = NEW.received_at
  WHERE NEW.floor > weekly_best.floor
     OR (NEW.floor = weekly_best.floor AND NEW.received_at < weekly_best.received_at);
END;

CREATE TABLE settlements (
  cutoff INTEGER PRIMARY KEY,
  finalized_at INTEGER NOT NULL
);

CREATE TABLE snapshots (
  cutoff INTEGER NOT NULL,
  place INTEGER NOT NULL CHECK(place BETWEEN 1 AND 10),
  player_id INTEGER NOT NULL REFERENCES players(id),
  floor INTEGER NOT NULL,
  PRIMARY KEY (cutoff, place),
  UNIQUE (cutoff, player_id)
);

-- Values are chosen by the operator. Insert a new policy for a future week.
CREATE TABLE weekly_reward_policy (
  effective_week TEXT PRIMARY KEY,
  first_points INTEGER NOT NULL CHECK(first_points BETWEEN 0 AND 1000000),
  top_five_points INTEGER NOT NULL CHECK(top_five_points BETWEEN 0 AND 1000000),
  top_ten_points INTEGER NOT NULL CHECK(top_ten_points BETWEEN 0 AND 1000000)
);

CREATE TABLE reward_ledger (
  cutoff INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('daily', 'weekly')),
  player_id INTEGER NOT NULL REFERENCES players(id),
  place INTEGER NOT NULL CHECK(place BETWEEN 1 AND 10),
  points INTEGER NOT NULL CHECK(points > 0),
  PRIMARY KEY (cutoff, kind, player_id)
);

CREATE INDEX reward_history ON reward_ledger (player_id, cutoff DESC, kind);
