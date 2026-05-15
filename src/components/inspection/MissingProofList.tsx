import React from 'react';
import { Camera, ChevronRight, Mic } from 'lucide-react';
import { InspectionIssue } from '../../features/inspection/inspectionReadinessService';
import { ProofRequirement } from '../../templates/workflowTemplate.types';

export function MissingProofList({
  groupedItems,
  onCaptureIssue,
  getRequirement,
}: {
  groupedItems: Record<string, InspectionIssue[]>;
  onCaptureIssue: (issue: InspectionIssue) => void;
  getRequirement?: (requirementId?: string | null) => ProofRequirement | undefined;
}) {
  const entries = Object.entries(groupedItems);
  if (entries.length === 0) return null;

  return (
    <section className="bg-orange-50 border border-orange-100 rounded-[32px] p-6 space-y-5">
      <div>
        <h2 className="font-black text-orange-950 uppercase tracking-tight">Missing Required Proof</h2>
        <p className="text-xs font-bold text-orange-700/70 mt-1">Capture these before generating the inspector packet.</p>
      </div>

      <div className="space-y-4">
        {entries.map(([stageName, items]) => (
          <div key={stageName} className="bg-white/70 border border-orange-100 rounded-3xl p-4">
            <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">{stageName}</div>
            <div className="space-y-2">
              {items.map((item) => {
                const requirement = getRequirement?.(item.requirement_id);
                const isVoice = requirement?.proof_type === 'voice_note' || requirement?.proof_type === 'text_note';
                return (
                  <button
                    key={item.issue_id}
                    onClick={() => onCaptureIssue(item)}
                    className="w-full text-left bg-white hover:bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 text-orange-500">{isVoice ? <Mic size={18} /> : <Camera size={18} />}</div>
                      <div className="min-w-0">
                        <span className="block text-sm font-black text-slate-950">{item.title}</span>
                        <span className="block text-[11px] font-bold text-slate-500 line-clamp-2">{item.recommended_action || item.description}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-orange-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
