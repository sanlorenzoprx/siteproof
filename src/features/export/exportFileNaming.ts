import { format } from 'date-fns';
import { Job } from '../../types';
import { ReportMode } from '../../services/pdfService';

function safePart(value?: string | null): string {
  return (value || 'Job')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'Job';
}

export function packetLabel(mode: ReportMode): string {
  switch (mode) {
    case ReportMode.CUSTOMER:
      return 'CustomerPacket';
    case ReportMode.INSPECTOR:
      return 'InspectorPacket';
    case ReportMode.WARRANTY:
      return 'WarrantyPacket';
    case ReportMode.DISPUTE:
      return 'DisputePacket';
    case ReportMode.HANDOFF:
      return 'HandoffPacket';
    default:
      return 'InternalRecord';
  }
}

export function packetTitle(mode: ReportMode): string {
  switch (mode) {
    case ReportMode.CUSTOMER:
      return 'Customer Completion Packet';
    case ReportMode.INSPECTOR:
      return 'Inspector Proof Packet';
    case ReportMode.WARRANTY:
      return 'Warranty Documentation Packet';
    case ReportMode.DISPUTE:
      return 'Dispute / Change Order Packet';
    case ReportMode.HANDOFF:
      return 'Crew Handoff Packet';
    default:
      return 'Internal Job Record';
  }
}

export function buildExportFileName(job: Job, mode: ReportMode): string {
  const date = format(Date.now(), 'yyyy-MM-dd');
  const customer = safePart(job.customerName);
  const zip = job.address.match(/\b\d{5}(?:-\d{4})?\b/)?.[0];
  const zipPart = mode === ReportMode.INSPECTOR && zip ? `_${zip}` : '';
  return `${packetLabel(mode)}_${customer}${zipPart}_${date}.pdf`;
}
