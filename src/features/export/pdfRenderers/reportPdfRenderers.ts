import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { ExportAssembly } from '../exportAssembler';
import type { ReportDefinition, ReportSection } from '../reportDefinitions';
import { SiteProofReportType } from '../reportTypes';
import type { ExportIntegrityManifest } from '../../../services/proofIntegrityService';
import type { SiteProofLanguage } from '../../../types/settings';
import { SITEPROOF_BRAND } from '../../../config/brand';
import { translate } from '../../../config/i18n';
import type { LocalReportNarrative } from '../reportNarratives';

type PdfProfile = {
  companyName?: string;
  tagline?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  licenseNumber?: string;
  fullName?: string;
};

export interface ReportRenderContext {
  assembly: ExportAssembly;
  definition: ReportDefinition;
  language: SiteProofLanguage;
  business?: PdfProfile | null;
  user?: PdfProfile | null;
  integrityManifest?: ExportIntegrityManifest | null;
  signatureDataUrl?: string;
  narrative: LocalReportNarrative;
}

interface PdfLayout {
  doc: jsPDF;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  y: number;
  language: SiteProofLanguage;
  business?: PdfProfile | null;
  user?: PdfProfile | null;
  definition: ReportDefinition;
}

function tr(language: SiteProofLanguage, key: string): string {
  return translate(language, key);
}

function reportTitle(layout: PdfLayout): string {
  return tr(layout.language, layout.definition.titleKey) || layout.definition.fallbackTitle;
}

function reportPurpose(layout: PdfLayout): string {
  const purpose = tr(layout.language, `reports.app.purposes.${layout.definition.type}`);
  return purpose === `reports.app.purposes.${layout.definition.type}` ? layout.definition.purpose : purpose;
}

function fmt(language: SiteProofLanguage, value: number | Date | string | undefined | null, pattern: string): string {
  const date = value ? new Date(value) : new Date();
  return format(date, pattern, { locale: language === 'es' ? es : enUS });
}

function addHeader(layout: PdfLayout) {
  const { doc, margin, pageWidth, business, definition } = layout;
  const color = definition.audience === 'dispute_support'
    ? [185, 28, 28]
    : definition.audience === 'inspector'
      ? [29, 78, 216]
      : definition.audience === 'payment'
        ? [22, 101, 52]
        : [15, 23, 42];

  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(0, 0, pageWidth, 52, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text((business?.companyName || SITEPROOF_BRAND.appName).toUpperCase(), margin, 24);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(business?.tagline || SITEPROOF_BRAND.tagline, margin, 31);

  const contact = [business?.phone, business?.email, business?.website].filter(Boolean).join('  |  ');
  doc.setFont('helvetica', 'normal');
  doc.text(contact, margin, 43);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(reportTitle(layout).toUpperCase(), pageWidth - margin, 24, { align: 'right' });
}

function addFooter(layout: PdfLayout, pageNum: number, totalPages: number) {
  const { doc, margin, pageWidth, pageHeight, language } = layout;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(tr(language, 'reports.footerGenerated'), pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(`${tr(language, 'reports.page')} ${pageNum} ${tr(language, 'reports.of')} ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
}

function ensurePageSpace(layout: PdfLayout, neededHeight: number) {
  if (layout.y + neededHeight <= layout.pageHeight - 24) return;
  layout.doc.addPage();
  addHeader(layout);
  layout.y = 68;
}

function addSectionTitle(layout: PdfLayout, title: string, purpose?: string) {
  ensurePageSpace(layout, purpose ? 24 : 14);
  const { doc, margin } = layout;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title.toUpperCase(), margin, layout.y);
  layout.y += 8;
  if (purpose) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(purpose, layout.pageWidth - margin * 2);
    doc.text(lines, margin, layout.y);
    layout.y += lines.length * 5 + 7;
  } else {
    layout.y += 4;
  }
}

function addKeyValueBlock(layout: PdfLayout, rows: Array<[string, string | number | undefined | null]>) {
  const valueWidth = layout.pageWidth - layout.margin * 2 - 12;
  const preparedRows = rows.map(([key, value]) => {
    const text = String(value ?? tr(layout.language, 'reports.app.missing.notRecorded'));
    const lines = layout.doc.splitTextToSize(text, valueWidth) as string[];
    return { key, lines, height: 8 + lines.length * 4.8 + 4 };
  });
  const blockHeight = preparedRows.reduce((sum, row) => sum + row.height, 0) + 8;
  ensurePageSpace(layout, blockHeight);
  const { doc, margin, pageWidth } = layout;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, layout.y, pageWidth - margin * 2, blockHeight, 'F');
  layout.y += 8;
  preparedRows.forEach(({ key, lines, height }) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(key.toUpperCase(), margin + 6, layout.y);
    layout.y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(lines, margin + 6, layout.y);
    layout.y += height - 5;
  });
  layout.y += 6;
}

function addParagraph(layout: PdfLayout, text: string) {
  ensurePageSpace(layout, 22);
  const { doc, margin, pageWidth } = layout;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
  doc.text(lines, margin, layout.y);
  layout.y += lines.length * 5.5 + 9;
}

function addPhotoGrid(layout: PdfLayout, photos: ExportAssembly['photos']) {
  addSectionTitle(layout, tr(layout.language, 'reports.app.sections.proofPhotos'), photos.length ? undefined : tr(layout.language, 'reports.app.missing.noMatchingPhotos'));
  if (!photos.length) return;

  const { doc, margin, pageWidth, language } = layout;
  const colWidth = (pageWidth - margin * 3) / 2;
  photos.forEach((photo, index) => {
    if (index % 2 === 0) ensurePageSpace(layout, 88);
    const x = margin + (index % 2) * (colWidth + margin);
    const y = layout.y;
    const boxHeight = 54;
    doc.setFillColor(241, 245, 249);
    doc.rect(x, y, colWidth, boxHeight, 'F');
    try {
      if (!photo.dataUrl) throw new Error('No photo data');
      const sourceWidth = photo.width || colWidth;
      const sourceHeight = photo.height || boxHeight;
      const imageAspect = sourceWidth / sourceHeight;
      const boxAspect = colWidth / boxHeight;
      const drawWidth = imageAspect > boxAspect ? colWidth : boxHeight * imageAspect;
      const drawHeight = imageAspect > boxAspect ? colWidth / imageAspect : boxHeight;
      const drawX = x + (colWidth - drawWidth) / 2;
      const drawY = y + (boxHeight - drawHeight) / 2;
      doc.addImage(photo.dataUrl, photo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG', drawX, drawY, drawWidth, drawHeight);
    } catch {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text(tr(language, 'reports.photoUnavailable'), x + 8, y + 28);
    }
    doc.setFillColor(248, 250, 252);
    doc.rect(x, y + 54, colWidth, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text((photo.category || tr(language, 'reports.app.labels.proof')).slice(0, 32), x + 5, y + 63);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(fmt(language, photo.timestamp, 'MMM d, h:mm a'), x + 5, y + 72);
    const gps = typeof photo.latitude === 'number' && typeof photo.longitude === 'number'
      ? `${photo.latitude.toFixed(4)}, ${photo.longitude.toFixed(4)}`
      : tr(language, 'reports.app.missing.gpsNotRecorded');
    doc.text(gps, x + colWidth - 5, y + 72, { align: 'right' });
    if (index % 2 === 1 || index === photos.length - 1) layout.y += 86;
  });
}

function addTimelineRows(layout: PdfLayout, assembly: ExportAssembly, chronologicalFirst = false) {
  addSectionTitle(layout, chronologicalFirst ? tr(layout.language, 'reports.app.sections.chronologicalProofTimeline') : tr(layout.language, 'reports.app.sections.jobTimeline'));
  const rows = [
    { time: assembly.legacyJob.createdAt, label: tr(layout.language, 'reports.jobCreated'), detail: assembly.legacyJob.jobType },
    ...assembly.proofBundles.map((bundle) => ({
      time: bundle.proof.captured_at,
      label: bundle.requirementLabel,
      detail: [
        bundle.stageLabel,
        bundle.proof.proof_type.replace('_', ' '),
        bundle.proof.integrity_status ? `${tr(layout.language, 'reports.status')}: ${bundle.proof.integrity_status}` : undefined,
        bundle.proof.integrity_hash || bundle.proof.hash ? `${tr(layout.language, 'reports.hashPrefix')}: ${(bundle.proof.integrity_hash ?? bundle.proof.hash ?? '').slice(0, 12)}` : undefined,
      ].filter(Boolean).join(' | '),
    })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  rows.slice(0, 80).forEach((row) => {
    ensurePageSpace(layout, 9);
    layout.doc.setFontSize(9);
    layout.doc.setFont('helvetica', 'bold');
    layout.doc.setTextColor(15, 23, 42);
    layout.doc.text(fmt(layout.language, row.time, 'MMM d, h:mm a'), layout.margin, layout.y);
    layout.doc.setFont('helvetica', 'normal');
    layout.doc.setTextColor(71, 85, 105);
    layout.doc.text(`${row.label} - ${row.detail}`.slice(0, 82), layout.margin + 44, layout.y);
    layout.y += 8;
  });
  layout.y += 6;
}

function addVoiceNotes(layout: PdfLayout, notes: ExportAssembly['notes']) {
  addSectionTitle(layout, tr(layout.language, 'reports.app.sections.notesAndVoiceProof'), notes.length ? undefined : tr(layout.language, 'reports.app.missing.noMatchingVoiceNotes'));
  notes.slice(0, 24).forEach((note) => {
    ensurePageSpace(layout, 24);
    layout.doc.setFont('helvetica', 'bold');
    layout.doc.setFontSize(9);
    layout.doc.setTextColor(15, 23, 42);
    layout.doc.text(`${note.category} - ${fmt(layout.language, note.timestamp, 'MMM d, h:mm a')}`, layout.margin, layout.y);
    layout.y += 6;
    addParagraph(layout, note.summary || note.transcribedText || tr(layout.language, 'reports.app.missing.noTranscript'));
  });
}

function addManifest(layout: PdfLayout, manifest?: ExportIntegrityManifest | null) {
  addSectionTitle(layout, tr(layout.language, 'reports.proofIntegrityManifest'));
  if (!manifest) {
    addParagraph(layout, tr(layout.language, 'reports.app.missing.noManifest'));
    return;
  }
  addKeyValueBlock(layout, [
    [tr(layout.language, 'reports.manifestId'), manifest.manifestId],
    [tr(layout.language, 'reports.proofObjects'), manifest.proofCount],
    [tr(layout.language, 'reports.mediaAssets'), manifest.mediaCount],
    [tr(layout.language, 'reports.manifestHash'), manifest.manifestHash.slice(0, 32)],
  ]);
}

function addSignature(layout: PdfLayout, signatureDataUrl?: string) {
  addSectionTitle(layout, tr(layout.language, 'reports.app.sections.acknowledgement'));
  ensurePageSpace(layout, 70);
  layout.doc.setFont('helvetica', 'normal');
  layout.doc.setFontSize(10);
  layout.doc.setTextColor(30, 41, 59);
  layout.doc.text(tr(layout.language, 'reports.app.signatureReview'), layout.margin, layout.y);
  layout.y += 12;
  if (signatureDataUrl) {
    try {
      layout.doc.addImage(signatureDataUrl, 'PNG', layout.margin, layout.y, 120, 42);
    } catch {
      layout.doc.rect(layout.margin, layout.y, 150, 36);
    }
    layout.y += 46;
  } else {
    layout.doc.setFont('helvetica', 'bold');
    layout.doc.text(tr(layout.language, 'signature.customerNotDocumented'), layout.margin, layout.y);
    layout.y += 12;
  }
  layout.doc.text(`${tr(layout.language, 'reports.date')}: ${fmt(layout.language, Date.now(), 'PP')}`, layout.margin, layout.y);
  layout.y += 10;
}

function addReportCover(layout: PdfLayout, assembly: ExportAssembly) {
  addHeader(layout);
  layout.y = 72;
  layout.doc.setFont('helvetica', 'bold');
  layout.doc.setFontSize(24);
  layout.doc.setTextColor(15, 23, 42);
  layout.doc.text(reportTitle(layout).toUpperCase(), layout.margin, layout.y);
  layout.y += 11;
  addParagraph(layout, reportPurpose(layout));
  addKeyValueBlock(layout, [
    [tr(layout.language, 'reports.customer'), assembly.legacyJob.customerName],
    [tr(layout.language, 'reports.app.labels.jobsite'), assembly.legacyJob.address],
    [tr(layout.language, 'reports.app.labels.jobType'), assembly.legacyJob.jobType],
    [tr(layout.language, 'reports.app.labels.generated'), fmt(layout.language, Date.now(), 'PP p')],
    [tr(layout.language, 'reports.app.labels.proofItems'), assembly.selectedProofIds.length],
  ]);
}

function addSummary(layout: PdfLayout, context: ReportRenderContext) {
  const { assembly, narrative } = context;
  addSectionTitle(layout, tr(layout.language, 'reports.app.sections.summary'));
  addParagraph(layout, narrative.executiveSummary);
  addKeyValueBlock(layout, [
    [tr(layout.language, 'reports.app.labels.workCompleted'), narrative.workCompleted],
    [tr(layout.language, 'reports.app.labels.issuesExceptions'), narrative.issuesOrExceptions],
    [tr(layout.language, 'reports.app.labels.nextSteps'), narrative.nextSteps],
  ]);
}

function addBidSummary(layout: PdfLayout, context: ReportRenderContext) {
  const bid = context.assembly.bid;
  addSectionTitle(layout, tr(layout.language, 'reports.app.sections.bidSummary'));
  if (!bid) {
    addParagraph(layout, tr(layout.language, 'reports.app.missing.notRecorded'));
    return;
  }

  const internal = context.definition.type === SiteProofReportType.INTERNAL_BID_REPORT;
  addKeyValueBlock(layout, [
    [tr(layout.language, 'reports.app.labels.scopeSummary'), bid.scopeSummary],
    [tr(layout.language, 'reports.app.labels.customerSummary'), bid.customerSummary],
    ...(internal ? [[tr(layout.language, 'reports.app.labels.internalNotes'), bid.internalNotes] as [string, string | number | undefined | null]] : []),
    [tr(layout.language, 'reports.app.labels.finalEstimate'), bid.finalEstimateText ?? (bid.estimatedTotal ? `$${bid.estimatedTotal.toLocaleString()}` : undefined)],
    [tr(layout.language, 'reports.app.labels.paymentTerms'), bid.paymentTerms],
    [tr(layout.language, 'reports.app.labels.estimateExpiration'), bid.estimateExpiresAt],
    [tr(layout.language, 'reports.app.labels.assumptions'), bid.assumptions.join('\n')],
    [tr(layout.language, 'reports.app.labels.exclusions'), bid.exclusions.join('\n')],
  ]);

  const metrics = bid.metrics.length ? bid.metrics : [];
  addKeyValueBlock(layout, metrics.length
    ? metrics.map((metric) => [
      `${metric.label}${internal && metric.visibility !== 'customer' ? ` (${metric.visibility})` : ''}`,
      [metric.value, metric.unit].filter(Boolean).join(' '),
    ])
    : [[tr(layout.language, 'reports.app.labels.metrics'), tr(layout.language, 'reports.app.missing.notRecorded')]]);
}

function renderSections(layout: PdfLayout, context: ReportRenderContext, sections: ReportSection[]) {
  const { assembly, integrityManifest, signatureDataUrl } = context;
  const completedStages = assembly.stages.filter((stage) => stage.status === 'complete').length;
  sections.forEach((section) => {
    if (section === 'cover') addReportCover(layout, assembly);
    if (section === 'summary') addSummary(layout, context);
    if (section === 'daily_work') addKeyValueBlock(layout, [[tr(layout.language, 'reports.app.labels.dailyProofItems'), assembly.selectedProofIds.length], [tr(layout.language, 'reports.app.labels.latestActivity'), fmt(layout.language, assembly.proofBundles.at(-1)?.proof.captured_at, 'PP p')]]);
    if (section === 'checklist') addKeyValueBlock(layout, [[tr(layout.language, 'reports.app.labels.openRequiredItems'), assembly.openRequiredItems?.length ?? 0], [tr(layout.language, 'reports.app.labels.workflowStages'), assembly.stages.length]]);
    if (section === 'change_order_evidence') addKeyValueBlock(layout, [
      [tr(layout.language, 'reports.app.labels.changeOrderIssueProof'), assembly.selectedProofIds.length],
      [tr(layout.language, 'reports.app.labels.customerRequests'), assembly.notes.filter((note) => note.customerRequests?.length).length],
      [tr(layout.language, 'reports.app.labels.recommendedAction'), tr(layout.language, 'reports.app.missing.notDocumented')],
      [tr(layout.language, 'reports.app.labels.costScheduleImpact'), tr(layout.language, 'reports.app.missing.notDocumented')],
      [tr(layout.language, 'reports.app.labels.approvalStatus'), tr(layout.language, 'reports.app.missing.notDocumented')],
    ]);
    if (section === 'inspection_disclaimer') {
      addSectionTitle(layout, tr(layout.language, 'reports.app.sections.inspectionDisclaimer'));
      addParagraph(layout, tr(layout.language, 'reports.app.disclaimers.inspection'));
    }
    if (section === 'payment_note') {
      addSectionTitle(layout, tr(layout.language, 'reports.app.sections.paymentNote'));
      addParagraph(layout, tr(layout.language, 'reports.app.disclaimers.payment'));
    }
    if (section === 'bid_summary') addBidSummary(layout, context);
    if (section === 'payment_readiness') {
      addKeyValueBlock(layout, [
        [tr(layout.language, 'reports.app.labels.completionProof'), assembly.selectedProofIds.length],
        [tr(layout.language, 'reports.app.labels.checklistCompletion'), `${completedStages}/${assembly.stages.length}`],
        [tr(layout.language, 'reports.app.labels.openItems'), assembly.openRequiredItems?.length ?? 0],
        [tr(layout.language, 'reports.app.labels.invoicePaymentReference'), tr(layout.language, 'reports.app.missing.notDocumented')],
        [tr(layout.language, 'reports.app.labels.signatureIncluded'), context.definition.includeSignature ? tr(layout.language, 'common.yes') : tr(layout.language, 'common.no')],
      ]);
      addParagraph(layout, context.narrative.paymentReadinessStatement);
    }
    if (section === 'open_items') addKeyValueBlock(layout, (assembly.openRequiredItems?.length ? assembly.openRequiredItems : [tr(layout.language, 'reports.app.missing.noOpenRequiredItems')]).slice(0, 12).map((item, index) => [`${tr(layout.language, 'reports.app.labels.item')} ${index + 1}`, item]));
    if (section === 'photo_grid') addPhotoGrid(layout, assembly.photos);
    if (section === 'timeline') addTimelineRows(layout, assembly, context.definition.type === SiteProofReportType.PHOTO_PROOF_TIMELINE);
    if (section === 'voice_notes') addVoiceNotes(layout, assembly.notes);
    if (section === 'integrity_manifest') addManifest(layout, integrityManifest);
    if (section === 'signature') addSignature(layout, signatureDataUrl);
  });
}

export function renderCustomerCompletionSections(layout: PdfLayout, context: ReportRenderContext) {
  renderSections(layout, context, ['cover', 'summary', 'photo_grid', 'voice_notes', 'timeline', 'signature']);
}

export function renderDailyJobProofSections(layout: PdfLayout, context: ReportRenderContext) {
  renderSections(layout, context, ['cover', 'summary', 'daily_work', 'photo_grid', 'voice_notes', 'timeline', 'integrity_manifest']);
}

export function renderInspectionReadinessSections(layout: PdfLayout, context: ReportRenderContext) {
  renderSections(layout, context, ['cover', 'summary', 'inspection_disclaimer', 'checklist', 'open_items', 'photo_grid', 'timeline', 'integrity_manifest']);
}

export function renderChangeOrderEvidenceSections(layout: PdfLayout, context: ReportRenderContext) {
  renderSections(layout, context, ['cover', 'summary', 'change_order_evidence', 'photo_grid', 'voice_notes', 'timeline', 'integrity_manifest']);
}

export function renderPhotoProofTimelineSections(layout: PdfLayout, context: ReportRenderContext) {
  renderSections(layout, context, ['cover', 'timeline', 'summary', 'photo_grid', 'integrity_manifest']);
}

export function renderPaymentFinalHandoffSections(layout: PdfLayout, context: ReportRenderContext) {
  renderSections(layout, context, ['cover', 'summary', 'payment_note', 'payment_readiness', 'open_items', 'photo_grid', 'voice_notes', 'signature']);
}

export function renderAppReportIntoDocument(doc: jsPDF, context: ReportRenderContext, startOnNewPage = false) {
  if (startOnNewPage) {
    doc.addPage();
  }
  const layout: PdfLayout = {
    doc,
    margin: 22,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    y: 20,
    language: context.language,
    business: context.business,
    user: context.user,
    definition: context.definition,
  };

  switch (context.definition.type) {
    case SiteProofReportType.CUSTOMER_COMPLETION:
      renderCustomerCompletionSections(layout, context);
      break;
    case SiteProofReportType.DAILY_JOB_PROOF:
      renderDailyJobProofSections(layout, context);
      break;
    case SiteProofReportType.INSPECTION_READINESS:
      renderInspectionReadinessSections(layout, context);
      break;
    case SiteProofReportType.CHANGE_ORDER_EVIDENCE:
      renderChangeOrderEvidenceSections(layout, context);
      break;
    case SiteProofReportType.PHOTO_PROOF_TIMELINE:
      renderPhotoProofTimelineSections(layout, context);
      break;
    case SiteProofReportType.PAYMENT_FINAL_HANDOFF:
      renderPaymentFinalHandoffSections(layout, context);
      break;
    case SiteProofReportType.OFFICE_INTERNAL_RECORD:
      renderDailyJobProofSections(layout, context);
      break;
    case SiteProofReportType.INTERNAL_BID_REPORT:
    case SiteProofReportType.CUSTOMER_BID_REPORT:
      renderSections(layout, context, context.definition.sections);
      break;
    default:
      renderDailyJobProofSections(layout, context);
      break;
  }
}

export function addAppReportFooters(doc: jsPDF, context: ReportRenderContext) {
  const layout: PdfLayout = {
    doc,
    margin: 22,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    y: 20,
    language: context.language,
    business: context.business,
    user: context.user,
    definition: context.definition,
  };
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    addFooter(layout, page, totalPages);
  }
}

export function renderAppReportPdf(context: ReportRenderContext): jsPDF {
  const doc = new jsPDF({ compress: true });
  renderAppReportIntoDocument(doc, context);
  addAppReportFooters(doc, context);
  return doc;
}
