import test from 'node:test';
import assert from 'node:assert/strict';
import { SyncRuntime } from './syncRuntime';
import { CloudService } from '../cloudService';
import { SiteProofDataService } from '../siteProofDataService';
import { syncRepository } from '../../db/repositories/syncRepository';
import type { SyncOperation } from '../../db/schema';

function makeOp(id: string): SyncOperation {
  return {
    operation_id: id,
    entity_type: 'job',
    entity_id: id,
    operation_type: 'delete',
    payload: {},
    dependency_ids: [],
    status: 'queued',
    retry_count: 0,
    max_retries: 3,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    next_retry_at: null,
  };
}

test('processQueue keeps successful operations when one operation fails in the same batch', async () => {
  const ops = [makeOp('op-1'), makeOp('op-2'), makeOp('op-3')];
  const markRunningCalls: string[] = [];
  const markCompletedCalls: string[] = [];
  const markFailedCalls: string[] = [];

  const originalIsConfigured = (CloudService as any).isConfigured;
  const originalSyncRuntimeOperations = (CloudService as any).syncRuntimeOperations;
  const originalUpdateSyncState = (SiteProofDataService as any).updateSyncState;
  const originalGetReadyToRun = (syncRepository as any).getReadyToRun;
  const originalMarkRunning = (syncRepository as any).markRunning;
  const originalMarkCompleted = (syncRepository as any).markCompleted;
  const originalMarkFailed = (syncRepository as any).markFailed;
  const originalGetStats = (syncRepository as any).getStats;
  const originalGetQueued = (syncRepository as any).getQueued;
  const originalGetRunning = (syncRepository as any).getRunning;
  const originalGetBlocked = (syncRepository as any).getBlocked;
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  (CloudService as any).isConfigured = () => true;
  (CloudService as any).syncRuntimeOperations = async ([op]: SyncOperation[]) => {
    if (op.operation_id === 'op-2') throw new Error('forced failure');
    return { ok: true };
  };

  (SiteProofDataService as any).updateSyncState = async () => undefined;

  (syncRepository as any).getReadyToRun = async () => ops;
  (syncRepository as any).markRunning = async (id: string) => {
    markRunningCalls.push(id);
    return undefined;
  };
  (syncRepository as any).markCompleted = async (id: string) => {
    markCompletedCalls.push(id);
    return undefined;
  };
  (syncRepository as any).markFailed = async (id: string) => {
    markFailedCalls.push(id);
    return undefined;
  };
  (syncRepository as any).getStats = async () => ({
    queued: 1,
    running: 0,
    blocked: 0,
    failed: 1,
    completed: 2,
    pending: 1,
  });
  (syncRepository as any).getQueued = async () => [];
  (syncRepository as any).getRunning = async () => [];
  (syncRepository as any).getBlocked = async () => [];
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });

  try {
    const snapshot = await SyncRuntime.processQueue();

    assert.deepEqual(markRunningCalls, ['op-1', 'op-2', 'op-3']);
    assert.deepEqual(markCompletedCalls, ['op-1', 'op-3']);
    assert.deepEqual(markFailedCalls, ['op-2']);
    assert.equal(snapshot.pending, 1);
    assert.equal(snapshot.failed, 1);
    assert.equal(snapshot.completed, 2);
  } finally {
    (CloudService as any).isConfigured = originalIsConfigured;
    (CloudService as any).syncRuntimeOperations = originalSyncRuntimeOperations;
    (SiteProofDataService as any).updateSyncState = originalUpdateSyncState;
    (syncRepository as any).getReadyToRun = originalGetReadyToRun;
    (syncRepository as any).markRunning = originalMarkRunning;
    (syncRepository as any).markCompleted = originalMarkCompleted;
    (syncRepository as any).markFailed = originalMarkFailed;
    (syncRepository as any).getStats = originalGetStats;
    (syncRepository as any).getQueued = originalGetQueued;
    (syncRepository as any).getRunning = originalGetRunning;
    (syncRepository as any).getBlocked = originalGetBlocked;
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
    }
  }
});
