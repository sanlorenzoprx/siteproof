import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { InspectionIssue } from '../../features/inspection/inspectionReadinessService';

export function QualityWarningsPanel({ groupedItems }: { groupedItems: Record<string, InspectionIssue[]> }) {
  const entries = Object.entries(groupedItems);
  if (entries.length === 0) return null;

  return (
    <section className="bg-yellow-50 border border-yellow-100 rounded-[32px] p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-700 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h2 className="font-black text-yellow-950 uppercase tracking-tight">Inspection Warnings</h2>
          <p className="text-xs font-bold text-yellow-700/70 mt-1">These do not block export, but they may weaken the packet.</p>
        </div>
      </div>

      <div className="space-y-3">
        {entries.map(([stageName, items]) => (
          <div key={stageName} className="bg-white/70 border border-yellow-100 rounded-3xl p-4">
            <div className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">{stageName}</div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.issue_id} className="text-xs font-bold text-slate-700 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-950">{item.title}</span>
                    <p className="text-slate-500 font-semibold mt-0.5">{item.recommended_action || item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
