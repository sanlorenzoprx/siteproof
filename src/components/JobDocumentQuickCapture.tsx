import React, { useRef, useState } from 'react';
import { Camera, FileUp, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JobDocumentType } from '../db/schema';
import { Job } from '../types';
import { JobDocumentCaptureRuntime } from '../services/jobDocumentCaptureRuntime';
import { cn } from '../lib/utils';

const DOCUMENT_TYPES: Array<{ value: JobDocumentType; label: string }> = [
  { value: 'permit_document', label: 'Permit document' },
  { value: 'inspection_card', label: 'Inspection card' },
  { value: 'utility_approval', label: 'Utility approval' },
  { value: 'code_correction_notice', label: 'Correction notice' },
  { value: 'plan_page', label: 'Plan page' },
  { value: 'manufacturer_installation_instructions', label: 'Manufacturer instructions' },
  { value: 'ahj_notes', label: 'AHJ notes' },
  { value: 'inspector_punch_list', label: 'Inspector punch list' },
  { value: 'change_order_approval', label: 'Change order approval' },
  { value: 'other', label: 'Other' },
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
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<JobDocumentType>('permit_document');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const help = source === 'setup'
    ? 'Have a permit, inspection card, plan page, or approval document? Add it now and SiteProof will organize it with this job.'
    : source === 'checklist'
      ? 'Add any permit, inspection card, plan page, correction notice, or approval document connected to this job.'
      : 'Final document check. Add any permit, inspection, approval, punch list, or change order document before generating your Pro Reports.';

  async function saveDocument(input: { file?: File; manualOnly?: boolean }) {
    setSaving(true);
    try {
      const file = input.file;
      const localUri = file ? await readFileAsDataUrl(file) : undefined;
      await JobDocumentCaptureRuntime.captureDocument({
        jobId: job.id,
        title: DOCUMENT_TYPES.find((item) => item.value === documentType)?.label ?? 'Job document',
        documentType,
        sourceType: file ? 'file_upload' : 'manual_note',
        stepId,
        localUri,
        fileName: file?.name,
        mimeType: file?.type,
        fileSize: file?.size,
        notes: note || (file ? 'Document saved as image/file. You can add a note later.' : 'Document saved as manual note.'),
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
      category: DOCUMENT_TYPES.find((item) => item.value === documentType)?.label ?? 'Permit / Inspection Document',
      returnTab: source === 'final' ? 'export' : 'proof',
    });
    if (stepId) params.set('requirementId', stepId);
    navigate(`/job/${job.id}/camera?${params.toString()}`);
  }

  return (
    <section className="bg-blue-50 border border-blue-100 rounded-[28px] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-black text-blue-950 uppercase tracking-tight">Add Permit / Inspection Document</h3>
          <p className="text-xs font-bold text-blue-800/80 mt-1">{help}</p>
          <p className="text-[11px] font-bold text-blue-700 mt-2">Take a picture. SiteProof organizes it with the job.</p>
        </div>
        {onClose ? (
          <button onClick={onClose} className="p-2 rounded-xl bg-white/70 text-blue-700 hover:bg-white" aria-label="Close document capture">
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
            {item.label}
          </button>
        ))}
      </div>

      <textarea
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note"
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
          <Camera size={17} /> Take Photo
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="min-h-12 bg-white text-blue-700 border border-blue-100 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
          <FileUp size={17} /> Upload
        </button>
        <button
          onClick={() => void saveDocument({ manualOnly: true })}
          disabled={saving}
          className="min-h-12 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={17} /> {saving ? 'Saving...' : 'Add Note'}
        </button>
      </div>

      <p className="text-[11px] font-bold text-blue-700">Document saved as image. You can add a note now or keep moving.</p>
    </section>
  );
}
