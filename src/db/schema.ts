// SiteProof Data Schema v1
// Drop-in TypeScript domain entities for IndexedDB now and SQLite/Room later.

export type SyncStateValue =
  | 'local_only'
  | 'pending_upload'
  | 'uploading'
  | 'synced'
  | 'conflict'
  | 'failed';

export type JobStatus =
  | 'draft'
  | 'active'
  | 'waiting'
  | 'inspection_ready'
  | 'complete'
  | 'archived'
  | 'cancelled';

export type PermitStatus =
  | 'unknown'
  | 'not_required'
  | 'needed'
  | 'applied'
  | 'approved'
  | 'posted'
  | 'closed';

export type InspectionStatus =
  | 'unknown'
  | 'not_required'
  | 'needed'
  | 'scheduled'
  | 'ready'
  | 'passed'
  | 'failed'
  | 'closed';

export type WorkflowStageKey =
  | 'intake'
  | 'site_arrival'
  | 'existing_conditions'
  | 'active_work'
  | 'inspection_readiness'
  | 'completion'
  | 'export_archive';

export type StageStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'complete'
  | 'skipped';

export type ProofType =
  | 'photo'
  | 'video'
  | 'voice_note'
  | 'text_note'
  | 'signature'
  | 'measurement'
  | 'document'
  | 'checklist_item'
  | 'gps_event'
  | 'weather_snapshot'
  | 'serial_number'
  | 'test_result';

export type RequirementPriority = 'required' | 'recommended' | 'optional' | 'conditional';

export type CompressionState = 'not_needed' | 'pending' | 'compressing' | 'compressed' | 'failed';
export type UploadState = 'local_only' | 'pending_upload' | 'uploading' | 'uploaded' | 'failed';

export type ProofIntegrityStatus = 'verified' | 'modified' | 'missing_hash' | 'unavailable';

export interface ChainOfCustodyEntry {
  at: string;
  actor?: string | null;
  action: 'captured' | 'hashed' | 'verified' | 'modified' | 'exported' | 'synced' | 'viewed';
  note?: string | null;
}

export type TimelineEventType =
  | 'job_created'
  | 'job_started'
  | 'stage_started'
  | 'proof_captured'
  | 'note_added'
  | 'checklist_completed'
  | 'stage_completed'
  | 'export_generated'
  | 'job_completed'
  | 'sync_completed'
  | 'warning'
  | 'change_order_detected';

export type ExportPacketType =
  | 'customer_packet'
  | 'inspector_packet'
  | 'insurance_packet'
  | 'warranty_packet'
  | 'internal_record'
  | 'litigation_packet';

export type ShareStatus = 'not_shared' | 'shared_link_created' | 'sent_email' | 'downloaded' | 'expired';
export type DeliveryStatus = 'not_sent' | 'queued' | 'sent' | 'opened' | 'downloaded' | 'failed';

export type SyncEntityType =
  | 'company_profile'
  | 'customer'
  | 'job'
  | 'workflow_stage_instance'
  | 'proof_object'
  | 'media_asset'
  | 'voice_note'
  | 'timeline_event'
  | 'export_packet'
  | 'change_order_candidate';

export type SyncOperationType = 'create' | 'update' | 'delete' | 'upload_media' | 'upload_export' | 'resolve_conflict';
export type SyncOperationStatus = 'queued' | 'running' | 'blocked' | 'completed' | 'failed' | 'cancelled';

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  county?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  formatted?: string;
}

export interface LicenseNumber {
  trade: string;
  license_number: string;
  state?: string;
  expires_at?: string | null;
}

export interface InsuranceInfo {
  carrier?: string;
  policy_number?: string;
  expires_at?: string | null;
}

export interface ExportBranding {
  logo_uri?: string | null;
  primary_color?: string | null;
  footer_text?: string | null;
}

export interface EmailTemplate {
  template_id: string;
  packet_type: ExportPacketType;
  subject: string;
  body: string;
}

export interface SyncFields {
  sync_state: SyncStateValue;
  local_version: number;
  remote_version?: number | null;
  last_synced_at?: string | null;
}

export interface TimestampFields {
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CompanyProfile extends TimestampFields, SyncFields {
  company_id: string;
  company_name: string;
  logo_uri?: string | null;
  trade_types: string[];
  license_numbers: LicenseNumber[];
  insurance_info?: InsuranceInfo | null;
  business_address?: Address | null;
  business_zip?: string | null;
  default_service_area?: string[];
  default_export_branding?: ExportBranding | null;
  default_email_templates?: EmailTemplate[];
  default_report_footer?: string | null;
}

export interface Customer extends TimestampFields, SyncFields {
  customer_id: string;
  company_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  billing_address?: Address | null;
  property_address?: Address | null;
  preferred_contact_method?: 'phone' | 'email' | 'text' | 'none';
  notes?: string | null;
}

export interface Job extends TimestampFields, SyncFields {
  job_id: string;
  company_id: string;
  customer_id?: string | null;
  job_title: string;
  job_type: string;
  trade: string;
  vertical?: string | null;
  status: JobStatus;
  priority?: 'low' | 'normal' | 'high' | 'emergency';
  jobsite_address?: Address | null;
  jobsite_zip?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  template_id: string;
  template_version: string;
  permit_status?: PermitStatus;
  inspection_status?: InspectionStatus;
  scope_summary?: string | null;
  emergency_job?: boolean;
  storm_related?: boolean;
  utility_provider?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface WorkflowTemplateCache {
  template_cache_id: string;
  template_id: string;
  template_version: string;
  template_status: 'draft' | 'active' | 'deprecated' | 'archived';
  trade: string;
  vertical: string;
  job_type: string;
  display_name: string;
  full_template_json: unknown;
  checksum?: string | null;
  downloaded_at: string;
  last_used_at?: string | null;
  active_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStageInstance extends TimestampFields, SyncFields {
  stage_instance_id: string;
  job_id: string;
  template_id: string;
  template_version: string;
  template_stage_id: string;
  stage_key: WorkflowStageKey;
  stage_name: string;
  sort_order: number;
  status: StageStatus;
  required_count: number;
  completed_required_count: number;
  recommended_count: number;
  completed_recommended_count: number;
  missing_items: string[];
  skipped_reason?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface ProofObject extends TimestampFields, SyncFields {
  proof_id: string;
  job_id: string;
  stage_instance_id?: string | null;
  requirement_id?: string | null;
  proof_type: ProofType;
  title: string;
  description?: string | null;
  captured_at: string;
  device_captured_at?: string | null;
  gps_timestamp?: string | null;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  gps_accuracy_meters?: number | null;
  address_snapshot?: Address | null;
  captured_by?: string | null;
  required_flag: boolean;
  priority?: RequirementPriority;
  ai_labels: string[];
  user_labels: string[];
  inspection_tags: string[];
  permit_tags: string[];
  export_tags: string[];
  confidence_score?: number | null;
  quality_score?: number | null;
  hash?: string | null;
  integrity_hash?: string | null;
  hash_algorithm?: 'SHA-256' | null;
  integrity_status?: ProofIntegrityStatus;
  integrity_stamped_at?: string | null;
  chain_of_custody?: ChainOfCustodyEntry[];
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MediaAsset extends TimestampFields, SyncFields {
  media_id: string;
  proof_id: string;
  job_id: string;
  local_uri: string;
  cloud_uri?: string | null;
  thumbnail_uri?: string | null;
  mime_type: string;
  file_name?: string | null;
  file_size: number;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  compression_state: CompressionState;
  upload_state: UploadState;
  checksum?: string | null;
}

export interface VoiceNote extends TimestampFields, SyncFields {
  voice_note_id: string;
  proof_id: string;
  job_id: string;
  audio_media_id?: string | null;
  transcript?: string | null;
  language?: 'en' | 'es' | 'unknown';
  summary?: string | null;
  extracted_tasks: string[];
  change_order_candidates: string[];
  material_mentions: string[];
  issue_mentions: string[];
}

export interface TimelineEvent extends TimestampFields, SyncFields {
  event_id: string;
  job_id: string;
  stage_instance_id?: string | null;
  event_type: TimelineEventType;
  event_title: string;
  event_description?: string | null;
  related_proof_ids: string[];
  occurred_at: string;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  created_by?: string | null;
}

export interface ExportPacket extends TimestampFields, SyncFields {
  export_id: string;
  job_id: string;
  packet_type: ExportPacketType;
  title: string;
  generated_at: string;
  generated_by?: string | null;
  local_file_uri: string;
  cloud_file_uri?: string | null;
  included_proof_ids: string[];
  included_sections: string[];
  manifest_hash?: string | null;
  signed_manifest_hash?: string | null;
  manifest_id?: string | null;
  template_id: string;
  template_version: string;
  share_status: ShareStatus;
  sent_to: string[];
  delivery_status?: DeliveryStatus;
}

export interface ChangeOrderCandidate extends TimestampFields, SyncFields {
  change_order_id: string;
  job_id: string;
  source_proof_id?: string | null;
  detected_from: 'voice_note' | 'text_note' | 'photo_label' | 'manual';
  description: string;
  estimated_impact?: string | null;
  status: 'candidate' | 'reviewed' | 'approved' | 'rejected' | 'converted';
  related_photo_ids: string[];
  related_note_ids: string[];
}

export interface JurisdictionProfile {
  jurisdiction_id: string;
  zip: string;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  country: string;
  ahj_name?: string | null;
  permit_office_url?: string | null;
  inspection_scheduling_url?: string | null;
  utility_provider?: string | null;
  adopted_code_versions: string[];
  local_amendments: string[];
  flood_zone_notes?: string | null;
  wind_zone_notes?: string | null;
  licensing_notes?: string | null;
  source_urls: string[];
  last_verified_at?: string | null;
  confidence_level: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface PermitRequirement {
  permit_requirement_id: string;
  trade: string;
  job_type: string;
  jurisdiction_id: string;
  requirement_name: string;
  requirement_description: string;
  required_documents: string[];
  required_photos: string[];
  inspection_sequence: string[];
  source_url?: string | null;
  effective_date?: string | null;
  confidence_level: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface InspectionRequirement {
  inspection_requirement_id: string;
  trade: string;
  job_type: string;
  jurisdiction_id: string;
  inspection_type: string;
  required_proof: string[];
  common_failure_reasons: string[];
  readiness_rules: string[];
  source_url?: string | null;
  effective_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncOperation {
  operation_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation_type: SyncOperationType;
  payload: Record<string, unknown>;
  dependency_ids: string[];
  status: SyncOperationStatus;
  retry_count: number;
  max_retries: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
  next_retry_at?: string | null;
  completed_at?: string | null;
}

export interface AppSettings {
  settings_id: string;
  company_id?: string | null;
  key: string;
  value: unknown;
  scope: 'device' | 'company' | 'user';
  created_at: string;
  updated_at: string;
}

export type StoreName =
  | 'company_profiles'
  | 'customers'
  | 'jobs'
  | 'workflow_template_cache'
  | 'workflow_stage_instances'
  | 'proof_objects'
  | 'media_assets'
  | 'voice_notes'
  | 'timeline_events'
  | 'export_packets'
  | 'change_order_candidates'
  | 'jurisdiction_profiles'
  | 'permit_requirements'
  | 'inspection_requirements'
  | 'sync_operations'
  | 'app_settings';

export const STORE_NAMES: StoreName[] = [
  'company_profiles',
  'customers',
  'jobs',
  'workflow_template_cache',
  'workflow_stage_instances',
  'proof_objects',
  'media_assets',
  'voice_notes',
  'timeline_events',
  'export_packets',
  'change_order_candidates',
  'jurisdiction_profiles',
  'permit_requirements',
  'inspection_requirements',
  'sync_operations',
  'app_settings',
];

export const nowIso = (): string => new Date().toISOString();
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function baseSyncFields(): SyncFields {
  return { sync_state: 'pending_upload', local_version: 1, remote_version: null, last_synced_at: null };
}

export function baseTimestampFields(): TimestampFields {
  const now = nowIso();
  return { created_at: now, updated_at: now, deleted_at: null };
}
