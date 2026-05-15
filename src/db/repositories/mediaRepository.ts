import { BaseRepository } from './baseRepository';
import { MediaAsset, baseSyncFields, baseTimestampFields, newId } from '../schema';

export type CreateMediaInput = Omit<MediaAsset, 'media_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at' | 'compression_state' | 'upload_state'> & {
  compression_state?: MediaAsset['compression_state'];
  upload_state?: MediaAsset['upload_state'];
};

class MediaRepository extends BaseRepository<MediaAsset> {
  constructor() {
    super('media_assets', 'media_id', 'media_asset');
  }

  async createMedia(input: CreateMediaInput): Promise<MediaAsset> {
    return this.create({
      ...input,
      media_id: newId(),
      compression_state: input.compression_state ?? 'pending',
      upload_state: input.upload_state ?? 'pending_upload',
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  getByJob(jobId: string): Promise<MediaAsset[]> {
    return this.getByIndex('job_id', jobId);
  }

  getByProof(proofId: string): Promise<MediaAsset[]> {
    return this.getByIndex('proof_id', proofId);
  }

  getPendingUploads(): Promise<MediaAsset[]> {
    return this.getByIndex('upload_state', 'pending_upload');
  }
}

export const mediaRepository = new MediaRepository();
