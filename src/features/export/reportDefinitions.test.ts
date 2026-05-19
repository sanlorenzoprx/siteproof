import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_REPORT_TYPES, SiteProofReportType } from './reportTypes';
import { getReportDefinition, REPORT_DEFINITIONS } from './reportDefinitions';
import { packetTitle, buildExportFileName } from './exportFileNaming';
import { reportTypeToPacketType } from './exportPacketService';
import { translate } from '../../config/i18n';

test('every app report type has a deterministic report definition', () => {
  for (const reportType of APP_REPORT_TYPES) {
    const definition = getReportDefinition(reportType);
    assert.equal(definition.type, reportType);
    assert.ok(definition.titleKey);
    assert.ok(definition.fallbackTitle);
    assert.ok(definition.sections.length > 0);
    assert.ok(definition.proofFilterTags.length > 0);
    assert.ok(definition.fallbackProofTags.length > 0);
  }
});

test('all reports is a dropdown option, not a concrete report definition', () => {
  assert.equal(APP_REPORT_TYPES.includes(SiteProofReportType.ALL_REPORTS as never), false);
  assert.equal(getReportDefinition(SiteProofReportType.ALL_REPORTS).type, SiteProofReportType.DAILY_JOB_PROOF);
});

test('payment and customer report definitions are intentionally distinct', () => {
  const customer = REPORT_DEFINITIONS[SiteProofReportType.CUSTOMER_COMPLETION];
  const payment = REPORT_DEFINITIONS[SiteProofReportType.PAYMENT_FINAL_HANDOFF];

  assert.notEqual(payment.audience, customer.audience);
  assert.notDeepEqual(payment.sections, customer.sections);
  assert.equal(payment.sections.includes('payment_readiness'), true);
  assert.equal(customer.sections.includes('payment_readiness'), false);
});

test('photo proof timeline is chronological-first', () => {
  const definition = REPORT_DEFINITIONS[SiteProofReportType.PHOTO_PROOF_TIMELINE];
  assert.equal(definition.sections[0], 'cover');
  assert.equal(definition.sections[1], 'timeline');
  assert.equal(definition.proofFilter, 'timeline_all');
});

test('inspection and payment reports include mandatory guardrail sections', () => {
  const inspection = REPORT_DEFINITIONS[SiteProofReportType.INSPECTION_READINESS];
  const payment = REPORT_DEFINITIONS[SiteProofReportType.PAYMENT_FINAL_HANDOFF];

  assert.equal(inspection.sections.includes('inspection_disclaimer'), true);
  assert.equal(payment.sections.includes('payment_note'), true);
  assert.match(translate('en', 'reports.app.disclaimers.inspection'), /does not certify code compliance/i);
  assert.match(translate('es', 'reports.app.disclaimers.inspection'), /No certifica cumplimiento de código/i);
  assert.match(translate('en', 'reports.app.disclaimers.payment'), /does not confirm payment approval/i);
  assert.match(translate('es', 'reports.app.disclaimers.payment'), /No confirma aprobación de pago/i);
});

test('app packet titles and all reports names are localized and safe for filenames', () => {
  assert.equal(packetTitle(SiteProofReportType.CUSTOMER_COMPLETION, 'es'), 'Informe de Finalización para Cliente');
  assert.equal(packetTitle(SiteProofReportType.ALL_REPORTS, 'es'), 'Todos los Informes');
  assert.equal(reportTypeToPacketType(SiteProofReportType.ALL_REPORTS), 'all_reports');

  const filename = buildExportFileName({
    id: 'job-1',
    customerName: 'Cliente Álvarez',
    address: '123 Main',
    jobType: 'Generator Install',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ACTIVE',
    notes: '',
  }, SiteProofReportType.ALL_REPORTS, 'es');

  assert.match(filename, /^siteproof-todoslosinformes-cliente_lvarez-es-\d{8}-\d{6}\.pdf$/);
});
