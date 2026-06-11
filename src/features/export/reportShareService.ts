import { exportRepository } from '../../db/repositories/exportRepository';
import { ExportPacket, ShareStatus } from '../../db/schema';
import { Job } from '../../domain/models';

export type ReportShareChannel = 'email' | 'sms';

export interface ReportShareTarget {
  recipient: string;
  href: string;
  status: ShareStatus;
}

type ShareableJob = Pick<Job, 'customerName' | 'customerEmail' | 'customerPhone'>;

function encodeSmsBody(body: string): string {
  return encodeURIComponent(body).replace(/%20/g, '+');
}

function normalizeSmsRecipient(recipient: string): string {
  return recipient.replace(/[^\d+.-]/g, '');
}

export class ReportShareService {
  static canShareLink(packet: Pick<ExportPacket, 'cloud_file_uri'>): boolean {
    return Boolean(packet.cloud_file_uri);
  }

  static defaultRecipientForChannel(job: ShareableJob, channel: ReportShareChannel): string {
    return channel === 'email'
      ? job.customerEmail?.trim() ?? ''
      : normalizeSmsRecipient(job.customerPhone ?? '');
  }

  static buildMessage(packet: Pick<ExportPacket, 'title' | 'cloud_file_uri'>, job: Pick<Job, 'customerName'>): string {
    return [
      `${packet.title} for ${job.customerName}`,
      packet.cloud_file_uri,
      'Sent from SiteProof.',
    ].filter(Boolean).join('\n');
  }

  static buildEmailTarget(packet: ExportPacket, job: ShareableJob, recipient = ''): ReportShareTarget | null {
    if (!packet.cloud_file_uri) return null;
    const resolvedRecipient = recipient.trim() || this.defaultRecipientForChannel(job, 'email');
    if (!resolvedRecipient) return null;
    const subject = `${packet.title} - ${job.customerName}`;
    const body = this.buildMessage(packet, job);
    return {
      recipient: resolvedRecipient,
      href: `mailto:${encodeURIComponent(resolvedRecipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      status: 'sent_email',
    };
  }

  static buildSmsTarget(packet: ExportPacket, job: ShareableJob, recipient = ''): ReportShareTarget | null {
    if (!packet.cloud_file_uri) return null;
    const resolvedRecipient = normalizeSmsRecipient(recipient) || this.defaultRecipientForChannel(job, 'sms');
    if (!resolvedRecipient) return null;
    const body = this.buildMessage(packet, job);
    return {
      recipient: resolvedRecipient,
      href: `sms:${encodeURIComponent(resolvedRecipient)}?&body=${encodeSmsBody(body)}`,
      status: 'sent_sms',
    };
  }

  static async markShared(packet: ExportPacket, target: ReportShareTarget): Promise<ExportPacket | undefined> {
    return exportRepository.markShared(packet.export_id, target.status, target.recipient);
  }
}
