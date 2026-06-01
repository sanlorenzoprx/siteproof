import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSyncOperation } from './payloadWhitelist';
import { SyncOperation } from '../../db/schema';

test('sanitizeSyncOperation removes non-whitelisted PII fields', () => {
  const op = {
    operation_id: 'op-1',
    entity_type: 'job',
    entity_id: 'job-1',
    operation_type: 'update',
    payload: {
      job_id: 'job-1',
      job_title: 'Kitchen Remodel',
      customer_email: 'secret@example.com',
      customer_phone: '555-1234',
      template_id: 'tmp-1',
      updated_at: '2026-05-31T00:00:00.000Z',
      local_version: 2,
    },
    dependency_ids: [],
    status: 'queued',
    retry_count: 0,
    max_retries: 5,
    last_error: null,
    created_at: '2026-05-31T00:00:00.000Z',
    updated_at: '2026-05-31T00:00:00.000Z',
    next_retry_at: null,
    completed_at: null,
  } as SyncOperation;

  const sanitized = sanitizeSyncOperation(op);
  assert.equal((sanitized.payload as Record<string, unknown>).job_id, 'job-1');
  assert.equal((sanitized.payload as Record<string, unknown>).job_title, 'Kitchen Remodel');
  assert.equal((sanitized.payload as Record<string, unknown>).customer_email, undefined);
  assert.equal((sanitized.payload as Record<string, unknown>).customer_phone, undefined);
});

