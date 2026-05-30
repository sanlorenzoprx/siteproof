CREATE TABLE IF NOT EXISTS company_profiles (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  owner_admin_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  trade_type TEXT,
  service_area TEXT,
  business_address TEXT,
  license_number TEXT,
  preferred_language TEXT DEFAULT 'en',
  report_language TEXT DEFAULT 'en',
  crew_device_count INTEGER,
  cloud_storage_plan TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (license_id) REFERENCES licenses(id)
);

CREATE TABLE IF NOT EXISTS purchase_intake_events (
  id TEXT PRIMARY KEY,
  checkout_session_id TEXT,
  license_id TEXT,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
