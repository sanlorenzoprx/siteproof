import { SyncOperation } from '../../db/schema';

function pickRecord(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in source) next[key] = source[key];
  }
  return next;
}

const ENTITY_WHITELISTS: Partial<Record<SyncOperation['entity_type'], string[]>> = {
  company_profile: ['company_id', 'company_name', 'trade_specialties', 'default_service_area', 'default_report_footer', 'updated_at', 'local_version'],
  customer: ['customer_id', 'company_id', 'name', 'preferred_contact_method', 'notes', 'updated_at', 'local_version'],
  job: ['job_id', 'company_id', 'customer_id', 'job_title', 'job_type', 'trade_specialty', 'status', 'template_id', 'template_version', 'updated_at', 'local_version'],
  workflow_stage_instance: ['stage_instance_id', 'job_id', 'stage_key', 'status', 'required_count', 'completed_required_count', 'updated_at', 'local_version'],
  proof_object: ['proof_id', 'job_id', 'stage_instance_id', 'requirement_id', 'proof_type', 'title', 'captured_at', 'required_flag', 'inspection_tags', 'permit_tags', 'export_tags', 'integrity_hash', 'hash_algorithm', 'integrity_status', 'updated_at', 'local_version'],
  media_asset: ['media_id', 'proof_id', 'job_id', 'mime_type', 'file_name', 'file_size', 'width', 'height', 'duration_ms', 'compression_state', 'upload_state', 'cloud_object_key', 'updated_at', 'local_version'],
  job_document: ['document_id', 'job_id', 'workflow_step_id', 'proof_object_id', 'media_asset_id', 'document_type', 'source_type', 'timestamp', 'report_tags', 'inspection_tags', 'document_sync_state', 'updated_at', 'local_version'],
  voice_note: ['voice_note_id', 'proof_id', 'job_id', 'audio_media_id', 'transcript', 'language', 'summary', 'extracted_tasks', 'change_order_candidates', 'material_mentions', 'issue_mentions', 'updated_at', 'local_version'],
  timeline_event: ['event_id', 'job_id', 'stage_instance_id', 'event_type', 'event_title', 'event_description', 'related_proof_ids', 'occurred_at', 'updated_at', 'local_version'],
  export_packet: ['export_id', 'job_id', 'packet_type', 'title', 'generated_at', 'template_id', 'template_version', 'share_status', 'delivery_status', 'export_language', 'updated_at', 'local_version'],
  change_order_candidate: ['change_order_id', 'job_id', 'source_proof_id', 'detected_from', 'description', 'estimated_impact', 'status', 'related_photo_ids', 'related_note_ids', 'updated_at', 'local_version'],
  workflow_learning_event: ['learning_event_id', 'job_id', 'pack_id', 'trade', 'specialty', 'step_id', 'action', 'reason', 'applies_to_future_jobs', 'updated_at', 'local_version'],
};

export function sanitizeSyncOperation(op: SyncOperation): SyncOperation {
  const payload = op.payload && typeof op.payload === 'object'
    ? op.payload as Record<string, unknown>
    : {};
  const keys = ENTITY_WHITELISTS[op.entity_type];
  if (!keys) return { ...op, payload };
  return { ...op, payload: pickRecord(payload, keys) };
}

