import React, { useRef, useState } from 'react';
import { Camera, FileUp, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JobDocumentType } from '../db/schema';
import { Job } from '../domain/models';
import { JobDocumentCaptureRuntime } from '../services/jobDocumentCaptureRuntime';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

const DOCUMENT_TYPES: Array<{ value: JobDocumentType; labelKey: string }> = [
  { value: 'permit_document', labelKey: 'jobDetail.documentCapture.types.permit_document' },
  { value: 'inspection_card', labelKey: 'jobDetail.documentCapture.types.inspection_card' },
  { value: 'utility_approval', labelKey: 'jobDetail.documentCapture.types.utility_approval' },
  { value: 'code_correction_notice', labelKey: 'jobDetail.documentCapture.types.code_correction_notice' },
  { value: 'plan_page', labelKey: 'jobDetail.documentCapture.types.plan_page' },
  { value: 'manufacturer_installation_instructions', labelKey: 'jobDetail.documentCapture.types.manufacturer_installation_instructions' },
  { value: 'ahj_notes', labelKey: 'jobDetail.documentCapture.types.ahj_notes' },
  { value: 'inspector_punch_list', labelKey: 'jobDetail.documentCapture.types.inspector_punch_list' },
  { value: 'change_order_approval', labelKey: 'jobDetail.documentCapture.types.change_order_approval' },
  { value: 'other', labelKey: 'jobDetail.documentCapture.types.other' },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export function JobDocumentQuickCapture({
  job,
  stepId,
  source,
  onSaved,
  onClose,
}: {
  job: Job;
  stepId?: string;
  source: 'setup' | 'checklist' | 'final';
  onSaved?: () => void;
  onClose?: () => void;
}) {
  const { t } = useSettings();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<JobDocumentType>('permit_document');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const help = source === 'setup'
    ? t('jobDetail.documentCapture.setupHelp')
    : source === 'checklist'
      ? t('jobDetail.documentCapture.checklistHelp')
      : t('jobDetail.documentCapture.finalHelp');

  async function saveDocument(input: { file?: File; manualOnly?: boolean }) {
    setSaving(true);
    try {
      const file = input.file;
      const localUri = file ? await readFileAsDataUrl(file) : undefined;
      await JobDocumentCaptureRuntime.captureDocument({
        jobId: job.id,
        title: t(DOCUMENT_TYPES.find((item) => item.value === documentType)?.labelKey ?? 'jobDetail.documentCapture.jobDocument'),
        documentType,
        sourceType: file ? 'file_upload' : 'manual_note',
        stepId,
        localUri,
        fileName: file?.name,
        mimeType: file?.type,
        fileSize: file?.size,
        notes: note || (file ? t('jobDetail.documentCapture.savedImageFileNote') : t('jobDetail.documentCapture.savedManualNote')),
        trade: job.trade,
        specialty: job.specialty,
      });
      setNote('');
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  function takePhoto() {
    const params = new URLSearchParams({
      document: '1',
      documentType,
      category: t(DOCUMENT_TYPES.find((item) => item.value === documentType)?.labelKey ?? 'jobDetail.documentCapture.permitInspectionDocument'),
      returnTab: source === 'final' ? 'export' : 'proof',
    });
    if (stepId) params.set('requirementId', stepId);
    navigate(`/job/${job.id}/camera?${params.toString()}`);
  }

  return (
    <section className="bg-blue-50 border border-blue-100 rounded-[28px] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-black text-blue-950 uppercase tracking-tight">{t('jobDetail.documentCapture.addPermitInspection')}</h3>
          <p className="text-xs font-bold text-blue-800/80 mt-1">{help}</p>
          <p className="text-[11px] font-bold text-blue-700 mt-2">{t('jobDetail.documentCapture.takePictureHelp')}</p>
        </div>
        {onClose ? (
          <button onClick={onClose} className="p-2 rounded-xl bg-white/70 text-blue-700 hover:bg-white" aria-label={t('jobDetail.documentCapture.close')}>
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DOCUMENT_TYPES.slice(0, 6).map((item) => (
          <button
            key={item.value}
            onClick={() => setDocumentType(item.value)}
            className={cn(
              'min-h-11 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-widest border transition-all',
              documentType === item.value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100 text-blue-800',
            )}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <textarea
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t('jobDetail.documentCapture.optionalNote')}
        className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-400"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void saveDocument({ file });
          event.currentTarget.value = '';
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={takePhoto} className="min-h-12 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
          <Camera size={17} /> {t('jobDetail.takePhoto')}
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="min-h-12 bg-white text-blue-700 border border-blue-100 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
          <FileUp size={17} /> {t('jobDetail.documentCapture.upload')}
        </button>
        <button
          onClick={() => void saveDocument({ manualOnly: true })}
          disabled={saving}
          className="min-h-12 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={17} /> {saving ? t('jobDetail.documentCapture.saving') : t('jobDetail.documentCapture.addNote')}
        </button>
      </div>

      <p className="text-[11px] font-bold text-blue-700">{t('jobDetail.documentCapture.savedImageHelp')}</p>
    </section>
  );
}
