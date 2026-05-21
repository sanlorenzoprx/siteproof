import assert from 'node:assert/strict';
import test from 'node:test';
import { filterAssemblyRelatedDataForReport } from './exportAssembler';
import type { ExportAssembly, ExportProofBundle } from './exportAssembler';
import { getReportDefinition } from './reportDefinitions';
import { filterProofBundlesForReport } from './reportFilters';
import { SiteProofReportType } from './reportTypes';
import type { ProofObject } from '../../db/schema';

function proof(
  id: string,
  overrides: Partial<ProofObject> = {},
): ProofObject {
  return {
    proof_id: id,
    job_id: 'job-1',
    proof_type: 'photo',
    title: id,
    captured_at: '2026-05-19T12:00:00.000Z',
    required_flag: false,
    ai_labels: [],
    user_labels: [],
    inspection_tags: [],
    permit_tags: [],
    export_tags: [],
    sync_state: 'local_only',
    local_version: 1,
    created_at: '2026-05-19T12:00:00.000Z',
    updated_at: '2026-05-19T12:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function bundle(proofObject: ProofObject, extra: Partial<ExportProofBundle> = {}): ExportProofBundle {
  return {
    proof: proofObject,
    media: [],
    requirementLabel: proofObject.title,
    stageLabel: 'Stage',
    ...extra,
  };
}

function assembly(proofBundles: ExportProofBundle[]): ExportAssembly {
  const photos = proofBundles
    .filter((item) => item.proof.proof_type === 'photo')
    .map((item) => ({
      id: item.proof.proof_id,
      jobId: item.proof.job_id,
      category: item.requirementLabel,
      timestamp: Date.parse(item.proof.captured_at),
      isIssue: item.proof.metadata?.is_issue === true,
      syncStatus: 'PENDING' as const,
    }));

  const notes = proofBundles
    .filter((item) => item.proof.proof_type === 'voice_note')
    .map((item) => ({
      id: item.proof.proof_id,
      jobId: item.proof.job_id,
      transcribedText: item.legacyVoiceNote?.transcribedText ?? '',
      timestamp: Date.parse(item.proof.captured_at),
      category: item.requirementLabel,
      isIssue: item.legacyVoiceNote?.isIssue ?? false,
      isChangeOrder: item.legacyVoiceNote?.isChangeOrder ?? false,
      syncStatus: 'PENDING' as const,
    }));

  return {
    runtimeJob: {
      job_id: 'job-1',
      company_id: 'company-1',
      job_title: 'Generator',
      job_type: 'Generator Install',
      trade_specialty: 'electrical',
      status: 'active',
      template_id: 'generator_install_v1',
      template_version: '1.0.0',
      sync_state: 'local_only',
      local_version: 1,
      created_at: '2026-05-19T12:00:00.000Z',
      updated_at: '2026-05-19T12:00:00.000Z',
    },
    legacyJob: {
      id: 'job-1',
      customerName: 'Ada',
      address: '123 Main',
      jobType: 'Generator Install',
      createdAt: Date.parse('2026-05-19T12:00:00.000Z'),
      updatedAt: Date.parse('2026-05-19T12:00:00.000Z'),
      status: 'ACTIVE',
      notes: '',
    },
    template: null,
    stages: [{
      stage_instance_id: 'stage-1',
      job_id: 'job-1',
      template_id: 'generator_install_v1',
      template_version: '1.0.0',
      template_stage_id: 'inspection_readiness',
      stage_key: 'inspection_readiness',
      stage_name: 'Inspection Readiness',
      sort_order: 1,
      status: 'in_progress',
      required_count: 2,
      completed_required_count: 1,
      recommended_count: 0,
      completed_recommended_count: 0,
      missing_items: ['Permit card photo'],
      sync_state: 'local_only',
      local_version: 1,
      created_at: '2026-05-19T12:00:00.000Z',
      updated_at: '2026-05-19T12:00:00.000Z',
    }],
    proofs: proofBundles.map((item) => item.proof),
    mediaAssets: [],
    voiceNotes: [],
    timelineEvents: [],
    proofBundles,
    photos,
    notes,
    selectedProofIds: proofBundles.map((item) => item.proof.proof_id),
    includedSections: [],
    packetType: 'internal_record',
    openRequiredItems: ['Permit card photo'],
  };
}

test('customer completion excludes internal-only issue proof by default', () => {
  const source = assembly([
    bundle(proof('customer-safe', { title: 'Final completion photo', export_tags: ['customer_packet'] })),
    bundle(proof('before-safe', { title: 'Before work overview' })),
    bundle(proof('internal-issue', { user_labels: ['issue'], metadata: { is_issue: true }, export_tags: ['internal_record'] })),
  ]);

  const result = filterProofBundlesForReport(source, getReportDefinition(SiteProofReportType.CUSTOMER_COMPLETION));

  assert.deepEqual(result.selectedProofIds, ['customer-safe']);
  assert.equal(source.selectedProofIds.length, 3);
});

test('customer completion fallback uses the most recent customer-safe proof without pulling internal issues', () => {
  const source = assembly([
    bundle(proof('old-active', { title: 'Work area documented', captured_at: '2026-05-19T12:00:00.000Z' }), { stageLabel: 'Active Work' }),
    bundle(proof('recent-active', { title: 'Recent work area documented', captured_at: '2026-05-19T14:00:00.000Z' }), { stageLabel: 'Active Work' }),
    bundle(proof('recent-internal-issue', { title: 'Change order concern', captured_at: '2026-05-19T15:00:00.000Z', user_labels: ['issue'], metadata: { is_issue: true } })),
  ]);

  const result = filterProofBundlesForReport(source, getReportDefinition(SiteProofReportType.CUSTOMER_COMPLETION));

  assert.deepEqual(result.selectedProofIds, ['recent-active']);
});

test('customer completion excludes change-order issue proof unless marked customer safe', () => {
  const source = assembly([
    bundle(proof('final-photo', { title: 'Final completion photo' })),
    bundle(proof('change-order-internal', { title: 'Change order issue', user_labels: ['change_order'], metadata: { is_issue: true } })),
    bundle(proof('change-order-customer-safe', { title: 'Customer approved change order note', user_labels: ['change_order'], metadata: { is_issue: true, customer_safe: true } })),
  ]);

  const result = filterProofBundlesForReport(source, getReportDefinition(SiteProofReportType.CUSTOMER_COMPLETION));

  assert.deepEqual(result.selectedProofIds, ['final-photo', 'change-order-customer-safe']);
});

test('change order evidence includes change order labels and voice candidates', () => {
  const source = assembly([
    bundle(proof('change-label', { user_labels: ['change_order'] })),
    bundle(proof('voice-change', { proof_type: 'voice_note' }), {
      legacyVoiceNote: {
        id: 'voice-change',
        jobId: 'job-1',
        transcribedText: 'Customer requested additional work.',
        timestamp: Date.parse('2026-05-19T12:00:00.000Z'),
        category: 'Change order',
        changeOrderCandidates: ['additional work'],
        syncStatus: 'PENDING',
      },
    }),
    bundle(proof('normal-proof')),
  ]);

  const result = filterProofBundlesForReport(source, getReportDefinition(SiteProofReportType.CHANGE_ORDER_EVIDENCE));

  assert.deepEqual(result.selectedProofIds, ['change-label', 'voice-change']);
});

test('photo proof timeline includes all non-deleted proof chronologically', () => {
  const source = assembly([
    bundle(proof('late', { captured_at: '2026-05-19T14:00:00.000Z' })),
    bundle(proof('deleted', { captured_at: '2026-05-19T13:00:00.000Z', deleted_at: '2026-05-19T13:30:00.000Z' })),
    bundle(proof('early', { captured_at: '2026-05-19T12:00:00.000Z' })),
  ]);

  const result = filterProofBundlesForReport(source, getReportDefinition(SiteProofReportType.PHOTO_PROOF_TIMELINE));

  assert.deepEqual(result.selectedProofIds, ['early', 'late']);
});

test('inspection readiness includes required proof and open items', () => {
  const source = assembly([
    bundle(proof('required-proof', { required_flag: true })),
    bundle(proof('inspection-tag', { inspection_tags: ['inspection'] })),
    bundle(proof('normal-proof')),
  ]);

  const result = filterProofBundlesForReport(source, getReportDefinition(SiteProofReportType.INSPECTION_READINESS));

  assert.deepEqual(result.selectedProofIds, ['required-proof', 'inspection-tag']);
  assert.deepEqual(result.openRequiredItems, ['Permit card photo']);
});

test('payment final handoff includes completion proof and payment sections', () => {
  const source = assembly([
    bundle(proof('final-photo', { title: 'Final completion photo' })),
    bundle(proof('signoff', { proof_type: 'signature' })),
    bundle(proof('normal-proof')),
  ]);
  const definition = getReportDefinition(SiteProofReportType.PAYMENT_FINAL_HANDOFF);

  const result = filterProofBundlesForReport(source, definition);

  assert.deepEqual(result.selectedProofIds, ['final-photo', 'signoff']);
  assert.equal(result.includedSections.includes('payment_readiness'), true);
});

test('report assembly related data follows selected proof ids except timeline-all unlinked events', () => {
  const source = assembly([
    bundle(proof('selected')),
    bundle(proof('unselected')),
  ]);
  source.mediaAssets = [
    {
      media_id: 'media-selected',
      proof_id: 'selected',
      job_id: 'job-1',
      local_uri: 'local://selected',
      mime_type: 'image/jpeg',
      file_size: 10,
      compression_state: 'not_needed',
      upload_state: 'local_only',
      sync_state: 'local_only',
      local_version: 1,
      created_at: '2026-05-19T12:00:00.000Z',
      updated_at: '2026-05-19T12:00:00.000Z',
    },
    {
      media_id: 'media-unselected',
      proof_id: 'unselected',
      job_id: 'job-1',
      local_uri: 'local://unselected',
      mime_type: 'image/jpeg',
      file_size: 10,
      compression_state: 'not_needed',
      upload_state: 'local_only',
      sync_state: 'local_only',
      local_version: 1,
      created_at: '2026-05-19T12:00:00.000Z',
      updated_at: '2026-05-19T12:00:00.000Z',
    },
  ];
  source.timelineEvents = [
    {
      event_id: 'event-selected',
      job_id: 'job-1',
      event_type: 'proof_captured',
      event_title: 'Selected',
      related_proof_ids: ['selected'],
      occurred_at: '2026-05-19T12:00:00.000Z',
      sync_state: 'local_only',
      local_version: 1,
      created_at: '2026-05-19T12:00:00.000Z',
      updated_at: '2026-05-19T12:00:00.000Z',
    },
    {
      event_id: 'event-unlinked',
      job_id: 'job-1',
      event_type: 'job_created',
      event_title: 'Job created',
      related_proof_ids: [],
      occurred_at: '2026-05-19T11:00:00.000Z',
      sync_state: 'local_only',
      local_version: 1,
      created_at: '2026-05-19T11:00:00.000Z',
      updated_at: '2026-05-19T11:00:00.000Z',
    },
  ];

  const customerRelated = filterAssemblyRelatedDataForReport(source, ['selected'], SiteProofReportType.CUSTOMER_COMPLETION);
  assert.deepEqual(customerRelated.mediaAssets.map((asset) => asset.media_id), ['media-selected']);
  assert.deepEqual(customerRelated.timelineEvents.map((event) => event.event_id), ['event-selected']);

  const timelineRelated = filterAssemblyRelatedDataForReport(source, ['selected', 'unselected'], SiteProofReportType.PHOTO_PROOF_TIMELINE);
  assert.deepEqual(timelineRelated.mediaAssets.map((asset) => asset.media_id), ['media-selected', 'media-unselected']);
  assert.deepEqual(timelineRelated.timelineEvents.map((event) => event.event_id), ['event-selected', 'event-unlinked']);
});
