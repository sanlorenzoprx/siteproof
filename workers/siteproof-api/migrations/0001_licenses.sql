CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  plan_id TEXT NOT NULL,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  cloud_entitled INTEGER NOT NULL DEFAULT 0,
  activated_at INTEGER,
  last_verified_at INTEGER,
  expires_at INTEGER,
  device_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_licenses_license_key
ON licenses (license_key);

CREATE TABLE IF NOT EXISTS license_events (
  id TEXT PRIMARY KEY,
  license_key TEXT,
  event_type TEXT NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);
