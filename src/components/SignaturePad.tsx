import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine, Save } from 'lucide-react';
import { SignatureRecord, SignatureService } from '../services/signatureService';
import { useSettings } from '../contexts/SettingsContext';

interface SignaturePadProps {
  jobId: string;
  onSaved: (record: SignatureRecord) => void;
}

export function SignaturePad({ jobId, onSaved }: SignaturePadProps) {
  const { settings, t } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState<SignatureRecord['signerRole']>('customer');
  const consentText = SignatureService.consentText(settings.exportLanguage);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.strokeStyle = '#0f172a';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    drawing.current = true;
    const next = point(event);
    context.beginPath();
    context.moveTo(next.x, next.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const next = point(event);
    context.lineTo(next.x, next.y);
    context.stroke();
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const record = await SignatureService.save({
      jobId,
      signerName: signerName.trim() || undefined,
      signerRole,
      signatureDataUrl: canvas.toDataURL('image/png'),
      consentText,
      reportTypes: ['customer_completion', 'payment_final_handoff'],
    });
    onSaved(record);
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300">
        <PenLine size={16} /> {t('jobDetail.captureSignoff')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={signerName}
          onChange={(event) => setSignerName(event.target.value)}
          placeholder={t('signature.signerName')}
          className="min-h-12 rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-blue-400"
        />
        <select
          value={signerRole}
          onChange={(event) => setSignerRole(event.target.value as SignatureRecord['signerRole'])}
          className="min-h-12 rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-blue-400"
        >
          {(['customer', 'contractor', 'crew', 'manager', 'other'] as const).map((role) => (
            <option key={role} value={role}>{t(`signature.roles.${role}`)}</option>
          ))}
        </select>
      </div>
      <canvas
        ref={canvasRef}
        width={720}
        height={220}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => { drawing.current = false; }}
        onPointerLeave={() => { drawing.current = false; }}
        className="w-full h-36 rounded-2xl bg-white touch-none"
      />
      <p className="text-xs font-bold text-slate-400">{consentText}</p>
      <div className="flex gap-3">
        <button onClick={clear} className="flex-1 min-h-12 rounded-2xl bg-white/10 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
          <Eraser size={16} /> {t('signature.clear')}
        </button>
        <button onClick={save} className="flex-1 min-h-12 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
          <Save size={16} /> {t('signature.save')}
        </button>
      </div>
    </div>
  );
}
