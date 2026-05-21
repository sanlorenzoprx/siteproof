import test from 'node:test';
import assert from 'node:assert/strict';
import { proofRepository } from '../db/repositories/proofRepository';
import { mediaRepository } from '../db/repositories/mediaRepository';
import { voiceNoteRepository } from '../db/repositories/voiceNoteRepository';
import { JobDocumentAdapter } from './jobDocumentAdapter';
import { MissingProofDetectionService } from './missingProofDetectionService';
import { ProReportManifestBuilder } from './proReportManifestBuilder';
import { JobDocument, MediaAsset, ProofObject, VoiceNote } from '../db/schema';

const now = '2026-05-21T00:00:00.000Z';

function proof(overrides: Partial<ProofObject>): ProofObject {
  return {
    proof_id: 'proof-1',
    job_id: 'job-1',
    stage_instance_id: null,
    requirement_id: 'permit_document',
    proof_type: 'document',
    title: 'Permit',
    description: null,
    captured_at: now,
    required_flag: false,
    priority: 'recommended',
    ai_labels: [],
    user_labels: [],
    inspection_tags: ['permit_document'],
    permit_tags: ['permit_document'],
    export_tags: ['inspection_readiness', 'office_ready'],
    notes: null,
    metadata: {},
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_state: 'local_only',
    local_version: 1,
    remote_version: null,
    last_synced_at: null,
    ...overrides,
  };
}

const document: JobDocument = {
  document_id: 'doc-1',
  job_id: 'job-1',
  workflow_step_id: 'permit_document',
  proof_object_id: 'proof-1',
  media_asset_id: 'media-1',
  document_type: 'permit_document',
  source_type: 'camera_capture',
  local_uri: 'local://permit.jpg',
  file_name: 'permit.jpg',
  mime_type: 'image/jpeg',
  user_note: null,
  extracted_text: null,
  trade: 'Electrical',
  specialty: 'Generator Install',
  jurisdiction_id: null,
  timestamp: now,
  gps_latitude: null,
  gps_longitude: null,
  gps_accuracy: null,
  report_tags: ['inspection_readiness', 'office_ready'],
  inspection_tags: ['permit_document'],
  document_sync_state: 'local_only',
  created_at: now,
  updated_at: now,
  deleted_at: null,
  sync_state: 'local_only',
  local_version: 1,
  remote_version: null,
  last_synced_at: null,
};

test('office internal manifest includes broader proof, job documents, media, voice notes, and warnings', async () => {
  const originalProof = proofRepository.getByJob;
  const originalMedia = mediaRepository.getByJob;
  const originalVoice = voiceNoteRepository.getByJob;
  const originalDocuments = JobDocumentAdapter.listForJobIncludingLegacy;
  const originalWarnings = MissingProofDetectionService.getWarnings;

  try {
    proofRepository.getByJob = async () => [
      proof({ proof_id: 'proof-1', proof_type: 'document', export_tags: ['inspection_readiness'] }),
      proof({ proof_id: 'proof-2', proof_type: 'photo', export_tags: ['internal_only'] }),
    ];
    mediaRepository.getByJob = async () => [
      { media_id: 'media-1', proof_id: 'proof-1', job_id: 'job-1' } as MediaAsset,
      { media_id: 'media-2', proof_id: 'proof-2', job_id: 'job-1' } as MediaAsset,
    ];
    voiceNoteRepository.getByJob = async () => [
      { voice_note_id: 'voice-1', proof_id: 'proof-2', job_id: 'job-1' } as VoiceNote,
    ];
    JobDocumentAdapter.listForJobIncludingLegacy = async () => [document];
    MissingProofDetectionService.getWarnings = async () => [
      { stepId: 'fuel_line_install', title: 'Fuel line', required: true, warning: 'Fuel line proof is missing.', action: 'capture_missing_proof' },
    ];

    const manifest = await ProReportManifestBuilder.build(
      { id: 'job-1', tradePackId: 'generator_install_v1' },
      'office_internal_record',
    );

    assert.equal(manifest.title, 'Office / Internal Job Record Pro Report');
    assert.equal(manifest.includedProof.length, 2);
    assert.deepEqual(manifest.includedJobDocuments.map((item) => item.document_id), ['doc-1']);
    assert.deepEqual(manifest.includedMediaIds.sort(), ['media-1', 'media-2']);
    assert.deepEqual(manifest.includedStructuredVoiceNotes.map((item) => item.voice_note_id), ['voice-1']);
    assert.equal(manifest.missingProofWarnings.length, 1);
  } finally {
    proofRepository.getByJob = originalProof;
    mediaRepository.getByJob = originalMedia;
    voiceNoteRepository.getByJob = originalVoice;
    JobDocumentAdapter.listForJobIncludingLegacy = originalDocuments;
    MissingProofDetectionService.getWarnings = originalWarnings;
  }
});

test('inspection manifest includes tagged real job documents without duplicating linked document proof', async () => {
  const originalProof = proofRepository.getByJob;
  const originalMedia = mediaRepository.getByJob;
  const originalVoice = voiceNoteRepository.getByJob;
  const originalDocuments = JobDocumentAdapter.listForJobIncludingLegacy;
  const originalWarnings = MissingProofDetectionService.getWarnings;

  try {
    proofRepository.getByJob = async () => [
      proof({ proof_id: 'proof-1', proof_type: 'document', export_tags: ['inspection_readiness'] }),
    ];
    mediaRepository.getByJob = async () => [{ media_id: 'media-1', proof_id: 'proof-1', job_id: 'job-1' } as MediaAsset];
    voiceNoteRepository.getByJob = async () => [];
    JobDocumentAdapter.listForJobIncludingLegacy = async () => [document];
    MissingProofDetectionService.getWarnings = async () => [];

    const manifest = await ProReportManifestBuilder.build(
      { id: 'job-1', tradePackId: 'generator_install_v1' },
      'inspection_readiness',
    );

    assert.deepEqual(manifest.includedJobDocuments.map((item) => item.document_id), ['doc-1']);
    assert.deepEqual(manifest.includedDocuments, []);
    assert.deepEqual(manifest.includedMediaIds, ['media-1']);
  } finally {
    proofRepository.getByJob = originalProof;
    mediaRepository.getByJob = originalMedia;
    voiceNoteRepository.getByJob = originalVoice;
    JobDocumentAdapter.listForJobIncludingLegacy = originalDocuments;
    MissingProofDetectionService.getWarnings = originalWarnings;
  }
});
