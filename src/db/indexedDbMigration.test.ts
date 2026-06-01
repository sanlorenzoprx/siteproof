import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJobStatusValue, normalizeSyncStateValue } from './indexedDb';

test('normalizeSyncStateValue maps legacy states to canonical enums', () => {
  assert.equal(normalizeSyncStateValue('PENDING'), 'pending_upload');
  assert.equal(normalizeSyncStateValue('ERROR'), 'failed');
  assert.equal(normalizeSyncStateValue('SYNCED'), 'synced');
  assert.equal(normalizeSyncStateValue('conflict'), 'conflict');
});

test('normalizeJobStatusValue maps legacy uppercase statuses', () => {
  assert.equal(normalizeJobStatusValue('INCOMING'), 'draft');
  assert.equal(normalizeJobStatusValue('INSPECTION'), 'inspection_ready');
  assert.equal(normalizeJobStatusValue('COMPLETED'), 'complete');
  assert.equal(normalizeJobStatusValue('ARCHIVED'), 'archived');
});

