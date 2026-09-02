PRAGMA foreign_keys = ON;

CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_player_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 64),
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE auth_replays (
  signature_hash TEXT PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE run_nonces (
  nonce TEXT PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  week_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER,
  attest_key_id TEXT
);

CREATE TABLE weekly_scores (
  week_id TEXT NOT NULL,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  max_floor INTEGER NOT NULL CHECK(max_floor BETWEEN 1 AND 1000000),
  achieved_at INTEGER NOT NULL,
  run_nonce TEXT NOT NULL UNIQUE REFERENCES run_nonces(nonce),
  proof_version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (week_id, player_id)
);

CREATE TABLE weekly_results (
  week_id TEXT NOT NULL,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  final_rank INTEGER NOT NULL,
  max_floor INTEGER NOT NULL,
  finalized_at INTEGER NOT NULL,
  PRIMARY KEY (week_id, player_id),
  UNIQUE (week_id, final_rank)
);

CREATE TABLE reward_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  active_from_week TEXT NOT NULL,
  min_rank INTEGER NOT NULL,
  max_rank INTEGER NOT NULL,
  reward_key TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  label TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  UNIQUE(active_from_week, reward_key)
);

CREATE TABLE reward_grants (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  label TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  claimed_at INTEGER,
  claim_receipt TEXT UNIQUE,
  UNIQUE(week_id, player_id, reward_key)
);

CREATE TABLE reward_claims (
  claim_id TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL UNIQUE REFERENCES reward_grants(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  receipt TEXT NOT NULL UNIQUE,
  claimed_at INTEGER NOT NULL
);

CREATE TABLE rate_limits (
  bucket TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  PRIMARY KEY(bucket, subject_hash, window_start)
);

CREATE INDEX idx_scores_week_rank ON weekly_scores(week_id, max_floor DESC, achieved_at ASC, player_id ASC);
CREATE INDEX idx_results_player ON weekly_results(player_id, week_id DESC);
CREATE INDEX idx_grants_player_unclaimed ON reward_grants(player_id, claimed_at, granted_at);
CREATE INDEX idx_nonces_player_week ON run_nonces(player_id, week_id, claimed_at);
CREATE INDEX idx_replays_expiry ON auth_replays(expires_at);

-- 仮報酬。active_from_week と内容をDBで差し替えればアプリ更新は不要。
INSERT INTO reward_rules(active_from_week,min_rank,max_rank,reward_key,item_id,quantity,label) VALUES
('2026-08-31',1,1,'weekly-first','rebirthArcana',3,'週間1位報酬（仮）'),
('2026-08-31',2,3,'weekly-top3','rebirthArcana',2,'週間TOP3報酬（仮）'),
('2026-08-31',4,10,'weekly-top10','protectionArcana',3,'週間TOP10報酬（仮）'),
('2026-08-31',11,100,'weekly-top100','protectionArcana',1,'週間TOP100報酬（仮）');
