import { BaseRepository } from './baseRepository';
import { VoiceNote, baseSyncFields, baseTimestampFields, newId } from '../schema';

export type CreateVoiceNoteInput = Omit<VoiceNote, 'voice_note_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at' | 'extracted_tasks' | 'change_order_candidates' | 'material_mentions' | 'issue_mentions'> & {
  extracted_tasks?: string[];
  change_order_candidates?: string[];
  material_mentions?: string[];
  issue_mentions?: string[];
};

class VoiceNoteRepository extends BaseRepository<VoiceNote> {
  constructor() {
    super('voice_notes', 'voice_note_id', 'voice_note');
  }

  async createVoiceNote(input: CreateVoiceNoteInput): Promise<VoiceNote> {
    return this.create({
      ...input,
      voice_note_id: newId(),
      extracted_tasks: input.extracted_tasks ?? [],
      change_order_candidates: input.change_order_candidates ?? [],
      material_mentions: input.material_mentions ?? [],
      issue_mentions: input.issue_mentions ?? [],
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  getByJob(jobId: string): Promise<VoiceNote[]> {
    return this.getByIndex('job_id', jobId);
  }
}

export const voiceNoteRepository = new VoiceNoteRepository();
