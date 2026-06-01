import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { format } from 'date-fns';
import { JobPhoto } from '../../domain/models';
import { MediaPipelineService } from '../../services/mediaPipelineService';
import { cn } from '../../lib/utils';

interface PhotosSectionProps {
  photos: JobPhoto[];
  onOpenCamera: () => void;
  t: (key: string) => string;
}

const PhotoThumbnail = ({ photo, className }: { photo: JobPhoto; className?: string }) => {
  const [url, setUrl] = useState<string>(photo.thumbnailDataUrl || photo.dataUrl || '');

  useEffect(() => {
    if (!photo.thumbnailDataUrl && !photo.dataUrl && photo.blob) {
      const objectUrl = URL.createObjectURL(photo.blob);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [photo]);

  return <img src={url} className={className} alt={photo.category} />;
};

function PhotoGalleryCard({ photo, t }: { key?: React.Key; photo: JobPhoto; t: (key: string) => string }) {
  const hasGps = typeof photo.latitude === 'number' && typeof photo.longitude === 'number';
  const compressed = photo.compressionState === 'compressed' || photo.compressionState === 'not_needed';
  const quality = photo.qualityScore ? Math.round(photo.qualityScore * 100) : null;

  return (
    <div className="bg-white rounded-[30px] overflow-hidden border border-slate-200 shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <PhotoThumbnail photo={photo} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white', hasGps ? 'bg-green-600' : 'bg-red-500')}>
            {hasGps ? 'GPS' : t('jobDetail.noGps')}
          </span>
          <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white', compressed ? 'bg-blue-600' : 'bg-slate-600')}>
            {compressed ? t('jobDetail.mediaReady') : t('jobDetail.processing')}
          </span>
        </div>
        {photo.isIssue && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
            {photo.issueType?.replace('_', ' ') || t('jobDetail.issue')}
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">{photo.category}</div>
          <div className="text-xs font-bold text-slate-500">{format(photo.timestamp, 'MMM d, h:mm a')}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-2xl p-2">
            <div className="text-[9px] font-black uppercase text-slate-400">{t('jobDetail.size')}</div>
            <div className="text-[11px] font-black text-slate-900">{MediaPipelineService.humanFileSize(photo.compressedSize ?? photo.originalSize)}</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-2">
            <div className="text-[9px] font-black uppercase text-slate-400">{t('jobDetail.quality')}</div>
            <div className="text-[11px] font-black text-slate-900">{quality ? `${quality}%` : '—'}</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-2">
            <div className="text-[9px] font-black uppercase text-slate-400">{t('jobDetail.pixels')}</div>
            <div className="text-[11px] font-black text-slate-900">{photo.width && photo.height ? `${photo.width}×${photo.height}` : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PhotosSection({ photos, onOpenCamera, t }: PhotosSectionProps) {
  return (
    <section className="space-y-5">
      <div className="bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-950 text-lg tracking-tight">{t('jobDetail.gallery')}</h3>
          <p className="text-xs font-bold text-slate-500">{t('jobDetail.galleryHelp')}</p>
        </div>
        <button
          onClick={onOpenCamera}
          className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Camera size={18} />
          {t('jobDetail.addPhoto')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {photos.map((photo) => (
          <PhotoGalleryCard key={photo.id} photo={photo} t={t} />
        ))}
      </div>
    </section>
  );
}
