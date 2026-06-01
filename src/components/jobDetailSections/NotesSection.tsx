import React from 'react';
import { AlertTriangle, Languages, Mic, Wrench, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { VoiceNote } from '../../domain/models';
import { cn } from '../../lib/utils';

interface NotesSectionProps {
  voiceNotes: VoiceNote[];
  onRecordVoiceNote: () => void;
  t: (key: string) => string;
}

function VoiceChip({ icon, label, tone = 'default' }: { icon: React.ReactNode; label: string; tone?: 'default' | 'warning' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
      tone === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600',
    )}>
      {icon}
      {label}
    </span>
  );
}

export default function NotesSection({ voiceNotes, onRecordVoiceNote, t }: NotesSectionProps) {
  return (
    <section className="space-y-4">
      {voiceNotes.map((note) => (
        <div key={note.id} className="bg-white p-6 rounded-[28px] border border-slate-200 flex items-start gap-5 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
            <Mic size={22} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{note.category}</span>
              <span className="text-[10px] font-bold text-slate-400">{format(note.timestamp, 'MMM d, h:mm a')}</span>
            </div>
            {note.summary && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">{t('jobDetail.aiSummary')}</div>
                <p className="text-xs font-bold text-blue-950 leading-relaxed">{note.summary}</p>
              </div>
            )}
            <p className="text-slate-900 font-bold leading-relaxed">“{note.transcribedText}”</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <VoiceChip icon={<Languages size={13} />} label={note.language === 'es' ? t('jobDetail.spanish') : note.language === 'en' ? t('jobDetail.english') : t('jobDetail.languageAuto')} />
              {note.materialMentions?.slice(0, 3).map((item) => (
                <span key={item}><VoiceChip icon={<Wrench size={13} />} label={item} /></span>
              ))}
              {note.issueMentions?.length ? <VoiceChip tone="warning" icon={<AlertTriangle size={13} />} label={`${note.issueMentions.length} ${note.issueMentions.length === 1 ? t('jobDetail.issue') : t('jobDetail.issues')}`} /> : null}
              {note.changeOrderCandidates?.length ? <VoiceChip tone="warning" icon={<Zap size={13} />} label={t('jobDetail.changeOrderCandidate')} /> : null}
              {note.customerRequests?.length ? <VoiceChip icon={<Mic size={13} />} label={t('jobDetail.customerRequest')} /> : null}
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={onRecordVoiceNote}
        className="w-full py-8 border-4 border-dashed border-slate-200 rounded-[28px] flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-blue-300 hover:text-blue-500 transition-all"
      >
        <Mic size={38} />
        <span className="font-black text-xs uppercase tracking-widest">{t('jobDetail.recordFieldNote')}</span>
      </button>
    </section>
  );
}
