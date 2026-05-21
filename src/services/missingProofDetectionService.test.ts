import test from 'node:test';
import assert from 'node:assert/strict';
import { proofRepository } from '../db/repositories/proofRepository';
import { workflowLearningEventRepository } from '../db/repositories/workflowLearningEventRepository';
import { MissingProofDetectionService } from './missingProofDetectionService';

test('missing-proof detection respects local mark-not-needed learning events', async () => {
  const originalProof = proofRepository.getByJob;
  const originalEvents = workflowLearningEventRepository.getByJobId;

  try {
    proofRepository.getByJob = async () => [];
    workflowLearningEventRepository.getByJobId = async () => [
      {
        learning_event_id: 'event-1',
        job_id: 'job-1',
        pack_id: 'generator_install_v1',
        trade: 'Electrical',
        specialty: 'Generator Install',
        step_id: 'permit_or_inspection_document',
        action: 'mark_not_needed',
        reason: null,
        applies_to_future_jobs: false,
        metadata: {},
        created_at: '2026-05-21T00:00:00.000Z',
        updated_at: '2026-05-21T00:00:00.000Z',
        deleted_at: null,
        sync_state: 'local_only',
        local_version: 1,
        remote_version: null,
        last_synced_at: null,
      },
    ];

    const warnings = await MissingProofDetectionService.getWarnings({ id: 'job-1', tradePackId: 'generator_install_v1' });
    assert.equal(warnings.some((warning) => warning.stepId === 'permit_or_inspection_document'), false);
  } finally {
    proofRepository.getByJob = originalProof;
    workflowLearningEventRepository.getByJobId = originalEvents;
  }
});
