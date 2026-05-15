import { BaseRepository } from './baseRepository';
import { TimelineEvent, TimelineEventType, baseSyncFields, baseTimestampFields, newId, nowIso } from '../schema';

export type CreateTimelineEventInput = Omit<TimelineEvent, 'event_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at' | 'occurred_at' | 'related_proof_ids'> & {
  occurred_at?: string;
  related_proof_ids?: string[];
  event_type: TimelineEventType;
};

class TimelineRepository extends BaseRepository<TimelineEvent> {
  constructor() {
    super('timeline_events', 'event_id', 'timeline_event');
  }

  async createEvent(input: CreateTimelineEventInput): Promise<TimelineEvent> {
    return this.create({
      ...input,
      event_id: newId(),
      occurred_at: input.occurred_at ?? nowIso(),
      related_proof_ids: input.related_proof_ids ?? [],
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  async getByJob(jobId: string): Promise<TimelineEvent[]> {
    const events = await this.getByIndex('job_id', jobId);
    return events.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  }
}

export const timelineRepository = new TimelineRepository();
