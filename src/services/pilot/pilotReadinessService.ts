import { jobRepository } from '../../db/repositories/jobRepository';
import { proofRepository } from '../../db/repositories/proofRepository';
import { mediaRepository } from '../../db/repositories/mediaRepository';
import { syncRepository } from '../../db/repositories/syncRepository';
import { templateRepository } from '../../db/repositories/templateRepository';
import { TemplateCatalogService } from '../templateCatalogService';
import { OfflineStatusService } from '../offlineService';
import { CloudService } from '../cloudService';

export type PilotCheckStatus = 'pass' | 'warn' | 'fail';

export interface PilotReadinessCheck {
  id: string;
  label: string;
  status: PilotCheckStatus;
  detail: string;
  action?: string;
}

export interface PilotReadinessReport {
  generatedAt: string;
  score: number;
  status: 'pilot_ready' | 'needs_attention' | 'blocked';
  checks: PilotReadinessCheck[];
}

const requiredTemplateIds = ['generator_install_v1'];

function scoreFor(status: PilotCheckStatus): number {
  if (status === 'pass') return 1;
  if (status === 'warn') return 0.5;
  return 0;
}

function statusFromScore(score: number, checks: PilotReadinessCheck[]): PilotReadinessReport['status'] {
  if (checks.some((check) => check.status === 'fail')) return 'blocked';
  if (score >= 85) return 'pilot_ready';
  return 'needs_attention';
}

async function canOpenIndexedDb(): Promise<boolean> {
  try {
    await Promise.all([
      jobRepository.getAll(),
      syncRepository.getStats(),
    ]);
    return true;
  } catch {
    return false;
  }
}

export class PilotReadinessService {
  static async generateReport(): Promise<PilotReadinessReport> {
    const [dbReady, jobs, proofs, mediaAssets, syncStats, cachedTemplates] = await Promise.all([
      canOpenIndexedDb(),
      jobRepository.getAll().catch(() => []),
      proofRepository.getAll().catch(() => []),
      mediaRepository.getAll().catch(() => []),
      syncRepository.getStats().catch(() => null),
      templateRepository.getAll().catch(() => []),
    ]);

    const offline = OfflineStatusService.getStatus();
    const missingTemplates = requiredTemplateIds.filter((id) => {
      const bundled = TemplateCatalogService.getTemplate(id);
      const cached = cachedTemplates.some((template) => template.template_id === id && template.active_flag);
      return !bundled && !cached;
    });

    const checks: PilotReadinessCheck[] = [
      {
        id: 'indexeddb',
        label: 'Offline database opens',
        status: dbReady ? 'pass' : 'fail',
        detail: dbReady ? 'Repository database is reachable.' : 'IndexedDB could not be opened.',
        action: dbReady ? undefined : 'Refresh the app, check browser storage permissions, or use a supported browser.',
      },
      {
        id: 'templates',
        label: 'Workflow templates available',
        status: missingTemplates.length === 0 ? 'pass' : 'fail',
        detail: missingTemplates.length === 0 ? 'Generator install template is bundled/cached.' : `Missing templates: ${missingTemplates.join(', ')}`,
        action: missingTemplates.length === 0 ? undefined : 'Rebuild the app with required templates or seed template cache on startup.',
      },
      {
        id: 'service-worker',
        label: 'Offline app shell',
        status: offline.serviceWorkerReady ? 'pass' : 'warn',
        detail: offline.serviceWorkerReady ? 'Service worker is ready for offline app shell.' : 'Service worker is not ready yet. This can be normal on first load.',
        action: offline.serviceWorkerReady ? undefined : 'Open the app once while online, wait for install, then reload before field use.',
      },
      {
        id: 'network-state',
        label: 'Network state detection',
        status: typeof navigator !== 'undefined' ? 'pass' : 'warn',
        detail: `Current state: ${offline.online ? 'online' : 'offline'}.`,
      },
      {
        id: 'cloud-config',
        label: 'Cloud sync configuration',
        status: CloudService.isConfigured() ? 'pass' : 'warn',
        detail: CloudService.isConfigured() ? 'Cloud endpoint is configured.' : 'Cloud sync is not configured. Offline-only pilot is still possible.',
        action: CloudService.isConfigured() ? undefined : 'For multi-device pilots, set Cloud URL and Cloud key in Settings.',
      },
      {
        id: 'sync-queue',
        label: 'Sync queue health',
        status: !syncStats ? 'warn' : syncStats.failed > 0 ? 'warn' : 'pass',
        detail: syncStats ? `${syncStats.pending} pending, ${syncStats.failed} failed, ${syncStats.completed} completed operations.` : 'Sync queue stats unavailable.',
        action: syncStats && syncStats.failed > 0 ? 'Review failed operations before field pilot.' : undefined,
      },
      {
        id: 'data-model',
        label: 'Repository data model',
        status: 'pass',
        detail: `${jobs.length} jobs, ${proofs.length} proof objects, ${mediaAssets.length} media assets in repository stores.`,
      },
      {
        id: 'media-pipeline',
        label: 'Media pipeline evidence',
        status: mediaAssets.length > 0 ? 'pass' : 'warn',
        detail: mediaAssets.length > 0 ? 'Media assets exist in the repository layer.' : 'No media assets yet. Capture a test photo before pilot.',
        action: mediaAssets.length > 0 ? undefined : 'Create a test job and capture one required photo.',
      },
      {
        id: 'export-readiness',
        label: 'Export readiness',
        status: jobs.length > 0 ? 'pass' : 'warn',
        detail: jobs.length > 0 ? 'At least one job exists for export smoke testing.' : 'No jobs exist yet.',
        action: jobs.length > 0 ? undefined : 'Create a sample generator install job and generate a customer packet.',
      },
    ];

    const score = Math.round((checks.reduce((sum, check) => sum + scoreFor(check.status), 0) / checks.length) * 100);

    return {
      generatedAt: new Date().toISOString(),
      score,
      status: statusFromScore(score, checks),
      checks,
    };
  }
}
