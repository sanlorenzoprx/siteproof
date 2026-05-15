import { BaseRepository } from './baseRepository';
import { Job, JobStatus, baseSyncFields, baseTimestampFields, newId } from '../schema';

export type CreateJobInput = Omit<Job, 'job_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at' | 'status'> & {
  status?: JobStatus;
};

class JobRepository extends BaseRepository<Job> {
  constructor() {
    super('jobs', 'job_id', 'job');
  }

  async createJob(input: CreateJobInput): Promise<Job> {
    const job: Job = {
      ...input,
      job_id: newId(),
      status: input.status ?? 'active',
      permit_status: input.permit_status ?? 'unknown',
      inspection_status: input.inspection_status ?? 'unknown',
      ...baseTimestampFields(),
      ...baseSyncFields(),
    };
    return this.create(job);
  }

  getByCompany(companyId: string): Promise<Job[]> {
    return this.getByIndex('company_id', companyId);
  }

  getByStatus(status: JobStatus): Promise<Job[]> {
    return this.getByIndex('status', status);
  }

  async updateStatus(jobId: string, status: JobStatus): Promise<Job | undefined> {
    const job = await this.getById(jobId);
    if (!job) return undefined;
    const completed_at = status === 'complete' ? new Date().toISOString() : job.completed_at;
    return this.put({ ...job, status, completed_at });
  }
}

export const jobRepository = new JobRepository();
