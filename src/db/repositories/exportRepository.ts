import { BaseRepository } from './baseRepository';
import { ExportPacket, ExportPacketType, ShareStatus, baseSyncFields, baseTimestampFields, newId, nowIso } from '../schema';

export type CreateExportInput = Omit<ExportPacket, 'export_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at' | 'generated_at' | 'share_status' | 'sent_to'> & {
  generated_at?: string;
  share_status?: ExportPacket['share_status'];
  sent_to?: string[];
  packet_type: ExportPacketType;
};

class ExportRepository extends BaseRepository<ExportPacket> {
  constructor() {
    super('export_packets', 'export_id', 'export_packet');
  }

  async createExport(input: CreateExportInput): Promise<ExportPacket> {
    return this.create({
      ...input,
      export_id: newId(),
      generated_at: input.generated_at ?? nowIso(),
      share_status: input.share_status ?? 'not_shared',
      sent_to: input.sent_to ?? [],
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  getByJob(jobId: string): Promise<ExportPacket[]> {
    return this.getByIndex('job_id', jobId);
  }

  async markShared(exportId: string, shareStatus: ShareStatus, recipient?: string): Promise<ExportPacket | undefined> {
    const packet = await this.getById(exportId);
    if (!packet) return undefined;
    return this.put({
      ...packet,
      share_status: shareStatus,
      sent_to: recipient ? [...new Set([...packet.sent_to, recipient])] : packet.sent_to,
      delivery_status: shareStatus === 'sent_email' || shareStatus === 'sent_sms' ? 'queued' : packet.delivery_status,
    });
  }
}

export const exportRepository = new ExportRepository();
