import assert from 'node:assert/strict';
import test from 'node:test';
import { CloudflareClient } from '../../services/cloudflareClient';
import { getReportDefinition } from './reportDefinitions';
import { reportTypeToPacketType } from './exportPacketService';
import { SiteProofReportType } from './reportTypes';

test('bid report definitions separate internal and customer audiences', () => {
  const internal = getReportDefinition(SiteProofReportType.INTERNAL_BID_REPORT);
  const customer = getReportDefinition(SiteProofReportType.CUSTOMER_BID_REPORT);

  assert.equal(internal.audience, 'office');
  assert.equal(customer.audience, 'customer');
  assert.equal(internal.sections.includes('bid_summary'), true);
  assert.equal(customer.sections.includes('bid_summary'), true);
  assert.equal(reportTypeToPacketType(SiteProofReportType.INTERNAL_BID_REPORT), 'internal_bid_report');
  assert.equal(reportTypeToPacketType(SiteProofReportType.CUSTOMER_BID_REPORT), 'customer_bid_report');
});

test('bid report cloud metadata defaults to correct privacy visibility', () => {
  assert.equal(CloudflareClient.defaultVisibility({
    localId: 'bid-1',
    jobId: 'job-1',
    objectType: 'bid_report',
    reportType: 'internal_bid_report',
  }), 'internal_only');
  assert.equal(CloudflareClient.defaultVisibility({
    localId: 'bid-2',
    jobId: 'job-1',
    objectType: 'bid_report',
    reportType: 'customer_bid_report',
  }), 'customer_visible');
});
