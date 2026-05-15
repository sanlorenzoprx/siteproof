import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultSettings } from './services/settingsService';
import { translate } from './config/i18n';
import { VoiceAIService } from './services/voiceAIService';
import { CloudSyncService } from './services/cloudSyncService';
import { SettingsService } from './services/settingsService';
import { buildExportFileName } from './features/export/exportFileNaming';
import { ReportMode } from './services/pdfService';
import fs from 'node:fs';

test('settings defaults keep UI/capture/export independently configurable', () => {
  const settings = createDefaultSettings('es');
  assert.equal(settings.uiLanguage, 'es');
  assert.equal(settings.captureLanguage, 'es');
  assert.equal(settings.exportLanguage, 'en');
});

test('i18n resolves English, Spanish, and safe fallback keys', () => {
  assert.equal(translate('en', 'reports.reportTitle'), 'SiteProof Jobsite Proof Report');
  assert.equal(translate('es', 'reports.reportTitle'), 'Reporte de Prueba de Obra SiteProof');
  assert.equal(translate('es', 'unknown.key'), 'unknown.key');
});

test('priority bilingual surface keys exist in Spanish', () => {
  for (const key of [
    'jobs.fieldJobs',
    'jobs.startJob',
    'capture.savePhoto',
    'inspection.ready',
    'onboarding.openCapture',
    'offline.stormMode',
  ]) {
    assert.notEqual(translate('es', key), key);
  }
});

test('high-priority translated components do not reintroduce known hardcoded English copy', () => {
  const source = [
    'src/components/JobList.tsx',
    'src/components/CreateJob.tsx',
    'src/components/CameraCapture.tsx',
    'src/components/inspection/InspectionReadyCard.tsx',
  ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  for (const forbidden of ['Field Jobs', 'READY FOR THE FIELD?', 'Save Photo', 'Inspection Ready Mode']) {
    assert.equal(source.includes(forbidden), false, `Found untranslated copy: ${forbidden}`);
  }
});

test('job detail and settings avoid known hardcoded English labels', () => {
  const source = [
    'src/components/JobDetail.tsx',
    'src/components/Settings.tsx',
  ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  for (const forbidden of ['Generate Packet', 'Job Summary', 'Fast Actions', 'Brand & User Identity', 'Speech Intelligence']) {
    assert.equal(source.includes(forbidden), false, `Found untranslated copy: ${forbidden}`);
  }
});

test('voice extraction supports English and Spanish', () => {
  const english = VoiceAIService.analyzeTranscript('Customer requested additional wire because the breaker is damaged.', 'en');
  assert.ok(english.materialMentions.includes('wire'));
  assert.ok(english.issueMentions.includes('damaged'));
  assert.ok(english.changeOrderCandidates.length > 0);

  const spanish = VoiceAIService.analyzeTranscript('Cliente pidió cable adicional porque el panel está dañado.', 'es');
  assert.ok(spanish.materialMentions.length > 0);
  assert.ok(spanish.issueMentions.some((value) => value.includes('dañado')));
  assert.ok(spanish.changeOrderCandidates.length > 0);
});

test('export file naming includes selected export language', () => {
  const name = buildExportFileName({
    id: 'job-1',
    customerName: 'Ada Lovelace',
    address: '123 Main',
    jobType: 'Generator',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ACTIVE',
    notes: '',
  }, ReportMode.STANDARD, 'es');
  assert.match(name, /^siteproof-ada_lovelace-es-\d{8}-\d{6}\.pdf$/);
});

test('cloud sync boundary no-ops when disabled and queues offline', async () => {
  const originalGet = SettingsService.getSettings;
  const originalSave = SettingsService.saveSettings;
  let savedStatus = '';
  SettingsService.getSettings = async () => createDefaultSettings('en');
  SettingsService.saveSettings = async (settings) => { savedStatus = settings.cloudSyncStatus; };

  const localOnly = await CloudSyncService.upload({ localId: '1', jobId: 'j', objectType: 'metadata' }, false);
  assert.equal(localOnly.state, 'local_only');

  SettingsService.getSettings = async () => ({ ...createDefaultSettings('en'), cloudEnabled: true });
  const queued = await CloudSyncService.upload({ localId: '2', jobId: 'j', objectType: 'metadata' }, false);
  assert.equal(queued.state, 'queued');
  assert.equal(savedStatus, 'pending');

  SettingsService.getSettings = originalGet;
  SettingsService.saveSettings = originalSave;
});
