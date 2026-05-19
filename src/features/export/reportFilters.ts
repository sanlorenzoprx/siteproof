import type { ExportAssembly, ExportProofBundle } from './exportAssembler';
import type { ReportDefinition } from './reportDefinitions';
import { SiteProofReportType } from './reportTypes';

export interface ReportFilterOptions {
  reportDate?: Date | number | string;
  now?: Date | number | string;
}

export interface FilteredReportProofSelection {
  proofBundles: ExportProofBundle[];
  photos: ExportAssembly['photos'];
  notes: ExportAssembly['notes'];
  selectedProofIds: string[];
  openRequiredItems: string[];
  includedSections: ReportDefinition['sections'];
}

function toTime(value?: Date | number | string | null): number {
  if (!value) return Number.NaN;
  const time = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(time) ? time : Number.NaN;
}

function dateKey(value?: Date | number | string | null): string | null {
  const time = toTime(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}

function proofTime(bundle: ExportProofBundle): number {
  return toTime(bundle.proof.captured_at) || toTime(bundle.legacyPhoto?.timestamp) || toTime(bundle.legacyVoiceNote?.timestamp) || 0;
}

function allLabels(bundle: ExportProofBundle): string[] {
  return [
    bundle.proof.title,
    bundle.proof.description,
    bundle.proof.notes,
    bundle.requirementLabel,
    bundle.stageLabel,
    bundle.stage?.stage_name,
    ...bundle.proof.ai_labels,
    ...bundle.proof.user_labels,
    ...bundle.proof.inspection_tags,
    ...bundle.proof.permit_tags,
    ...bundle.proof.export_tags,
    ...(bundle.voiceNote?.change_order_candidates ?? []),
    ...(bundle.voiceNote?.issue_mentions ?? []),
    ...(bundle.voiceNote?.customer_requests ?? []),
    ...(bundle.legacyVoiceNote?.changeOrderCandidates ?? []),
    ...(bundle.legacyVoiceNote?.issueMentions ?? []),
    ...(bundle.legacyVoiceNote?.customerRequests ?? []),
  ]
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .map((item) => item.toLowerCase());
}

function hasAny(bundle: ExportProofBundle, terms: string[]): boolean {
  const labels = allLabels(bundle);
  const normalizedTerms = terms.map((term) => term.toLowerCase());
  return labels.some((label) => normalizedTerms.some((term) => label.includes(term)));
}

function hasExportTag(bundle: ExportProofBundle, tags: string[]): boolean {
  return tags.some((tag) => bundle.proof.export_tags.includes(tag));
}

function isIssue(bundle: ExportProofBundle): boolean {
  return bundle.proof.metadata?.is_issue === true
    || bundle.legacyPhoto?.isIssue === true
    || bundle.legacyVoiceNote?.isIssue === true
    || hasAny(bundle, ['issue', 'deficiency', 'hidden condition', 'change_order', 'change order']);
}

function isCustomerSafe(bundle: ExportProofBundle, definition: ReportDefinition): boolean {
  if (bundle.proof.metadata?.customer_safe === true || bundle.proof.metadata?.approved_for_customer === true) return true;
  if (hasExportTag(bundle, definition.proofFilterTags)) return true;
  if (!isIssue(bundle)) return true;
  return false;
}

function isCustomerCompletionRelevant(bundle: ExportProofBundle, definition: ReportDefinition): boolean {
  if (!isCustomerSafe(bundle, definition)) return false;
  return hasAny(bundle, ['final', 'completion', 'complete', 'cleanup', 'clean up', 'walkthrough', 'warranty', 'service', 'signoff', 'signature', 'customer', 'handoff', 'payment', 'installed'])
    || hasExportTag(bundle, ['customer_completion_report', 'customer_packet', 'warranty_packet'])
    || bundle.proof.proof_type === 'signature';
}

function isCustomerCompletionFallback(bundle: ExportProofBundle, definition: ReportDefinition): boolean {
  if (!isCustomerSafe(bundle, definition)) return false;
  return hasAny(bundle, ['active work', 'work complete', 'work completed', 'install', 'installed', 'equipment', 'documented proof'])
    || bundle.proof.proof_type === 'photo'
    || bundle.proof.proof_type === 'serial_number'
    || bundle.proof.proof_type === 'test_result';
}

function isInspectionRelevant(bundle: ExportProofBundle): boolean {
  return bundle.proof.required_flag
    || bundle.proof.priority === 'required'
    || hasAny(bundle, ['inspection', 'inspector', 'permit', 'install', 'installed', 'test', 'serial', 'required']);
}

function isChangeOrderRelevant(bundle: ExportProofBundle): boolean {
  return isIssue(bundle)
    || bundle.legacyVoiceNote?.isChangeOrder === true
    || Boolean(bundle.voiceNote?.change_order_candidates.length)
    || Boolean(bundle.legacyVoiceNote?.changeOrderCandidates?.length)
    || hasAny(bundle, ['hidden condition', 'customer request', 'change_order', 'change order', 'scope change', 'deficiency']);
}

function isPaymentRelevant(bundle: ExportProofBundle): boolean {
  return hasAny(bundle, ['completion', 'complete', 'final', 'handoff', 'signoff', 'signature', 'payment', 'invoice', 'walkthrough', 'warranty'])
    || hasExportTag(bundle, ['payment_final_handoff_report', 'warranty_packet'])
    || bundle.proof.proof_type === 'signature';
}

function latestProofDate(bundles: ExportProofBundle[], now: ReportFilterOptions['now']): string {
  const latest = bundles.reduce((current, bundle) => Math.max(current, proofTime(bundle)), 0);
  return dateKey(latest) ?? dateKey(now) ?? dateKey(Date.now())!;
}

function defaultDailyReportDate(bundles: ExportProofBundle[], now: ReportFilterOptions['now']): string {
  const today = dateKey(now) ?? dateKey(Date.now())!;
  return bundles.some((bundle) => dateKey(bundle.proof.captured_at) === today) ? today : latestProofDate(bundles, now);
}

function sortChronologically(bundles: ExportProofBundle[]): ExportProofBundle[] {
  return [...bundles].sort((a, b) => proofTime(a) - proofTime(b));
}

function openRequiredItems(assembly: ExportAssembly): string[] {
  return assembly.stages.flatMap((stage) => stage.missing_items ?? []);
}

function applyFallback(
  selected: ExportProofBundle[],
  candidates: ExportProofBundle[],
  definition: ReportDefinition,
): ExportProofBundle[] {
  if (selected.length > 0) return selected;
  const fallbackByTags = candidates.filter((bundle) => hasExportTag(bundle, definition.fallbackProofTags));
  return fallbackByTags.length > 0 ? fallbackByTags : candidates;
}

export function filterProofBundlesForReport(
  assembly: ExportAssembly,
  definition: ReportDefinition,
  options: ReportFilterOptions = {},
): FilteredReportProofSelection {
  const candidates = assembly.proofBundles.filter((bundle) => !bundle.proof.deleted_at);
  let selected: ExportProofBundle[];
  let useGenericFallback = true;

  switch (definition.type) {
    case SiteProofReportType.CUSTOMER_COMPLETION:
      selected = candidates.filter((bundle) => isCustomerCompletionRelevant(bundle, definition));
      if (selected.length === 0) {
        selected = [...candidates]
          .filter((bundle) => isCustomerCompletionFallback(bundle, definition))
          .sort((a, b) => proofTime(b) - proofTime(a))
          .slice(0, 1);
      }
      useGenericFallback = false;
      break;
    case SiteProofReportType.DAILY_JOB_PROOF: {
      const targetDate = dateKey(options.reportDate) ?? defaultDailyReportDate(candidates, options.now);
      selected = candidates.filter((bundle) => dateKey(bundle.proof.captured_at) === targetDate);
      break;
    }
    case SiteProofReportType.INSPECTION_READINESS:
      selected = candidates.filter(isInspectionRelevant);
      break;
    case SiteProofReportType.CHANGE_ORDER_EVIDENCE:
      selected = candidates.filter(isChangeOrderRelevant);
      break;
    case SiteProofReportType.PHOTO_PROOF_TIMELINE:
      selected = candidates;
      break;
    case SiteProofReportType.PAYMENT_FINAL_HANDOFF:
      selected = candidates.filter(isPaymentRelevant);
      break;
    default:
      selected = candidates.filter((bundle) => hasExportTag(bundle, definition.proofFilterTags));
      break;
  }

  const proofBundles = sortChronologically(useGenericFallback ? applyFallback(selected, candidates, definition) : selected);
  const selectedProofIds = proofBundles.map((bundle) => bundle.proof.proof_id);
  const selectedProofIdSet = new Set(selectedProofIds);

  return {
    proofBundles,
    photos: assembly.photos.filter((photo) => selectedProofIdSet.has(photo.id)),
    notes: assembly.notes.filter((note) => selectedProofIdSet.has(note.id)),
    selectedProofIds,
    openRequiredItems: openRequiredItems(assembly),
    includedSections: [...definition.sections],
  };
}
