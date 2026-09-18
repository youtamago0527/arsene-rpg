CREATE TABLE IF NOT EXISTS web_store_buyers (
  buyer_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS web_store_sessions (
  session_id TEXT PRIMARY KEY,
  payment_intent_id TEXT UNIQUE,
  buyer_hash TEXT NOT NULL,
  item_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity = 1),
  mode TEXT NOT NULL DEFAULT 'payment' CHECK (mode = 'payment'),
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  livemode INTEGER NOT NULL CHECK (livemode IN (0, 1)),
  stripe_event_id TEXT,
  ready_at INTEGER,
  claim_token_hash TEXT,
  claim_started_at INTEGER,
  claimed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (buyer_hash) REFERENCES web_store_buyers(buyer_hash)
);

CREATE INDEX IF NOT EXISTS web_store_sessions_buyer_ready
  ON web_store_sessions(buyer_hash, ready_at, claimed_at);

CREATE TABLE IF NOT EXISTS web_store_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
