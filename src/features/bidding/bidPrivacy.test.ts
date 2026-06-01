import assert from 'node:assert/strict';
import test from 'node:test';
import { bidRecordFromJob, filterBidForAudience, proofBundleVisibleToBidCustomer } from './bidPrivacy';
import type { Job } from '../../domain/models';
import type { ExportProofBundle } from '../export/exportAssembler';

test('new bid job defaults to internal privacy and customer filter removes private fields', () => {
  const job: Job = {
    id: 'job-1',
    mode: 'bid',
    customerName: 'ACME',
    address: '123 Main',
    jobType: 'Generator bid',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'INCOMING',
    notes: 'Replace generator',
    bidInternalNotes: 'Margin target 38%',
    bidCustomerNotes: 'Generator replacement proposal',
    bidMetrics: [
      { metricId: 'm1', label: 'Total', value: '$12,000', type: 'text', visibility: 'customer', required: false },
      { metricId: 'm2', label: 'Margin', value: '38%', type: 'text', visibility: 'internal', required: false },
    ],
  };

  const bid = bidRecordFromJob(job);
  assert.equal(bid.privacy, 'internal_only');
  const customer = filterBidForAudience(bid, 'customer');
  assert.equal(customer.internalNotes, '');
  assert.deepEqual(customer.metrics.map((metric) => metric.label), ['Total']);
});

test('customer bid proof filter excludes hidden and internal proof', () => {
  const bundle = (metadata: Record<string, unknown>, exportTags: string[] = []): ExportProofBundle => ({
    proof: {
      proof_id: crypto.randomUUID(),
      job_id: 'job-1',
      proof_type: 'photo',
      title: 'Proof',
      description: null,
      captured_at: new Date().toISOString(),
      required_flag: false,
      priority: 'optional',
      ai_labels: [],
      user_labels: [],
      inspection_tags: [],
      permit_tags: [],
      export_tags: exportTags,
      notes: null,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_state: 'pending_upload',
      local_version: 1,
    },
    media: [],
    requirementLabel: 'Proof',
    stageLabel: 'Field Proof',
  });

  assert.equal(proofBundleVisibleToBidCustomer(bundle({ visibility: 'customer_visible' })), true);
  assert.equal(proofBundleVisibleToBidCustomer(bundle({ visibility: 'private' })), false);
  assert.equal(proofBundleVisibleToBidCustomer(bundle({}, ['internal_only'])), false);
});
