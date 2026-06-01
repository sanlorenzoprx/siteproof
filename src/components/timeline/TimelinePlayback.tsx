import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle, Clock, Download, FileText, MapPin, Mic, PlayCircle, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { TimelinePlaybackItem, TimelinePlaybackResult, TimelinePlaybackService } from '../../features/timeline/timelinePlaybackService';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';

function itemIcon(item: TimelinePlaybackItem) {
  switch (item.type) {
    case 'photo': return <Camera size={18} />;
    case 'voice_note': return <Mic size={18} />;
    case 'export': return <Download size={18} />;
    case 'issue': return <AlertTriangle size={18} />;
    case 'change_order': return <Zap size={18} />;
    case 'stage': return <CheckCircle size={18} />;
    default: return <FileText size={18} />;
  }
}

function itemTone(item: TimelinePlaybackItem): string {
  if (item.type === 'issue' || item.type === 'change_order') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (item.type === 'export') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (item.type === 'voice_note') return 'bg-violet-100 text-violet-700 border-violet-200';
  if (item.type === 'stage') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function PlaybackItemCard({ item, onPreview }: { item: TimelinePlaybackItem; onPreview: (item: TimelinePlaybackItem) => void }) {
  return (
    <div className="relative pl-9">
      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-4 border-blue-500 shadow-sm" />
      <div className="bg-white border border-slate-200 rounded-[28px] p-4 md:p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex gap-4">
          {item.thumbnailDataUrl ? (
            <button onClick={() => onPreview(item)} className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 shrink-0 ring-1 ring-slate-200">
              <img src={item.thumbnailDataUrl} alt={item.title} className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className={cn('w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0', itemTone(item))}>
              {itemIcon(item)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {format(item.occurredAt || Date.now(), 'h:mm a')}
              </span>
              {item.stageName && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-widest">
                  {item.stageName}
                </span>
              )}
              {item.gpsLabel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[9px] font-black uppercase tracking-widest">
                  <MapPin size={11} /> GPS
                </span>
              )}
            </div>
            <h4 className="font-black text-slate-950 tracking-tight">{item.title}</h4>
            {item.requirementName && <p className="text-xs font-black text-blue-600 mt-1">{item.requirementName}</p>}
            {item.description && <p className="text-xs font-bold text-slate-600 leading-relaxed mt-1 line-clamp-3">{item.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.filter(Boolean).slice(0, 4).map((tag) => (
                <span key={`${item.id}-${tag}`} className="px-2 py-1 rounded-full bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                  {tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelinePreviewModal({ item, onClose, closeLabel, gpsLabel }: { item: TimelinePlaybackItem | null; onClose: () => void; closeLabel: string; gpsLabel: string }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-[32px] max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(event) => event.stopPropagation()}>
        {item.mediaDataUrl && (
          <div className="bg-slate-950 max-h-[62vh] flex items-center justify-center">
            <img src={item.mediaDataUrl} alt={item.title} className="max-h-[62vh] w-full object-contain" />
          </div>
        )}
        <div className="p-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">{format(item.occurredAt, 'PPpp')}</div>
          <h3 className="text-2xl font-black text-slate-950 tracking-tight">{item.requirementName || item.title}</h3>
          {item.description && <p className="mt-2 text-sm font-bold text-slate-600 leading-relaxed">{item.description}</p>}
          {item.gpsLabel && <p className="mt-4 text-xs font-black text-green-700 uppercase tracking-widest">{gpsLabel}: {item.gpsLabel}</p>}
          <button onClick={onClose} className="mt-6 w-full bg-slate-950 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs">{closeLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function TimelinePlayback({ jobId }: { jobId: string }) {
  const { t } = useSettings();
  const [timeline, setTimeline] = useState<TimelinePlaybackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<TimelinePlaybackItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'proof' | 'notes' | 'issues' | 'exports'>('all');

  useEffect(() => {
    let active = true;
    TimelinePlaybackService.getJobTimeline(jobId).then((result) => {
      if (!active) return;
      setTimeline(result);
      setLoading(false);
    });
    return () => { active = false; };
  }, [jobId]);

  const filteredGroups = useMemo(() => {
    if (!timeline) return [];
    const allowed = (item: TimelinePlaybackItem) => {
      if (filter === 'all') return true;
      if (filter === 'proof') return item.type === 'photo';
      if (filter === 'notes') return item.type === 'voice_note';
      if (filter === 'issues') return item.type === 'issue' || item.type === 'change_order';
      if (filter === 'exports') return item.type === 'export';
      return true;
    };
    return timeline.groups
      .map((group) => ({ ...group, items: group.items.filter(allowed) }))
      .filter((group) => group.items.length > 0);
  }, [timeline, filter]);

  if (loading) {
    return <div className="bg-white border border-slate-200 rounded-[32px] p-8 text-center text-sm font-black text-slate-400 uppercase tracking-widest">{t('timeline.loading')}</div>;
  }

  if (!timeline) {
    return <div className="bg-white border border-slate-200 rounded-[32px] p-8 text-center text-sm font-black text-slate-400 uppercase tracking-widest">{t('timeline.unavailable')}</div>;
  }

  return (
    <section className="space-y-6">
      <TimelinePreviewModal item={preview} onClose={() => setPreview(null)} closeLabel={t('timeline.close')} gpsLabel={t('timeline.gps')} />

      <div className="bg-slate-950 rounded-[36px] p-6 md:p-8 text-white overflow-hidden relative">
        <div className="absolute -right-14 -top-14 opacity-10"><PlayCircle size={230} /></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-[10px] font-black uppercase tracking-widest mb-4">
            <Clock size={13} /> {t('timeline.playback')}
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">{t('timeline.replayTitle')}</h2>
          <p className="mt-3 text-sm font-bold text-slate-300 max-w-2xl">{t('timeline.replaySubtitle')}</p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-7">
            <SummaryStat label={t('timeline.events')} value={String(timeline.summary.itemCount)} />
            <SummaryStat label={t('timeline.photos')} value={String(timeline.summary.photoCount)} />
            <SummaryStat label={t('timeline.notes')} value={String(timeline.summary.voiceNoteCount)} />
            <SummaryStat label={t('timeline.issues')} value={String(timeline.summary.issueCount)} />
            <SummaryStat label={t('timeline.duration')} value={timeline.summary.durationLabel} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-200/60 rounded-2xl w-fit overflow-x-auto no-scrollbar">
        {[
          ['all', t('timeline.filterAll')],
          ['proof', t('timeline.filterProof')],
          ['notes', t('timeline.filterNotes')],
          ['issues', t('timeline.filterIssues')],
          ['exports', t('timeline.filterExports')],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id as typeof filter)}
            className={cn(
              'px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap',
              filter === id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {filteredGroups.map((group) => (
          <div key={group.dateLabel}>
            <div className="sticky top-0 z-10 py-2 bg-slate-50/95 backdrop-blur-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{group.dateLabel}</h3>
            </div>
            <div className="relative mt-3 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {group.items.map((item) => (
                <React.Fragment key={`${item.type}-${item.id}`}>
                  <PlaybackItemCard item={item} onPreview={setPreview} />
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {!filteredGroups.length && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-10 text-center">
            <Clock size={38} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('timeline.noItemsForFilter')}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-black text-white truncate">{value}</div>
    </div>
  );
}
