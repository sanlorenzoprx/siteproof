import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateTaskGraph } from './taskGraphReview';

test('export + timeline + missing-proof requests create foundation, parallel work, integration, and tests', () => {
  const result = evaluateTaskGraph({
    request: 'Improve export reports, add missing-proof detection, and polish timeline playback.',
  });

  assert.ok(result.affectedModules.includes('export_engine'));
  assert.ok(result.affectedModules.includes('timeline'));
  assert.ok(result.affectedModules.includes('missing_proof_detection'));
  assert.ok(result.affectedModules.includes('proof_objects'));
  assert.equal(result.tasks[0]?.executionMode, 'must_run_first');
  assert.equal(result.parallelGroups[0]?.tasks.length, 3);
  assert.ok(result.tasks.some((task) => task.executionMode === 'integration_step'));
  assert.ok(result.requiredTests.some((requiredTest) => requiredTest.command === 'npm run build:check'));
  assert.ok(result.requiredTests.some((requiredTest) => requiredTest.command === 'npm run quality:check'));
});

test('sync requests require offline storage before sync and flag sync risk', () => {
  const result = evaluateTaskGraph({ request: 'Add cloud sync and backup recovery.' });
  const offlineTask = result.tasks.find((task) => task.affectedModules.includes('offline_storage'));
  const syncTask = result.tasks.find((task) => task.affectedModules.includes('sync_queue'));

  assert.ok(result.affectedModules.includes('sync_queue'));
  assert.ok(result.affectedModules.includes('offline_storage'));
  assert.ok(offlineTask);
  assert.ok(syncTask);
  assert.ok(syncTask.dependsOn.includes(offlineTask.id));
  assert.ok(result.riskFlags.some((risk) => risk.category === 'sync_conflict'));
});

test('AI summary requests flag AI overreach and keep AI invisible', () => {
  const result = evaluateTaskGraph({ request: 'Add AI summaries for voice notes and reports.' });
  assert.ok(result.affectedModules.includes('voice_notes'));
  assert.ok(result.affectedModules.includes('ai_summaries'));
  assert.ok(result.affectedModules.includes('export_engine'));
  assert.ok(result.riskFlags.some((risk) => risk.category === 'ai_overreach'));
  assert.ok(result.implementationNotes.some((note) => note.includes('AI must stay invisible')));
});

test('trade-specific requests prefer template data', () => {
  const result = evaluateTaskGraph({ request: 'Add generator install checklist with required photos.' });
  assert.ok(result.affectedModules.includes('workflow_templates'));
  assert.ok(result.affectedModules.includes('proof_objects'));
  assert.ok(result.implementationNotes.some((note) => note.includes('workflow template data')));
});

test('scope creep requests are flagged for deferral', () => {
  const result = evaluateTaskGraph({ request: 'Add CRM dashboard, billing, and team chat.' });
  assert.ok(result.riskFlags.some((risk) => risk.category === 'scope_creep'));
  assert.ok(result.implementationNotes.some((note) => note.includes('Defer office-heavy features')));
});
