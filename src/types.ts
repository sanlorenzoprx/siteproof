export type JobStatus = 'INCOMING' | 'ACTIVE' | 'WAITING' | 'INSPECTION' | 'COMPLETED' | 'ARCHIVED';
export type SyncStatus = 'PENDING' | 'SYNCED' | 'ERROR';
export type JobMode = 'bid' | 'approved';

export interface Job {
  id: string;
  mode?: JobMode;
  customerName: string;
  address: string;
  jobType: string;
  templateId?: string;
  trade?: string;
  specialty?: string;
  tradePackId?: string;
  createdAt: number;
  updatedAt: number;
  scheduledDate?: number;
  technicianName?: string;
  technicianRole?: string;
  quotedAmount?: number;
  status: JobStatus;
  syncStatus?: SyncStatus;
  notes: string;
  uiLanguageAtCreation?: 'en' | 'es';
  defaultCaptureLanguage?: 'en' | 'es';
  defaultExportLanguage?: 'en' | 'es';
  bidMetrics?: BidMetric[];
  bidAssumptions?: string;
  bidExclusions?: string;
  bidInternalNotes?: string;
  bidCustomerNotes?: string;
  bidScopeSummary?: string;
  bidPaymentTerms?: string;
  bidEstimateExpiresAt?: string;
  bidFinalEstimateText?: string;
  bidEstimateApprovedForCustomer?: boolean;
}

export type BidVisibility = 'internal' | 'customer' | 'hidden';

export interface BidMetric {
  metricId: string;
  label: string;
  value?: string;
  unit?: string;
  type: 'text' | 'number' | 'yes-no' | 'select' | 'photo-required' | 'document-required';
  visibility: BidVisibility;
  required: boolean;
  exportSection?: string;
}

export interface BidRecord {
  bidId: string;
  jobId: string;
  privacy: 'internal_only' | 'customer_export_ready';
  scopeSummary: string;
  internalNotes: string;
  customerSummary: string;
  metrics: BidMetric[];
  assumptions: string[];
  exclusions: string[];
  estimatedTotal?: number | null;
  paymentTerms?: string | null;
  estimateExpiresAt?: string | null;
  finalEstimateText?: string | null;
}

export interface CustodyLogEntry {
  at: string;
  actor?: string | null;
  action: 'captured' | 'hashed' | 'verified' | 'modified' | 'exported' | 'synced' | 'viewed';
  note?: string | null;
}

export interface JobPhoto {
  id: string;
  jobId: string;
  blob?: Blob;
  compressedBlob?: Blob;
  dataUrl?: string; // Preview/watermarked image data URL
  thumbnailDataUrl?: string;
  width?: number;
  height?: number;
  originalSize?: number;
  compressedSize?: number;
  compressionState?: 'not_needed' | 'pending' | 'compressing' | 'compressed' | 'failed';
  thumbnailState?: 'pending' | 'generated' | 'failed';
  qualityScore?: number;
  category: string;
  requirementId?: string;
  stageId?: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isIssue?: boolean;
  issueType?: 'SAFETY' | 'DEFICIENCY' | 'CHANGE_ORDER' | 'BLOCKED';
  syncStatus?: SyncStatus;
  proofHash?: string;
  proofHashAlgorithm?: 'SHA-256';
  integrityStatus?: 'verified' | 'modified' | 'missing_hash' | 'unavailable';
  integrityStampedAt?: string;
  custodyLog?: CustodyLogEntry[];
  language?: 'en' | 'es';
  cloudObjectKey?: string;
}

export interface JobVideo {
  id: string;
  jobId: string;
  blob: Blob;
  localUrl?: string;
  thumbnailDataUrl?: string;
  thumbnailBlob?: Blob;
  durationMs: number;
  mimeType: 'video/webm' | 'video/mp4' | string;
  fileSize: number;
  category: string;
  requirementId?: string;
  stageId?: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
  notes?: string;
  syncStatus?: SyncStatus;
  proofHash?: string;
  proofHashAlgorithm?: 'SHA-256';
  integrityStatus?: 'verified' | 'modified' | 'missing_hash' | 'unavailable';
  integrityStampedAt?: string;
  custodyLog?: CustodyLogEntry[];
  language?: 'en' | 'es';
  cloudObjectKey?: string;
  thumbnailCloudObjectKey?: string;
  cloudSyncState?: 'local_only' | 'queued' | 'syncing' | 'synced' | 'error';
}

export interface VoiceNote {
  id: string;
  jobId: string;
  audioBlob?: Blob;
  audioUrl?: string; // Kept for preview
  durationMs?: number;
  fileSize?: number;
  transcribedText: string;
  summary?: string;
  language?: 'en' | 'es' | 'unknown';
  transcriptOriginal?: string;
  summaryOriginal?: string;
  extractedTasks?: string[];
  materialMentions?: string[];
  issueMentions?: string[];
  customerRequests?: string[];
  changeOrderCandidates?: string[];
  aiConfidence?: number;
  aiStatus?: 'local' | 'cloud' | 'unavailable';
  timestamp: number;
  category: string;
  requirementId?: string;
  stageId?: string;
  isIssue?: boolean;
  isChangeOrder?: boolean;
  syncStatus?: SyncStatus;
  proofHash?: string;
  proofHashAlgorithm?: 'SHA-256';
  integrityStatus?: 'verified' | 'modified' | 'missing_hash' | 'unavailable';
  integrityStampedAt?: string;
  custodyLog?: CustodyLogEntry[];
}

export interface SyncState {
  lastSyncTime: number | null;
  lastError: string | null;
  pendingCount: number;
  isSyncing: boolean;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  employeeId?: string;
}

export interface BusinessProfile {
  companyName: string;
  tagline?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  linkedIn?: string;
  businessBio?: string;
  licenseNumber: string;
  regulatoryInfo?: string;
  logoUrl?: string;
  adminPin?: string;
}

export interface License {
  id: string;
  installedAt: number;
  licenseKey: string | null;
  isActivated: boolean;
  expiresAt: number | null;
}
