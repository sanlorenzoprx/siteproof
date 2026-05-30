import { ShieldCheck } from 'lucide-react';

export function BidPrivacyBanner({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 flex items-start gap-3">
      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-700" />
      <p className="text-xs font-black uppercase tracking-widest leading-relaxed">{text}</p>
    </div>
  );
}
