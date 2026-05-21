import generatorInstallTemplate from '../templates/generator_install_v1.json';
import { Job as LegacyJob, JobPhoto, VoiceNote as LegacyVoiceNote, SyncState } from '../types';
import {
  Address,
  Job as RuntimeJob,
  JobStatus as RuntimeJobStatus,
  ProofObject,
  RequirementPriority,
  WorkflowStageInstance,
  baseSyncFields,
  baseTimestampFields,
  newId,
  nowIso,
} from '../db/schema';
import {
  customerRepository,
  jobRepository,
  mediaRepository,
  proofRepository,
  templateRepository,
  timelineRepository,
  voiceNoteRepository,
  workflowStageRepository,
  changeOrderRepository,
} from '../db/repositories';
import { syncRepository } from '../db/repositories/syncRepository';
import { WorkflowTemplate, WorkflowStageTemplate, ProofRequirement } from '../templates/workflowTemplate.types';

const DEFAULT_COMPANY_ID = 'local_company';
const TEMPLATE_ALIASES: Record<string, string> = {
  generator_install: 'generator_install_v1',
  generator_install_v1: 'generator_install_v1',
};

export interface RuntimeSnapshot {
  runtimeJob?: RuntimeJob;
  stages: WorkflowStageInstance[];
  proofs: ProofObject[];
  missingRequired: Array<{ requirement_id: string; label: string; stage_id: string }>;
  requiredCount: number;
  completedRequiredCount: number;
  proofScore: number;
}

function normalizeTemplateId(templateId?: string | null): string {
  if (!templateId) return 'generator_install_v1';
  return TEMPLATE_ALIASES[templateId] ?? templateId;
}

function legacyStatusToRuntime(status: LegacyJob['status']): RuntimeJobStatus {
  switch (status) {
    case 'INCOMING': return 'draft';
    case 'ACTIVE': return 'active';
    case 'WAITING': return 'waiting';
    case 'INSPECTION': return 'inspection_ready';
    case 'COMPLETED': return 'complete';
    case 'ARCHIVED': return 'archived';
    default: return 'active';
  }
}

function parseAddress(address: string): Address {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  const zipMatch = address.match(/\b\d{5}(?:-\d{4})?\b/);
  return {
    formatted: address,
    line1: parts[0] ?? address,
    city: parts[1],
    state: parts[2]?.split(/\s+/)[0],
    postal_code: zipMatch?.[0],
    country: 'US',
  };
}

function getBundledTemplate(templateId: string): WorkflowTemplate | null {
  if (normalizeTemplateId(templateId) === 'generator_install_v1') {
    return generatorInstallTemplate as WorkflowTemplate;
  }
  return null;
}

function flattenRequirements(template: WorkflowTemplate): Array<{ stage: WorkflowStageTemplate; requirement: ProofRequirement }> {
  return template.stages.flatMap((stage) =>
    (stage.proof_requirements ?? []).map((requirement) => ({ stage, requirement })),
  );
}

function categoryToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isMatchingRequirement(requirement: ProofRequirement, category: string): boolean {
  const cat = categoryToken(category);
  const search = [
    requirement.requirement_id,
    requirement.display_name,
    requirement.field_instruction,
    ...(requirement.ai_label_hints ?? []),
  ].map(categoryToken);

  if (search.some((s) => s.includes(cat) || cat.includes(s))) return true;

  const synonyms: Record<string, string[]> = {
    meter: ['meter', 'electricmeter'],
    panel: ['panel', 'mainpanel', 'breakerpanel'],
    fuelline: ['fuel', 'fuelline', 'gasconnection', 'naturalgas', 'propane'],
    transferswitch: ['transferswitch', 'ats'],
    before: ['before', 'existing', 'proposedgeneratorlocationbefore', 'siteoverviewarrival'],
    after: ['after', 'final', 'finalgeneratorinstall', 'completed'],
    permit: ['permit', 'posted', 'inspection'],
    battery: ['battery', 'startup', 'test'],
    other: ['conduit', 'routing', 'general'],
    changeorder: ['changeorder'],
    deficiency: ['deficiency', 'issue'],
  };

  const syns = synonyms[cat] ?? [];
  return search.some((s) => syns.some((syn) => s.includes(syn)));
}

function selectRequirement(template: WorkflowTemplate, category: string, proofType: string, requirementId?: string | null): { stage: WorkflowStageTemplate; requirement: ProofRequirement } | null {
  const requirements = flattenRequirements(template);
  if (requirementId) {
    const exact = requirements.find(({ requirement }) => requirement.requirement_id === requirementId);
    if (exact) return exact;
  }
  const typeMatches = requirements.filter(({ requirement }) => {
    if (proofType === 'photo') return requirement.proof_type === 'photo' || requirement.proof_type === 'serial_number' || requirement.proof_type === 'test_result';
    if (proofType === 'voice_note') return requirement.proof_type === 'voice_note' || requirement.proof_type === 'text_note';
    return requirement.proof_type === proofType;
  });

  return typeMatches.find(({ requirement }) => isMatchingRequirement(requirement, category))
    ?? typeMatches.find(({ requirement }) => requirement.priority === 'recommended')
    ?? typeMatches[0]
    ?? requirements[0]
    ?? null;
}

async function getStageForTemplateStage(jobId: string, templateStageId: string): Promise<WorkflowStageInstance | undefined> {
  const stages = await workflowStageRepository.getByJob(jobId);
  return stages.find((stage) => stage.template_stage_id === templateStageId);
}

export class RuntimeOrchestrator {
  static async initialize(): Promise<void> {
    await this.ensureTemplateCached('generator_install_v1');
  }

  static async ensureTemplateCached(templateId = 'generator_install_v1'): Promise<WorkflowTemplate | null> {
    const normalized = normalizeTemplateId(templateId);
    const template = getBundledTemplate(normalized);
    if (!template) return null;

    const cached = await templateRepository.getByTemplateId(template.template_id);
    if (!cached) {
      await templateRepository.cacheTemplate({
        template_id: template.template_id,
        template_version: template.template_version,
        template_status: template.template_status,
        trade_specialty: template.trade_specialty ?? template.trade ?? 'electrical',
        vertical: template.vertical,
        job_type: template.job_type,
        display_name: template.display_name,
        full_template_json: template,
        checksum: null,
        active_flag: true,
      });
    }
    return template;
  }

  static async upsertJobFromLegacy(legacyJob: LegacyJob): Promise<RuntimeJob> {
    const templateId = normalizeTemplateId(legacyJob.templateId);
    const template = await this.ensureTemplateCached(templateId);
    const existing = await jobRepository.getById(legacyJob.id);
    const address = parseAddress(legacyJob.address);
    const now = nowIso();

    let customerId = existing?.customer_id ?? null;
    if (!customerId && legacyJob.customerName) {
      const customer = await customerRepository.createCustomer({
        company_id: DEFAULT_COMPANY_ID,
        name: legacyJob.customerName,
        property_address: address,
        notes: null,
      });
      customerId = customer.customer_id;
    }

    const runtimeJob: RuntimeJob = {
      ...(existing ?? {}),
      job_id: legacyJob.id,
      company_id: DEFAULT_COMPANY_ID,
      customer_id: customerId,
      job_title: legacyJob.customerName || legacyJob.jobType || 'Field Job',
      job_type: template?.job_type ?? legacyJob.jobType,
      trade_specialty: template?.trade_specialty ?? template?.trade ?? 'electrical',
      vertical: template?.vertical ?? null,
      status: legacyStatusToRuntime(legacyJob.status),
      priority: legacyJob.status === 'INCOMING' ? 'normal' : 'normal',
      jobsite_address: address,
      jobsite_zip: address.postal_code ?? null,
      city: address.city ?? null,
      county: null,
      state: address.state ?? null,
      gps_latitude: existing?.gps_latitude ?? null,
      gps_longitude: existing?.gps_longitude ?? null,
      template_id: template?.template_id ?? templateId,
      template_version: template?.template_version ?? '1.0.0',
      permit_status: existing?.permit_status ?? 'unknown',
      inspection_status: existing?.inspection_status ?? 'unknown',
      scope_summary: legacyJob.notes ?? null,
      emergency_job: false,
      storm_related: false,
      utility_provider: null,
      started_at: existing?.started_at ?? now,
      completed_at: legacyJob.status === 'COMPLETED' ? (existing?.completed_at ?? now) : existing?.completed_at ?? null,
      ui_language_at_creation: legacyJob.uiLanguageAtCreation ?? existing?.ui_language_at_creation ?? 'en',
      default_capture_language: legacyJob.defaultCaptureLanguage ?? existing?.default_capture_language ?? 'en',
      default_export_language: legacyJob.defaultExportLanguage ?? existing?.default_export_language ?? 'en',
      created_at: existing?.created_at ?? new Date(legacyJob.createdAt || Date.now()).toISOString(),
      updated_at: now,
      deleted_at: existing?.deleted_at ?? null,
      sync_state: 'pending_upload',
      local_version: (existing?.local_version ?? 0) + 1,
      remote_version: existing?.remote_version ?? null,
      last_synced_at: existing?.last_synced_at ?? null,
    };

    if (existing) await jobRepository.put(runtimeJob, 'update');
    else await jobRepository.create(runtimeJob);

    if (template) await this.instantiateStages(runtimeJob, template);
    await timelineRepository.createEvent({
      job_id: runtimeJob.job_id,
      event_type: existing ? 'job_started' : 'job_created',
      event_title: existing ? 'Job updated' : 'Job created',
      event_description: legacyJob.jobType,
    });
    await this.recomputeJobCompletion(runtimeJob.job_id);
    return runtimeJob;
  }

  static async instantiateStages(job: RuntimeJob, template: WorkflowTemplate): Promise<WorkflowStageInstance[]> {
    const existing = await workflowStageRepository.getByJob(job.job_id);
    const created: WorkflowStageInstance[] = [];

    for (const stage of template.stages) {
      if (existing.some((s) => s.template_stage_id === stage.stage_id)) continue;
      const requiredCount = (stage.proof_requirements ?? []).filter((r) => r.priority === 'required').length;
      const recommendedCount = (stage.proof_requirements ?? []).filter((r) => r.priority === 'recommended').length;
      created.push(await workflowStageRepository.createStage({
        job_id: job.job_id,
        template_id: template.template_id,
        template_version: template.template_version,
        template_stage_id: stage.stage_id,
        stage_key: stage.stage_key,
        stage_name: stage.display_name,
        sort_order: stage.sort_order,
        required_count: requiredCount,
        recommended_count: recommendedCount,
        started_at: stage.stage_key === 'intake' ? nowIso() : null,
        completed_at: null,
      }));
    }

    return [...existing, ...created].sort((a, b) => a.sort_order - b.sort_order);
  }

  static async savePhotoFromLegacy(photo: JobPhoto): Promise<void> {
    const runtimeJob = await jobRepository.getById(photo.jobId);
    const template = await this.ensureTemplateCached(runtimeJob?.template_id ?? 'generator_install_v1');
    const selected = template ? selectRequirement(template, photo.category, 'photo', photo.requirementId) : null;
    const stage = selected ? await getStageForTemplateStage(photo.jobId, selected.stage.stage_id) : undefined;
    const now = nowIso();

    const existingProof = (await proofRepository.getByJob(photo.jobId)).find((proof) =>
      proof.metadata?.legacy_photo_id === photo.id || proof.metadata?.source_ui_photo_id === photo.id,
    );
    if (existingProof) return;

    const proof = await proofRepository.createProof({
      job_id: photo.jobId,
      stage_instance_id: stage?.stage_instance_id ?? null,
      requirement_id: selected?.requirement.requirement_id ?? null,
      proof_type: 'photo',
      title: selected?.requirement.display_name ?? photo.category,
      description: photo.notes ?? null,
      captured_at: new Date(photo.timestamp || Date.now()).toISOString(),
      device_captured_at: now,
      gps_timestamp: photo.latitude && photo.longitude ? now : null,
      gps_latitude: photo.latitude ?? null,
      gps_longitude: photo.longitude ?? null,
      gps_accuracy_meters: null,
      captured_by: null,
      required_flag: selected?.requirement.priority === 'required',
      priority: (selected?.requirement.priority as RequirementPriority | undefined) ?? 'optional',
      ai_labels: selected?.requirement.ai_label_hints ?? [photo.category],
      user_labels: [photo.category, ...(photo.isIssue ? [photo.issueType ?? 'ISSUE'] : [])],
      inspection_tags: selected?.requirement.inspection_tags ?? [],
      permit_tags: selected?.requirement.permit_tags ?? [],
      export_tags: selected?.requirement.export_tags ?? ['internal_record'],
      confidence_score: null,
      quality_score: photo.qualityScore ?? (photo.blob || photo.dataUrl ? 0.9 : null),
      hash: photo.proofHash ?? null,
      integrity_hash: photo.proofHash ?? null,
      hash_algorithm: photo.proofHashAlgorithm ?? (photo.proofHash ? 'SHA-256' : null),
      integrity_status: photo.integrityStatus ?? (photo.proofHash ? 'verified' : 'missing_hash'),
      integrity_stamped_at: photo.integrityStampedAt ?? null,
      chain_of_custody: photo.custodyLog ?? [],
      notes: photo.notes ?? null,
      metadata: { legacy_photo_id: photo.id, source_ui_photo_id: photo.id, ui_stage_id: photo.stageId ?? null, is_issue: photo.isIssue ?? false, issue_type: photo.issueType ?? null, custody_log: photo.custodyLog ?? [], data_url: photo.dataUrl ?? null, thumbnail_data_url: photo.thumbnailDataUrl ?? null, width: photo.width ?? null, height: photo.height ?? null, original_size: photo.originalSize ?? null, compressed_size: photo.compressedSize ?? null, compression_state: photo.compressionState ?? null, thumbnail_state: photo.thumbnailState ?? null },
    });

    await mediaRepository.createMedia({
      proof_id: proof.proof_id,
      job_id: photo.jobId,
      local_uri: `siteproof://media/${photo.jobId}/${photo.id}/original.jpg`,
      thumbnail_uri: photo.thumbnailDataUrl ? `siteproof://media/${photo.jobId}/${photo.id}/thumb.jpg` : null,
      mime_type: photo.compressedBlob?.type || photo.blob?.type || 'image/jpeg',
      file_name: `${photo.category.replace(/\s+/g, '_').toLowerCase()}_${photo.id}.jpg`,
      file_size: photo.compressedSize ?? photo.compressedBlob?.size ?? photo.blob?.size ?? photo.dataUrl?.length ?? 0,
      width: photo.width ?? null,
      height: photo.height ?? null,
      duration_ms: null,
      compression_state: photo.compressionState ?? 'pending',
      upload_state: 'pending_upload',
      checksum: photo.proofHash ?? null,
      language: photo.language ?? null,
      cloud_object_key: photo.cloudObjectKey ?? null,
    });

    await timelineRepository.createEvent({
      job_id: photo.jobId,
      stage_instance_id: stage?.stage_instance_id ?? null,
      event_type: 'proof_captured',
      event_title: `${photo.category} photo captured`,
      event_description: selected?.requirement.field_instruction ?? null,
      related_proof_ids: [proof.proof_id],
      gps_latitude: photo.latitude ?? null,
      gps_longitude: photo.longitude ?? null,
    });

    await this.recomputeJobCompletion(photo.jobId);
  }

  static async saveVoiceNoteFromLegacy(note: LegacyVoiceNote): Promise<void> {
    const runtimeJob = await jobRepository.getById(note.jobId);
    const template = await this.ensureTemplateCached(runtimeJob?.template_id ?? 'generator_install_v1');
    const selected = template ? selectRequirement(template, note.category, 'voice_note', note.requirementId) : null;
    const stage = selected ? await getStageForTemplateStage(note.jobId, selected.stage.stage_id) : undefined;

    const existingProof = (await proofRepository.getByJob(note.jobId)).find((proof) =>
      proof.metadata?.legacy_voice_note_id === note.id || proof.metadata?.source_ui_voice_note_id === note.id,
    );
    if (existingProof) return;

    const proof = await proofRepository.createProof({
      job_id: note.jobId,
      stage_instance_id: stage?.stage_instance_id ?? null,
      requirement_id: selected?.requirement.requirement_id ?? null,
      proof_type: 'voice_note',
      title: selected?.requirement.display_name ?? note.category,
      description: note.transcribedText,
      captured_at: new Date(note.timestamp || Date.now()).toISOString(),
      device_captured_at: nowIso(),
      gps_timestamp: null,
      gps_latitude: null,
      gps_longitude: null,
      gps_accuracy_meters: null,
      captured_by: null,
      required_flag: selected?.requirement.priority === 'required',
      priority: (selected?.requirement.priority as RequirementPriority | undefined) ?? 'optional',
      ai_labels: selected?.requirement.ai_label_hints ?? [note.category],
      user_labels: [note.category, ...(note.isIssue ? ['issue'] : []), ...(note.isChangeOrder ? ['change_order'] : [])],
      inspection_tags: selected?.requirement.inspection_tags ?? [],
      permit_tags: selected?.requirement.permit_tags ?? [],
      export_tags: selected?.requirement.export_tags ?? ['internal_record'],
      confidence_score: null,
      quality_score: note.transcribedText ? 0.85 : null,
      hash: note.proofHash ?? null,
      integrity_hash: note.proofHash ?? null,
      hash_algorithm: note.proofHashAlgorithm ?? (note.proofHash ? 'SHA-256' : null),
      integrity_status: note.integrityStatus ?? (note.proofHash ? 'verified' : 'missing_hash'),
      integrity_stamped_at: note.integrityStampedAt ?? null,
      chain_of_custody: note.custodyLog ?? [],
      notes: note.transcribedText,
      metadata: {
        legacy_voice_note_id: note.id,
        source_ui_voice_note_id: note.id,
        ui_stage_id: note.stageId ?? null,
        audio_url: note.audioUrl ?? null,
        duration_ms: note.durationMs ?? null,
        file_size: note.fileSize ?? null,
        is_issue: note.isIssue ?? false,
        is_change_order: note.isChangeOrder ?? false,
        language: note.language ?? 'unknown',
        summary: note.summary ?? null,
        materials: note.materialMentions ?? [],
        issues: note.issueMentions ?? [],
        customer_requests: note.customerRequests ?? [],
        change_order_candidates: note.changeOrderCandidates ?? [],
        ai_confidence: note.aiConfidence ?? null,
        ai_status: note.aiStatus ?? 'local',
        custody_log: note.custodyLog ?? [],
      },
    });

    let audioMediaId: string | null = null;
    if (note.audioBlob || note.audioUrl) {
      const media = await mediaRepository.createMedia({
        proof_id: proof.proof_id,
        job_id: note.jobId,
        local_uri: `siteproof://voice-notes/${note.id}`, 
        mime_type: note.audioBlob?.type || 'audio/webm',
        file_name: `voice_note_${note.id}.webm`,
        file_size: note.fileSize ?? note.audioBlob?.size ?? 0,
        duration_ms: null,
        compression_state: 'not_needed',
        upload_state: 'pending_upload',
        checksum: note.proofHash ?? null,
      });
      audioMediaId = media.media_id;
    }

    await voiceNoteRepository.createVoiceNote({
      proof_id: proof.proof_id,
      job_id: note.jobId,
      audio_media_id: audioMediaId,
      transcript: note.transcribedText,
      language: note.language ?? 'unknown',
      summary: note.summary ?? note.transcribedText,
      extracted_tasks: note.extractedTasks ?? [],
      change_order_candidates: note.changeOrderCandidates ?? (note.isChangeOrder ? [note.transcribedText] : []),
      material_mentions: note.materialMentions ?? [],
      issue_mentions: note.issueMentions ?? (note.isIssue ? [note.transcribedText] : []),
      customer_requests: note.customerRequests ?? [],
    });

    if ((note.changeOrderCandidates?.length ?? 0) > 0 || note.isChangeOrder) {
      const candidates = note.changeOrderCandidates?.length ? note.changeOrderCandidates : [note.transcribedText];
      for (const candidate of candidates.slice(0, 3)) {
        await changeOrderRepository.createCandidate({
          job_id: note.jobId,
          source_proof_id: proof.proof_id,
          detected_from: 'voice_note',
          description: candidate,
          estimated_impact: null,
          status: 'candidate',
          related_photo_ids: [],
          related_note_ids: [proof.proof_id],
        });
      }
    }

    await timelineRepository.createEvent({
      job_id: note.jobId,
      stage_instance_id: stage?.stage_instance_id ?? null,
      event_type: note.isChangeOrder ? 'change_order_detected' : 'note_added',
      event_title: note.isChangeOrder ? 'Change-order voice note captured' : 'Voice note captured',
      event_description: note.transcribedText,
      related_proof_ids: [proof.proof_id],
    });

    await this.recomputeJobCompletion(note.jobId);
  }

  static async recomputeJobCompletion(jobId: string): Promise<RuntimeSnapshot> {
    const runtimeJob = await jobRepository.getById(jobId);
    const template = await this.ensureTemplateCached(runtimeJob?.template_id ?? 'generator_install_v1');
    const stages = await workflowStageRepository.getByJob(jobId);
    const proofs = await proofRepository.getByJob(jobId);
    const missingRequired: RuntimeSnapshot['missingRequired'] = [];

    if (template) {
      for (const stage of template.stages) {
        const instance = stages.find((s) => s.template_stage_id === stage.stage_id);
        if (!instance) continue;
        const stageRequirementIds = new Set([
          ...(stage.proof_requirements ?? []).map((requirement) => requirement.requirement_id),
          ...(stage.checklist_items ?? []).map((item) => item.checklist_id),
        ]);
        const stageProofs = proofs.filter((proof) =>
          proof.stage_instance_id === instance.stage_instance_id ||
          (!proof.stage_instance_id && Boolean(proof.requirement_id) && stageRequirementIds.has(proof.requirement_id!)),
        );
        let completedRequired = 0;
        let completedRecommended = 0;
        const stageMissing: string[] = [];

        for (const requirement of stage.proof_requirements ?? []) {
          const count = stageProofs.filter((proof) => proof.requirement_id === requirement.requirement_id).length;
          if (requirement.priority === 'required') {
            if (count >= (requirement.minimum_count ?? 1)) completedRequired += 1;
            else {
              stageMissing.push(requirement.requirement_id);
              missingRequired.push({ requirement_id: requirement.requirement_id, label: requirement.display_name, stage_id: stage.stage_id });
            }
          }
          if (requirement.priority === 'recommended' && count >= (requirement.minimum_count ?? 1)) completedRecommended += 1;
        }

        const blockingChecklistItems = (stage.checklist_items ?? []).filter((item) => item.blocks_stage_completion);
        for (const item of blockingChecklistItems) {
          const count = stageProofs.filter((proof) => proof.requirement_id === item.checklist_id).length;
          if (count >= 1) completedRequired += 1;
          else {
            stageMissing.push(item.checklist_id);
            missingRequired.push({ requirement_id: item.checklist_id, label: item.display_name, stage_id: stage.stage_id });
          }
        }

        const requiredCount = (stage.proof_requirements ?? []).filter((r) => r.priority === 'required').length + blockingChecklistItems.length;
        const recommendedCount = (stage.proof_requirements ?? []).filter((r) => r.priority === 'recommended').length;
        const nextStatus = requiredCount > 0 && completedRequired >= requiredCount ? 'complete' : stageProofs.length > 0 ? 'in_progress' : instance.status;
        await workflowStageRepository.put({
          ...instance,
          required_count: requiredCount,
          completed_required_count: completedRequired,
          recommended_count: recommendedCount,
          completed_recommended_count: completedRecommended,
          missing_items: stageMissing,
          status: nextStatus,
          completed_at: nextStatus === 'complete' ? (instance.completed_at ?? nowIso()) : instance.completed_at,
        });
      }
    }

    const nextStages = await workflowStageRepository.getByJob(jobId);
    const requiredCount = nextStages.reduce((sum, stage) => sum + stage.required_count, 0);
    const completedRequiredCount = nextStages.reduce((sum, stage) => sum + stage.completed_required_count, 0);
    const proofScore = requiredCount > 0 ? Math.round((completedRequiredCount / requiredCount) * 100) : 100;

    return { runtimeJob, stages: nextStages, proofs, missingRequired, requiredCount, completedRequiredCount, proofScore };
  }

  static async getRuntimeSnapshot(jobId: string): Promise<RuntimeSnapshot> {
    return this.recomputeJobCompletion(jobId);
  }

  static async softDeleteJob(jobId: string): Promise<void> {
    await jobRepository.softDelete(jobId);
    await timelineRepository.createEvent({
      job_id: jobId,
      event_type: 'warning',
      event_title: 'Job deleted locally',
      event_description: 'Job was soft-deleted and queued for sync.',
    });
  }

  static async getPendingSyncState(): Promise<SyncState> {
    const queued = await syncRepository.getQueued();
    return {
      lastSyncTime: null,
      lastError: queued.find((op) => op.last_error)?.last_error ?? null,
      pendingCount: queued.length,
      isSyncing: queued.some((op) => op.status === 'running'),
    };
  }
}
