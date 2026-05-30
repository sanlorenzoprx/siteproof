import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExportAssembly, ExportProofBundle } from './exportAssembler';
import { getReportDefinition } from './reportDefinitions';
import { filterProofBundlesForReport } from './reportFilters';
import { SiteProofReportType } from './reportTypes';

function bundle(id: string, visibility?: string, exportTags: string[] = []): ExportProofBundle {
  return {
    proof: {
      proof_id: id,
      job_id: 'job-1',
      proof_type: 'photo',
      title: id,
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
      metadata: visibility ? { visibility } : {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_state: 'pending_upload',
      local_version: 1,
    },
    media: [],
    requirementLabel: id,
    stageLabel: 'Bid',
  };
}

test('customer bid report excludes private and internal proof while internal bid includes all', () => {
  const proofBundles = [
    bundle('customer-safe', 'customer_visible'),
    bundle('private-proof', 'private'),
    bundle('internal-proof', undefined, ['internal_only']),
  ];
  const assembly = {
    proofBundles,
    photos: proofBundles.map((item) => ({
      id: item.proof.proof_id,
      jobId: 'job-1',
      category: item.proof.title,
      timestamp: Date.now(),
    })),
    notes: [],
    stages: [],
  } as unknown as ExportAssembly;

  const internal = filterProofBundlesForReport(assembly, getReportDefinition(SiteProofReportType.INTERNAL_BID_REPORT));
  const customer = filterProofBundlesForReport(assembly, getReportDefinition(SiteProofReportType.CUSTOMER_BID_REPORT));

  assert.deepEqual(internal.selectedProofIds, ['customer-safe', 'private-proof', 'internal-proof']);
  assert.deepEqual(customer.selectedProofIds, ['customer-safe']);
});
