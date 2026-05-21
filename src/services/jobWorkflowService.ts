import { Job, JobStatus } from '../types';
import { SiteProofDataService } from './siteProofDataService';
import { TemplateCatalogService } from './templateCatalogService';
import { TradeTemplatePackService } from './tradeTemplatePackService';
import { SettingsService } from './settingsService';

export interface CreateFieldJobInput {
  customerName: string;
  address: string;
  jobType?: string;
  templateId?: string;
  trade?: string;
  specialty?: string;
  tradePackId?: string;
  technicianName?: string;
  technicianRole?: string;
  quotedAmount?: number;
  scheduledDate?: number;
  notes?: string;
  status?: JobStatus;
}

function parseQuickJobText(input: string): Pick<CreateFieldJobInput, 'customerName' | 'address' | 'jobType' | 'templateId' | 'notes'> {
  const template = TemplateCatalogService.inferTemplateFromText(input);
  const forMatch = input.match(/\bfor\s+(.+?)(?:\s+at\s+|$)/i);
  const atMatch = input.match(/\bat\s+(.+)$/i);

  return {
    customerName: forMatch?.[1]?.trim() || 'New Customer',
    address: atMatch?.[1]?.trim() || 'GPS Auto',
    jobType: template.jobType,
    templateId: template.templateId,
    notes: input.trim(),
  };
}

export class JobWorkflowService {
  static async createJob(input: CreateFieldJobInput): Promise<Job> {
    const templateId = TemplateCatalogService.normalizeTemplateId(input.templateId);
    const template = TemplateCatalogService.getTemplate(templateId);
    const tradePack = input.tradePackId
      ? TradeTemplatePackService.getPack(input.tradePackId)
      : TradeTemplatePackService.findPack(input.trade, input.specialty);
    const settings = await SettingsService.getSettings();
    const job: Job = {
      id: crypto.randomUUID(),
      customerName: input.customerName.trim(),
      address: input.address.trim(),
      jobType: input.jobType || template.display_name,
      templateId,
      trade: input.trade ?? tradePack.trade,
      specialty: input.specialty ?? tradePack.specialty,
      tradePackId: tradePack.packId,
      technicianName: input.technicianName,
      technicianRole: input.technicianRole,
      quotedAmount: input.quotedAmount,
      scheduledDate: input.scheduledDate,
      notes: input.notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: input.status || 'ACTIVE',
      syncStatus: 'PENDING',
      uiLanguageAtCreation: settings.uiLanguage,
      defaultCaptureLanguage: settings.captureLanguage,
      defaultExportLanguage: settings.exportLanguage,
    };

    await SiteProofDataService.saveJob(job);
    await SiteProofDataService.setLastActiveJobId(job.id);
    return job;
  }

  static async createFromQuickStart(input: string): Promise<Job> {
    const parsed = parseQuickJobText(input);
    return this.createJob({ ...parsed, status: 'ACTIVE' });
  }

  static async completeJob(job: Job): Promise<Job> {
    const updated: Job = { ...job, status: 'COMPLETED', updatedAt: Date.now(), syncStatus: 'PENDING' };
    await SiteProofDataService.saveJob(updated);
    return updated;
  }
}
