import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultSettings } from './services/settingsService';
import { translate } from './config/i18n';
import { VoiceAIService } from './services/voiceAIService';
import { CloudSyncService } from './services/cloudSyncService';
import { SettingsService } from './services/settingsService';
import { buildExportFileName, packetTitle } from './features/export/exportFileNaming';
import { ReportMode } from './services/pdfService';
import fs from 'node:fs';
import { TemplateCatalogService } from './services/templateCatalogService';
import { AIService } from './services/aiService';

test('settings defaults keep UI/capture/export independently configurable', () => {
  const settings = createDefaultSettings('es');
  assert.equal(settings.uiLanguage, 'es');
  assert.equal(settings.captureLanguage, 'es');
  assert.equal(settings.exportLanguage, 'en');
});

test('i18n resolves English, Spanish, and safe fallback keys', () => {
  assert.equal(translate('en', 'reports.reportTitle'), 'SiteProof Jobsite Proof Pro Report');
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
  assert.match(name, /^siteproof-internalrecord-ada_lovelace-es-\d{8}-\d{6}\.pdf$/);
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

test('template-authored content localizes from the data layer', () => {
  const spanishTemplate = TemplateCatalogService.getTemplate('generator_install_v1', 'es');
  const intake = spanishTemplate.stages.find((stage) => stage.stage_id === 'intake');
  const scopeNote = intake?.proof_requirements.find((requirement) => requirement.requirement_id === 'job_scope_note');

  assert.equal(spanishTemplate.display_name, 'Instalación de generador');
  assert.equal(intake?.display_name, 'Inicio');
  assert.equal(scopeNote?.display_name, 'Nota del alcance del trabajo');
  assert.match(scopeNote?.field_instruction ?? '', /Agregue un resumen breve/);
  assert.equal(intake?.checklist_items?.[0]?.display_name, 'Código postal del sitio confirmado');
});

test('template localization falls back to English when selected language text is missing', () => {
  assert.equal(TemplateCatalogService.localizeText('English fallback', { en: 'English fallback' }, 'es'), 'English fallback');
  assert.equal(TemplateCatalogService.localizeText('Base fallback', undefined, 'es'), 'Base fallback');
});

test('template capture categories and requirement context honor UI language', () => {
  const categories = TemplateCatalogService.getCaptureCategories('generator_install_v1', 'job_scope_note', 'es');
  const context = TemplateCatalogService.getRequirementContext('generator_install_v1', 'job_scope_note', 'es');

  assert.equal(categories[0], 'Nota del alcance del trabajo');
  assert.equal(context?.stage.display_name, 'Inicio');
  assert.equal(context?.requirement.display_name, 'Nota del alcance del trabajo');
});

test('export titles and filenames honor export language independently', () => {
  const job = {
    id: 'job-2',
    customerName: 'Grace Hopper',
    address: '456 Main',
    jobType: 'Generator',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ACTIVE' as const,
    notes: '',
  };
  assert.equal(packetTitle(ReportMode.CUSTOMER, 'es'), 'Reporte del cliente');
  assert.match(buildExportFileName(job, ReportMode.CUSTOMER, 'es'), /^siteproof-customerreport-grace_hopper-es-\d{8}-\d{6}\.pdf$/);
});

test('field-critical capture surfaces avoid known hardcoded English UI labels', () => {
  const source = [
    'src/components/JobDetail.tsx',
    'src/components/CreateJob.tsx',
    'src/components/VoiceNoteCapture.tsx',
  ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  for (const forbidden of [
    'Record Note',
    'No GPS',
    'Media Ready',
    'Transcribed Result',
    'Assign Category',
    'Attach Note',
  ]) {
    assert.equal(source.includes(`>${forbidden}<`) || source.includes(`\"${forbidden}\"`), false, `Found untranslated copy: ${forbidden}`);
  }
});

test('offline local report summary respects export language independently of UI language', () => {
  const job = {
    id: 'job-3',
    customerName: 'Ada',
    address: '123 Main',
    jobType: 'Generator',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'COMPLETED' as const,
    notes: '',
  };
  const english = AIService.generateLocalSummary(job, [], [], 'en');
  const spanish = AIService.generateLocalSummary(job, [], [], 'es');
  assert.match(english, /^This Generator for Ada was completed\./);
  assert.match(spanish, /^Este trabajo de Generator para Ada fue completado\./);
});

test('main PDF export path avoids selected hardcoded English labels', () => {
  const source = fs.readFileSync('src/services/pdfService.ts', 'utf8');
  for (const forbidden of [
    'AI SITE INTELLIGENCE',
    'GPS Verified',
    'Photo unavailable',
    'JOB TIMELINE',
    'PROOF INTEGRITY MANIFEST',
    'ACCEPTANCE & SIGNATURE',
    'Customer / Inspector Signature',
    'Scan to verify digital original',
  ]) {
    assert.equal(source.includes(`'${forbidden}'`) || source.includes(`\"${forbidden}\"`), false, `Found untranslated PDF copy: ${forbidden}`);
  }
});
