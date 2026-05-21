import { AppSettingsService } from './appSettingsService';

export interface SignatureRecord {
  id: string;
  jobId: string;
  signerName?: string;
  signerRole: 'customer' | 'contractor' | 'crew' | 'manager' | 'other';
  signatureDataUrl: string;
  signedAt: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  consentText: string;
  reportTypes?: string[];
  syncState?: 'local_only' | 'pending' | 'synced' | 'failed';
}

const SIGNATURES_KEY = 'signature_records_v1';

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? `sig-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class SignatureService {
  static consentText(language: 'en' | 'es' = 'en'): string {
    return language === 'es'
      ? 'Confirmo que esta firma fue capturada para documentación del trabajo y entrega de informe.'
      : 'I confirm this signature was captured for job documentation and report handoff purposes.';
  }

  static async getAll(): Promise<SignatureRecord[]> {
    return AppSettingsService.getValue<SignatureRecord[]>(SIGNATURES_KEY, []);
  }

  static async getByJob(jobId: string): Promise<SignatureRecord[]> {
    const records = await this.getAll();
    return records.filter((record) => record.jobId === jobId).sort((a, b) => b.signedAt.localeCompare(a.signedAt));
  }

  static async save(record: Omit<SignatureRecord, 'id' | 'signedAt' | 'syncState'> & Partial<Pick<SignatureRecord, 'id' | 'signedAt' | 'syncState'>>): Promise<SignatureRecord> {
    const records = await this.getAll();
    const next: SignatureRecord = {
      ...record,
      id: record.id ?? uuid(),
      signedAt: record.signedAt ?? new Date().toISOString(),
      syncState: record.syncState ?? 'local_only',
    };
    await AppSettingsService.setValue(SIGNATURES_KEY, [next, ...records.filter((item) => item.id !== next.id)]);
    return next;
  }
}
