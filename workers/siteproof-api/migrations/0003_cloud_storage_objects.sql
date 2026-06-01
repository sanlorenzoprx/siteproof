CREATE TABLE IF NOT EXISTS cloud_storage_objects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  report_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  share_link_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cloud_objects_owner_job ON cloud_storage_objects(owner_id, job_id);
CREATE INDEX IF NOT EXISTS idx_cloud_objects_type ON cloud_storage_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_cloud_objects_report_type ON cloud_storage_objects(report_type);
CREATE INDEX IF NOT EXISTS idx_cloud_objects_visibility ON cloud_storage_objects(visibility);
CREATE INDEX IF NOT EXISTS idx_cloud_objects_share_link ON cloud_storage_objects(share_link_id);
