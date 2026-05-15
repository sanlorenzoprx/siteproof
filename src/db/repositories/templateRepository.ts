import { BaseRepository } from './baseRepository';
import { WorkflowTemplateCache, newId, nowIso } from '../schema';

export type CacheTemplateInput = Omit<WorkflowTemplateCache, 'template_cache_id' | 'downloaded_at' | 'created_at' | 'updated_at' | 'active_flag'> & {
  active_flag?: boolean;
};

class TemplateRepository extends BaseRepository<WorkflowTemplateCache> {
  constructor() {
    super('workflow_template_cache', 'template_cache_id');
  }

  async cacheTemplate(input: CacheTemplateInput): Promise<WorkflowTemplateCache> {
    const now = nowIso();
    return this.create({
      ...input,
      template_cache_id: newId(),
      downloaded_at: now,
      active_flag: input.active_flag ?? true,
      created_at: now,
      updated_at: now,
    });
  }

  async getByTemplateId(templateId: string): Promise<WorkflowTemplateCache | undefined> {
    return this.getFirstFromIndex('template_id', templateId);
  }

  async getActive(): Promise<WorkflowTemplateCache[]> {
    return this.getByIndex('active_flag', 1 as unknown as IDBValidKey).catch(() => this.getByIndex('active_flag', true as unknown as IDBValidKey));
  }
}

export const templateRepository = new TemplateRepository();
