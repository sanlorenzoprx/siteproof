import test from 'node:test';
import assert from 'node:assert/strict';
import { ExportPacket } from '../../db/schema';
import { ReportShareService } from './reportShareService';

const packet: ExportPacket = {
  export_id: 'export-1',
  job_id: 'job-1',
  packet_type: 'customer_completion_report',
  title: 'Customer Completion Report',
  generated_at: '2026-05-21T00:00:00.000Z',
  local_file_uri: 'siteproof://exports/job-1/report.pdf',
  cloud_file_uri: 'https://siteproof.report/share/report-1',
  included_proof_ids: ['proof-1'],
  included_sections: ['summary'],
  template_id: 'generator_install_v1',
  template_version: '1.0.0',
  share_status: 'shared_link_created',
  sent_to: [],
  created_at: '2026-05-21T00:00:00.000Z',
  updated_at: '2026-05-21T00:00:00.000Z',
  deleted_at: null,
  sync_state: 'local_only',
  local_version: 1,
  remote_version: null,
  last_synced_at: null,
};

test('report share service builds email and SMS links only from cloud share URLs', () => {
  assert.equal(ReportShareService.canShareLink(packet), true);

  const email = ReportShareService.buildEmailTarget(packet, { customerName: 'Rivera Home' }, 'owner@example.com');
  assert.ok(email);
  assert.equal(email.status, 'sent_email');
  assert.match(email.href, /^mailto:owner%40example\.com/);
  assert.match(email.href, /Customer%20Completion%20Report/);
  assert.match(email.href, /https%3A%2F%2Fsiteproof\.report%2Fshare%2Freport-1/);

  const sms = ReportShareService.buildSmsTarget(packet, { customerName: 'Rivera Home' }, '+17875551212');
  assert.ok(sms);
  assert.equal(sms.status, 'sent_sms');
  assert.match(sms.href, /^sms:%2B17875551212/);
  assert.match(sms.href, /siteproof\.report%2Fshare%2Freport-1/);
});

test('report share service can use customer contact defaults', () => {
  const job = {
    customerName: 'Rivera Home',
    customerEmail: 'owner@example.com',
    customerPhone: '(787) 555-1212',
  };

  assert.equal(ReportShareService.defaultRecipientForChannel(job, 'email'), 'owner@example.com');
  assert.equal(ReportShareService.defaultRecipientForChannel(job, 'sms'), '787555-1212');

  const email = ReportShareService.buildEmailTarget(packet, job);
  assert.ok(email);
  assert.equal(email.recipient, 'owner@example.com');
  assert.match(email.href, /^mailto:owner%40example\.com/);

  const sms = ReportShareService.buildSmsTarget(packet, job);
  assert.ok(sms);
  assert.equal(sms.recipient, '787555-1212');
  assert.match(sms.href, /^sms:787555-1212/);
});

test('report share service does not create fake links for local-only reports', () => {
  const localOnly = { ...packet, cloud_file_uri: null };
  assert.equal(ReportShareService.canShareLink(localOnly), false);
  assert.equal(ReportShareService.buildEmailTarget(localOnly, { customerName: 'Rivera Home' }, 'owner@example.com'), null);
  assert.equal(ReportShareService.buildSmsTarget(localOnly, { customerName: 'Rivera Home' }, '+17875551212'), null);
});
