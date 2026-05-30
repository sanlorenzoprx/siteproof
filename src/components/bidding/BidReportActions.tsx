import { Download } from 'lucide-react';

interface BidReportActionsProps {
  onInternal: () => void;
  onCustomer: () => void;
  disabled?: boolean;
  t: (key: string) => string;
}

export function BidReportActions({ onInternal, onCustomer, disabled, t }: BidReportActionsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={onInternal}
        disabled={disabled}
        className="min-h-12 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Download size={16} /> {t('jobDetail.createInternalBidReport')}
      </button>
      <button
        type="button"
        onClick={onCustomer}
        disabled={disabled}
        className="min-h-12 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-900 flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Download size={16} /> {t('jobDetail.createCustomerBidReport')}
      </button>
    </div>
  );
}
