import { format } from 'date-fns';
import { SiteProofDataService } from '../../services/siteProofDataService';
import { timelineRepository } from '../../db/repositories/timelineRepository';
import { ExportPacketService } from '../export/exportPacketService';
import { TemplateCatalogService } from '../../services/templateCatalogService';
import { Job, JobPhoto, VoiceNote } from '../../types';
import { TimelineEvent } from '../../db/schema';
import { WorkflowTemplate } from '../../templates/workflowTemplate.types';

export type TimelinePlaybackItemType =
  | 'job'
  | 'stage'
  | 'photo'
  | 'voice_note'
  | 'export'
  | 'issue'
  | 'change_order'
  | 'warning';

export interface TimelinePlaybackItem {
  id: string;
  jobId: string;
  type: TimelinePlaybackItemType;
  title: string;
  description?: string | null;
  occurredAt: number;
  stageId?: string | null;
  stageName?: string | null;
  requirementId?: string | null;
  requirementName?: string | null;
  thumbnailDataUrl?: string | null;
  mediaDataUrl?: string | null;
  gpsLabel?: string | null;
  tags: string[];
  source: 'legacy' | 'runtime' | 'export';
}

export interface TimelinePlaybackGroup {
  dateLabel: string;
  items: TimelinePlaybackItem[];
}

export interface TimelinePlaybackSummary {
  itemCount: number;
  photoCount: number;
  voiceNoteCount: number;
  exportCount: number;
  issueCount: number;
  firstEventAt?: number;
  lastEventAt?: number;
  durationLabel: string;
}

export interface TimelinePlaybackResult {
  job: Job;
  template: WorkflowTemplate | null;
  items: TimelinePlaybackItem[];
  groups: TimelinePlaybackGroup[];
  summary: TimelinePlaybackSummary;
}

function stageNameFor(template: WorkflowTemplate | null, stageId?: string | null): string | null {
  if (!template || !stageId) return null;
  return template.stages.find((stage) => stage.stage_id === stageId)?.display_name ?? null;
}

function requirementNameFor(template: WorkflowTemplate | null, requirementId?: string | null): string | null {
  if (!template || !requirementId) return null;
  for (const stage of template.stages) {
    const requirement = stage.proof_requirements?.find((item) => item.requirement_id === requirementId);
    if (requirement) return requirement.display_name;
  }
  return null;
}

function gpsLabel(photo: JobPhoto): string | null {
  if (typeof photo.latitude !== 'number' || typeof photo.longitude !== 'number') return null;
  return `${photo.latitude.toFixed(5)}, ${photo.longitude?.toFixed(5)}`;
}

function runtimeTime(event: TimelineEvent): number {
  const parsed = Date.parse(event.occurred_at || event.created_at);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function durationLabel(first?: number, last?: number): string {
  if (!first || !last || last <= first) return 'Same day';
  const minutes = Math.round((last - first) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function uniqueItems(items: TimelinePlaybackItem[]): TimelinePlaybackItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class TimelinePlaybackService {
  static async getJobTimeline(jobId: string): Promise<TimelinePlaybackResult | null> {
    const job = await SiteProofDataService.getJobById(jobId);
    if (!job) return null;

    const [photos, voiceNotes, runtimeEvents, exportPackets] = await Promise.all([
      SiteProofDataService.getPhotos(jobId),
      SiteProofDataService.getVoiceNotes(jobId),
      timelineRepository.getByJob(jobId).catch(() => []),
      ExportPacketService.getPacketHistory(jobId).catch(() => []),
    ]);

    const template = TemplateCatalogService.getTemplate(job.templateId);
    const items: TimelinePlaybackItem[] = [];

    items.push({
      id: `job-created-${job.id}`,
      jobId: job.id,
      type: 'job',
      title: 'Job created',
      description: `${job.customerName} • ${job.jobType}`,
      occurredAt: job.createdAt || Date.now(),
      tags: ['job', job.status.toLowerCase()],
      source: 'legacy',
    });

    for (const event of runtimeEvents) {
      if (event.event_type === 'proof_captured' || event.event_type === 'note_added' || event.event_type === 'export_generated') continue;
      items.push({
        id: event.event_id,
        jobId,
        type: event.event_type.includes('stage') ? 'stage' : event.event_type === 'warning' ? 'warning' : event.event_type === 'change_order_detected' ? 'change_order' : 'job',
        title: event.event_title,
        description: event.event_description,
        occurredAt: runtimeTime(event),
        stageId: event.stage_instance_id,
        tags: [event.event_type],
        source: 'runtime',
      });
    }

    for (const photo of photos) {
      const requirementName = requirementNameFor(template, photo.requirementId) ?? photo.category;
      const type: TimelinePlaybackItemType = photo.isIssue ? (photo.issueType === 'CHANGE_ORDER' ? 'change_order' : 'issue') : 'photo';
      items.push({
        id: photo.id,
        jobId,
        type,
        title: type === 'photo' ? 'Photo captured' : type === 'change_order' ? 'Change order photo' : 'Issue photo',
        description: requirementName,
        occurredAt: photo.timestamp || Date.now(),
        stageId: photo.stageId,
        stageName: stageNameFor(template, photo.stageId),
        requirementId: photo.requirementId,
        requirementName,
        thumbnailDataUrl: photo.thumbnailDataUrl ?? photo.dataUrl ?? null,
        mediaDataUrl: photo.dataUrl ?? null,
        gpsLabel: gpsLabel(photo),
        tags: [photo.category, ...(photo.isIssue ? ['issue'] : []), ...(photo.requirementId ? ['required-proof'] : [])],
        source: 'legacy',
      });
    }

    for (const note of voiceNotes) {
      const requirementName = requirementNameFor(template, note.requirementId) ?? note.category;
      items.push({
        id: note.id,
        jobId,
        type: note.isChangeOrder || (note.changeOrderCandidates?.length ?? 0) > 0 ? 'change_order' : note.isIssue ? 'issue' : 'voice_note',
        title: note.isChangeOrder ? 'Change order note' : note.isIssue ? 'Issue note' : 'Voice note captured',
        description: note.summary || note.transcribedText || requirementName,
        occurredAt: note.timestamp || Date.now(),
        stageId: note.stageId,
        stageName: stageNameFor(template, note.stageId),
        requirementId: note.requirementId,
        requirementName,
        tags: [note.language ?? 'unknown', ...(note.materialMentions ?? []).slice(0, 3), ...(note.changeOrderCandidates?.length ? ['change-order'] : [])],
        source: 'legacy',
      });
    }

    for (const packet of exportPackets) {
      items.push({
        id: packet.export_id,
        jobId,
        type: 'export',
        title: `${packet.packet_type.replace(/_/g, ' ')} generated`,
        description: `${packet.included_proof_ids.length} proof item${packet.included_proof_ids.length === 1 ? '' : 's'} included`,
        occurredAt: Date.parse(packet.generated_at),
        tags: [packet.packet_type, packet.share_status],
        source: 'export',
      });
    }

    const sorted = uniqueItems(items).sort((a, b) => a.occurredAt - b.occurredAt);
    const groups = sorted.reduce<TimelinePlaybackGroup[]>((acc, item) => {
      const dateLabel = format(item.occurredAt || Date.now(), 'EEEE, MMM d, yyyy');
      const current = acc[acc.length - 1];
      if (!current || current.dateLabel !== dateLabel) {
        acc.push({ dateLabel, items: [item] });
      } else {
        current.items.push(item);
      }
      return acc;
    }, []);

    const firstEventAt = sorted[0]?.occurredAt;
    const lastEventAt = sorted[sorted.length - 1]?.occurredAt;
    const summary: TimelinePlaybackSummary = {
      itemCount: sorted.length,
      photoCount: sorted.filter((item) => item.type === 'photo' || item.type === 'issue' || item.type === 'change_order').length,
      voiceNoteCount: sorted.filter((item) => item.type === 'voice_note').length,
      exportCount: sorted.filter((item) => item.type === 'export').length,
      issueCount: sorted.filter((item) => item.type === 'issue' || item.type === 'change_order' || item.tags.includes('change-order')).length,
      firstEventAt,
      lastEventAt,
      durationLabel: durationLabel(firstEventAt, lastEventAt),
    };

    return { job, template, items: sorted, groups, summary };
  }
}
