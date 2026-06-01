import type { BidMetric, BidRecord, Job } from '../../domain/models';
import type { ExportProofBundle } from '../export/exportAssembler';

export type BidAudience = 'internal' | 'customer';

function splitLines(value?: string): string[] {
  return (value ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}

export function bidRecordFromJob(job: Job): BidRecord {
  return {
    bidId: `bid_${job.id}`,
    jobId: job.id,
    privacy: job.bidEstimateApprovedForCustomer ? 'customer_export_ready' : 'internal_only',
    scopeSummary: job.bidScopeSummary || job.notes || '',
    internalNotes: job.bidInternalNotes || '',
    customerSummary: job.bidCustomerNotes || '',
    metrics: job.bidMetrics ?? [],
    assumptions: splitLines(job.bidAssumptions),
    exclusions: splitLines(job.bidExclusions),
    estimatedTotal: typeof job.quotedAmount === 'number' ? job.quotedAmount : null,
    paymentTerms: job.bidPaymentTerms || undefined,
    estimateExpiresAt: job.bidEstimateExpiresAt || undefined,
    finalEstimateText: job.bidFinalEstimateText || undefined,
  };
}

export function filterBidForAudience(bid: BidRecord, audience: BidAudience): BidRecord {
  if (audience === 'internal') return { ...bid, privacy: 'internal_only', metrics: [...bid.metrics] };
  return {
    ...bid,
    privacy: 'customer_export_ready',
    internalNotes: '',
    metrics: bid.metrics.filter((metric) => metric.visibility === 'customer'),
  };
}

export function metricVisibleToCustomer(metric: BidMetric): boolean {
  return metric.visibility === 'customer';
}

export function proofBundleVisibleToBidCustomer(bundle: ExportProofBundle): boolean {
  const visibility = bundle.proof.metadata?.visibility ?? bundle.proof.metadata?.cloud_visibility;
  if (visibility === 'private' || visibility === 'internal_only' || visibility === 'hidden_do_not_export') return false;
  if (bundle.proof.export_tags.some((tag) => tag === 'internal_only' || tag === 'office_only' || tag === 'hidden_do_not_export')) return false;
  if (bundle.proof.user_labels.some((label) => label === 'internal_only' || label === 'private')) return false;
  return true;
}

export function assertCustomerBidExplicitlyApproved(job: Job): boolean {
  return job.mode === 'bid' && job.bidEstimateApprovedForCustomer === true;
}
