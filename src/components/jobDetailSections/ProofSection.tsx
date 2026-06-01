import React from 'react';
import { Camera, CheckCircle, ChevronDown, ChevronRight, Circle, FileText, Mic } from 'lucide-react';
import { Job } from '../../domain/models';
import { RuntimeSnapshot } from '../../services/runtimeOrchestrator';
import { cn } from '../../lib/utils';
import { ChecklistItem, ProofRequirement, WorkflowStageTemplate } from '../../templates/workflowTemplate.types';
import { JobDocumentQuickCapture } from '../JobDocumentQuickCapture';

type DocumentCaptureSource = 'setup' | 'checklist' | 'final' | null;

interface ProofSectionProps {
  job: Job;
  documentCaptureSource: DocumentCaptureSource;
  setDocumentCaptureSource: (source: DocumentCaptureSource) => void;
  visibleStages: WorkflowStageTemplate[];
  stageRuntimeByTemplateId: Map<string, RuntimeSnapshot['stages'][number]>;
  proofByRequirement: Map<string, number>;
  expandedStages: Record<string, boolean>;
  onToggleStage: (stageId: string) => void;
  onCaptureRequirement: (stage: WorkflowStageTemplate, requirement: ProofRequirement) => void;
  onCompleteChecklistItem: (stage: WorkflowStageTemplate, item: ChecklistItem) => void;
  t: (key: string) => string;
}

function requirementActionLabel(requirement: ProofRequirement, t: (key: string) => string): string {
  if (requirement.proof_type === 'voice_note') return t('jobDetail.recordNote');
  if (requirement.proof_type === 'text_note') return t('jobDetail.dictateNote');
  if (requirement.proof_type === 'signature') return t('jobDetail.captureSignoff');
  if (requirement.proof_type === 'serial_number') return t('jobDetail.captureSerial');
  if (requirement.proof_type === 'test_result') return t('jobDetail.captureTest');
  return t('jobDetail.takePhoto');
}

function priorityBadge(requirement: ProofRequirement, t: (key: string) => string): string {
  if (requirement.priority === 'required') return t('jobDetail.required');
  if (requirement.priority === 'recommended') return t('jobDetail.recommended');
  if (requirement.priority === 'conditional') return t('jobDetail.conditional');
  return t('jobDetail.optional');
}

function WorkflowStageCard({
  stage,
  index,
  runtimeStage,
  proofByRequirement,
  expanded,
  onToggle,
  onCapture,
  onCompleteChecklistItem,
  t,
}: {
  key?: React.Key;
  stage: WorkflowStageTemplate;
  index: number;
  runtimeStage?: RuntimeSnapshot['stages'][number];
  proofByRequirement: Map<string, number>;
  expanded: boolean;
  onToggle: () => void;
  onCapture: (requirement: ProofRequirement) => void;
  onCompleteChecklistItem: (item: ChecklistItem) => void;
  t: (key: string) => string;
}) {
  const required = stage.proof_requirements.filter((requirement) => requirement.priority === 'required');
  const completedRequired = required.filter((requirement) => (proofByRequirement.get(requirement.requirement_id) ?? 0) >= requirement.minimum_count).length;
  const stageComplete = required.length === 0 || completedRequired >= required.length;
  const statusLabel = stageComplete ? t('jobDetail.complete') : runtimeStage?.status === 'in_progress' ? t('jobDetail.inProgress') : t('jobDetail.needsProof');

  return (
    <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full p-5 md:p-6 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-all">
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0',
            stageComplete ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400',
          )}>
            {stageComplete ? <CheckCircle size={24} /> : index + 1}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-black text-slate-950 uppercase tracking-tight">{stage.display_name}</h3>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                stageComplete ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700',
              )}>
                {statusLabel}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 leading-relaxed line-clamp-2">{stage.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-xs font-black text-slate-400 uppercase tracking-widest">
            {completedRequired}/{required.length} {t('jobDetail.requiredCount')}
          </span>
          {expanded ? <ChevronDown size={22} className="text-slate-400" /> : <ChevronRight size={22} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 md:px-6 pb-6 space-y-3">
          {stage.proof_requirements.map((requirement) => {
            const count = proofByRequirement.get(requirement.requirement_id) ?? 0;
            const done = count >= requirement.minimum_count;
            return (
              <div key={requirement.requirement_id} className={cn(
                'border rounded-3xl p-4 md:p-5 transition-all',
                done ? 'border-green-100 bg-green-50/40' : requirement.priority === 'required' ? 'border-orange-100 bg-orange-50/30' : 'border-slate-200 bg-white',
              )}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn('mt-0.5', done ? 'text-green-600' : 'text-slate-300')}>
                      {done ? <CheckCircle size={22} /> : <Circle size={22} />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-black text-slate-950 text-sm md:text-base">{requirement.display_name}</h4>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                          requirement.priority === 'required' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500',
                        )}>
                          {priorityBadge(requirement, t)}
                        </span>
                        {count > 0 && <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">{count} {t('jobDetail.captured')}</span>}
                      </div>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">{requirement.field_instruction}</p>
                      {requirement.capture_hint && <p className="text-[11px] font-bold text-slate-400 mt-1">{t('jobDetail.tip')}: {requirement.capture_hint}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => onCapture(requirement)}
                    className={cn(
                      'shrink-0 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                      done ? 'bg-white border border-green-200 text-green-700 hover:bg-green-50' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/15',
                    )}
                  >
                    {requirement.proof_type === 'voice_note' || requirement.proof_type === 'text_note' ? <Mic size={16} /> : <Camera size={16} />}
                    {done ? t('jobDetail.addMore') : requirementActionLabel(requirement, t)}
                  </button>
                </div>
              </div>
            );
          })}

          {stage.checklist_items && stage.checklist_items.length > 0 && (
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-3xl p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t('jobDetail.checklist')}</div>
              <div className="space-y-2">
                {stage.checklist_items.map((item) => {
                  const done = (proofByRequirement.get(item.checklist_id) ?? 0) > 0;
                  return (
                    <button
                      key={item.checklist_id}
                      type="button"
                      onClick={() => !done && onCompleteChecklistItem(item)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 text-xs font-bold rounded-2xl p-3 transition-all',
                        done ? 'bg-green-50 text-slate-600' : 'bg-white text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      {done ? <CheckCircle size={14} className="mt-0.5 text-green-600" /> : <Circle size={14} className="mt-0.5 text-slate-300" />}
                      <div>
                        <span className="text-slate-900">{item.display_name}</span>
                        <p className="text-slate-500 font-semibold mt-0.5">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProofSection(props: ProofSectionProps) {
  const {
    job,
    documentCaptureSource,
    setDocumentCaptureSource,
    visibleStages,
    stageRuntimeByTemplateId,
    proofByRequirement,
    expandedStages,
    onToggleStage,
    onCaptureRequirement,
    onCompleteChecklistItem,
    t,
  } = props;

  return (
    <section className="space-y-5">
      {documentCaptureSource === 'checklist' ? (
        <JobDocumentQuickCapture
          job={job}
          source="checklist"
          stepId="permit_or_inspection_document"
          onSaved={() => setDocumentCaptureSource(null)}
          onClose={() => setDocumentCaptureSource(null)}
        />
      ) : (
        <button
          onClick={() => setDocumentCaptureSource('checklist')}
          className="w-full bg-blue-50 border border-blue-100 text-blue-700 p-5 rounded-[28px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
        >
          <FileText size={18} /> {t('jobDetail.documentCapture.addPermitInspection')}
        </button>
      )}
      {visibleStages.map((stage, index) => (
        <WorkflowStageCard
          key={stage.stage_id}
          stage={stage}
          index={index}
          runtimeStage={stageRuntimeByTemplateId.get(stage.stage_id)}
          proofByRequirement={proofByRequirement}
          expanded={expandedStages[stage.stage_id] ?? false}
          onToggle={() => onToggleStage(stage.stage_id)}
          onCapture={(requirement) => onCaptureRequirement(stage, requirement)}
          onCompleteChecklistItem={(item) => onCompleteChecklistItem(stage, item)}
          t={t}
        />
      ))}
    </section>
  );
}
