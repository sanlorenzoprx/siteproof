import React from 'react';
import { Download, FileText, Mail, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Job } from '../../domain/models';
import { SiteProofReportType } from '../../features/export/reportTypes';
import { JobDocumentQuickCapture } from '../JobDocumentQuickCapture';
import { MissingProofWarning } from '../../services/missingProofDetectionService';
import { ExportPacket } from '../../db/schema';
import { SignaturePad } from '../SignaturePad';
import { SignatureRecord } from '../../services/signatureService';
import { ReportLanguageToggle } from '../reports/ReportLanguageToggle';
import { ReportShareService } from '../../features/export/reportShareService';

interface ExportSectionProps {
  job: Job;
  selectedReportType: SiteProofReportType;
  reportOptions: readonly SiteProofReportType[];
  onChangeSelectedReportType: (value: SiteProofReportType) => void;
  inspectionReportBlocked: boolean;
  showMissingProofReview: boolean;
  missingProofWarnings: MissingProofWarning[];
  onCaptureMissingProof: (warning: MissingProofWarning) => void;
  onMarkWarningNotNeeded: (warning: MissingProofWarning) => void;
  onGenerateAnywayFromReview: () => void;
  generatingReport: boolean;
  onGenerateReport: () => void;
  reportError: string | null;
  signatures: SignatureRecord[];
  onSignatureSaved: (record: SignatureRecord) => void;
  exportPackets: ExportPacket[];
  shareRecipient: string;
  onChangeShareRecipient: (value: string) => void;
  shareError: string | null;
  onSharePacket: (packet: ExportPacket, channel: 'email' | 'sms') => void;
  t: (key: string) => string;
}

export default function ExportSection(props: ExportSectionProps) {
  const {
    job,
    selectedReportType,
    reportOptions,
    onChangeSelectedReportType,
    inspectionReportBlocked,
    showMissingProofReview,
    missingProofWarnings,
    onCaptureMissingProof,
    onMarkWarningNotNeeded,
    onGenerateAnywayFromReview,
    generatingReport,
    onGenerateReport,
    reportError,
    signatures,
    onSignatureSaved,
    exportPackets,
    shareRecipient,
    onChangeShareRecipient,
    shareError,
    onSharePacket,
    t,
  } = props;

  return (
    <section className="space-y-6">
      <div className="bg-slate-900 rounded-[36px] p-8 text-white overflow-hidden relative">
        <div className="absolute -right-10 -top-10 opacity-5"><FileText size={220} /></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight mb-3">{t('jobDetail.generatePacket')}</h2>
          <p className="text-sm font-bold text-slate-400 max-w-xl mb-8">
            {t('jobDetail.exportHelp')}
          </p>
          <div className="mb-5">
            <JobDocumentQuickCapture
              job={job}
              source="final"
              stepId="final_document_check"
            />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 space-y-4">
            <label className="block">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('jobDetail.reportType')}</span>
              <select
                value={selectedReportType}
                onChange={(event) => onChangeSelectedReportType(event.target.value as SiteProofReportType)}
                className="w-full min-h-14 rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-base font-black text-white outline-none focus:border-blue-400"
              >
                {reportOptions.map((reportType) => (
                  <option key={reportType} value={reportType}>
                    {t(`jobDetail.reportTypes.${reportType}`)}
                  </option>
                ))}
              </select>
            </label>
            {inspectionReportBlocked ? (
              <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-xs font-bold text-orange-100">
                {t('jobDetail.missingProofReviewNotice')}
              </div>
            ) : null}
            {showMissingProofReview ? (
              <div className="rounded-[24px] border border-orange-400/30 bg-orange-500/10 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-black text-orange-100">{t('jobDetail.missingProofReview')}</h3>
                  <p className="text-xs font-bold text-orange-100/75">{t('jobDetail.missingProofReviewHelp')}</p>
                </div>
                <div className="space-y-2">
                  {missingProofWarnings.map((warning) => (
                    <div key={warning.stepId} className="rounded-2xl bg-slate-950/60 border border-white/10 p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-white">{warning.title}</div>
                          <div className="text-[11px] font-bold text-slate-400">{warning.warning}</div>
                          <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-orange-200">{warning.required ? t('jobDetail.required') : t('jobDetail.recommended')}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => onCaptureMissingProof(warning)} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">{t('jobDetail.captureMissingProof')}</button>
                          <button onClick={() => onMarkWarningNotNeeded(warning)} className="px-3 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest">{t('jobDetail.markNotNeeded')}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={onGenerateAnywayFromReview} className="w-full min-h-12 rounded-2xl bg-white text-slate-950 text-xs font-black uppercase tracking-widest">
                  {t('jobDetail.generateAnyway')}
                </button>
              </div>
            ) : null}
            <button
              onClick={onGenerateReport}
              disabled={generatingReport}
              className="w-full min-h-14 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:bg-blue-600"
            >
              <Download size={18} /> {generatingReport ? t('jobDetail.generatingReport') : t('jobDetail.generateReport')}
            </button>
            {reportError && (
              <p
                role="alert"
                aria-live="assertive"
                className="mt-3 text-sm font-bold text-red-700 bg-red-50 border border-red-300 rounded-xl px-3 py-2"
              >
                {reportError}
              </p>
            )}
          </div>
          {(selectedReportType === SiteProofReportType.CUSTOMER_COMPLETION || selectedReportType === SiteProofReportType.PAYMENT_FINAL_HANDOFF) ? (
            <div className="mt-4">
              <SignaturePad jobId={job.id} onSaved={onSignatureSaved} />
              <p className="mt-3 text-xs font-bold text-slate-400">
                {signatures.length ? `${signatures[0].signerName ?? t('signature.unnamedSigner')} - ${format(new Date(signatures[0].signedAt), 'MMM d, h:mm a')}` : t('signature.customerNotDocumented')}
              </p>
            </div>
          ) : null}
          <div className="mt-6"><ReportLanguageToggle /></div>

          <div className="mt-8 bg-white/5 border border-white/10 rounded-[28px] p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">{t('jobDetail.history')}</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{exportPackets.length} {t('jobDetail.savedLocallyCount')}</span>
            </div>
            <label className="block mb-4">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('jobDetail.shareRecipientLabel')}</span>
              <input
                value={shareRecipient}
                onChange={(event) => onChangeShareRecipient(event.target.value)}
                placeholder={t('jobDetail.shareRecipientPlaceholder')}
                className="w-full min-h-12 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
              />
              {shareError && (
                <p
                  role="alert"
                  aria-live="assertive"
                  className="mt-2 text-sm font-bold text-red-700 bg-red-50 border border-red-300 rounded-xl px-3 py-2"
                >
                  {shareError}
                </p>
              )}
            </label>
            {exportPackets.length === 0 ? (
              <p className="text-xs font-bold text-slate-500">{t('jobDetail.noPackets')}</p>
            ) : (
              <div className="space-y-3">
                {exportPackets.slice(0, 5).map((packet) => (
                  <div key={packet.export_id} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex flex-col gap-3">
                    <div>
                      <div className="text-sm font-black text-white">{packet.title}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{format(new Date(packet.generated_at), 'MMM d, h:mm a')} • {packet.included_proof_ids.length} {t('jobDetail.proofItems')}</div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-300">
                        {ReportShareService.canShareLink(packet) ? packet.share_status.replaceAll('_', ' ') : t('jobDetail.savedLocallyCloudNeeded')}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {packet.local_file_uri.startsWith('data:') ? (
                          <a
                            href={packet.local_file_uri}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                          >
                            <FileText size={14} /> {t('jobDetail.openLocalReport')}
                          </a>
                        ) : null}
                        <button
                          onClick={() => onSharePacket(packet, 'email')}
                          disabled={!ReportShareService.canShareLink(packet)}
                          className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <Mail size={14} /> {t('jobDetail.emailReport')}
                        </button>
                        <button
                          onClick={() => onSharePacket(packet, 'sms')}
                          disabled={!ReportShareService.canShareLink(packet)}
                          className="px-3 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <MessageSquare size={14} /> {t('jobDetail.smsLink')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
