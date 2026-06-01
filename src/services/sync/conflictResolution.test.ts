import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLastWriteWins } from './conflictResolution';

test('resolveLastWriteWins picks local when local timestamp is newer', () => {
  const local = { id: '1', updated_at: '2026-05-31T12:00:00.000Z', local_version: 3 };
  const remote = { id: '1', updated_at: '2026-05-31T11:00:00.000Z', local_version: 9 };
  const result = resolveLastWriteWins(local, remote);
  assert.equal(result.winner, 'local');
  assert.equal(result.reason, 'local_newer');
  assert.equal(result.merged, local);
});

test('resolveLastWriteWins picks remote when remote timestamp is newer', () => {
  const local = { id: '1', updated_at: '2026-05-31T10:00:00.000Z', local_version: 5 };
  const remote = { id: '1', updated_at: '2026-05-31T12:00:00.000Z', local_version: 1 };
  const result = resolveLastWriteWins(local, remote);
  assert.equal(result.winner, 'remote');
  assert.equal(result.reason, 'remote_newer');
  assert.equal(result.merged, remote);
});

test('resolveLastWriteWins handles equal timestamps deterministically', () => {
  const local = { id: '1', updated_at: '2026-05-31T12:00:00.000Z', local_version: 2 };
  const remote = { id: '1', updated_at: '2026-05-31T12:00:00.000Z', local_version: 2 };
  const result = resolveLastWriteWins(local, remote);
  assert.equal(result.winner, 'equal');
  assert.equal(result.reason, 'equal_timestamp');
  assert.equal(result.merged, remote);
});

