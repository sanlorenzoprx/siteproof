import { exportRepository } from '../../db/repositories/exportRepository';
import { ExportPacket, ShareStatus } from '../../db/schema';
import { Job } from '../../types';

export type ReportShareChannel = 'email' | 'sms';

export interface ReportShareTarget {
  recipient: string;
  href: string;
  status: ShareStatus;
}

function encodeSmsBody(body: string): string {
  return encodeURIComponent(body).replace(/%20/g, '+');
}

export class ReportShareService {
  static canShareLink(packet: Pick<ExportPacket, 'cloud_file_uri'>): boolean {
    return Boolean(packet.cloud_file_uri);
  }

  static buildMessage(packet: Pick<ExportPacket, 'title' | 'cloud_file_uri'>, job: Pick<Job, 'customerName'>): string {
    return [
      `${packet.title} for ${job.customerName}`,
      packet.cloud_file_uri,
      'Sent from SiteProof.',
    ].filter(Boolean).join('\n');
  }

  static buildEmailTarget(packet: ExportPacket, job: Pick<Job, 'customerName'>, recipient: string): ReportShareTarget | null {
    if (!packet.cloud_file_uri) return null;
    const subject = `${packet.title} - ${job.customerName}`;
    const body = this.buildMessage(packet, job);
    return {
      recipient,
      href: `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      status: 'sent_email',
    };
  }

  static buildSmsTarget(packet: ExportPacket, job: Pick<Job, 'customerName'>, recipient: string): ReportShareTarget | null {
    if (!packet.cloud_file_uri) return null;
    const body = this.buildMessage(packet, job);
    return {
      recipient,
      href: `sms:${encodeURIComponent(recipient)}?&body=${encodeSmsBody(body)}`,
      status: 'sent_sms',
    };
  }

  static async markShared(packet: ExportPacket, target: ReportShareTarget): Promise<ExportPacket | undefined> {
    return exportRepository.markShared(packet.export_id, target.status, target.recipient);
  }
}
