# SiteProof AI Improvement System — Codex/Cursor One-Shot Handoff

## Purpose

This file is the implementation handoff for Codex/Cursor to run the SiteProof AI Improvement System as a complete pre-implementation, implementation, review, and verification pass.

The goal is to convert the current SiteProof app into one unified bilingual offline-first product:

> SiteProof is one bilingual offline jobsite documentation app. Users can choose English or Spanish UI, capture job data in English or Spanish, export reports in English or Spanish, and optionally enable Cloudflare-backed storage/sync as an upsell. Core proof-of-work functionality must work without internet.

Do not treat this as a pricing, funnel, or marketing implementation. Ignore offer numbers. Implement only base product functionality, architecture, and safe upsell surfaces.

---

## Operating Rule

Before writing code, run the SiteProof AI Improvement System review layer against this handoff.

The system must review for:

- architecture integrity
- offline-first correctness
- bilingual workflow consistency
- export quality
- storage/data model safety
- field workflow simplicity
- test coverage gaps
- regression risk
- implementation sequencing

If the current repository already has AI improvement scripts, use them. If not, create a minimal internal review note before implementation and save it under `docs/ai/`.

Expected behavior:

1. Inspect current repo structure.
2. Locate existing app state, settings, storage/repository, export, voice note, media, and sync-related code.
3. Create or update the architecture cleanly.
4. Keep the app simple for field contractors.
5. Verify with lint, tests, type checks, and build checks.
6. Produce a final implementation report.

---

## Non-Negotiable Product Direction

### Core Product

SiteProof must work offline for core job documentation.

Core offline functionality includes:

- job creation
- customer/address/job status fields
- photo capture and organization
- GPS/timestamp metadata where available
- voice/text notes
- proof timeline/events
- local storage
- report/PDF export
- English/Spanish UI
- English/Spanish capture metadata
- English/Spanish export output
- Storm Mode / offline status indicator

### Optional Upsell

Cloudflare storage/sync is optional and must not block core workflows.

Cloud features may be implemented as feature-gated or placeholder-ready functionality:

- Cloudflare Worker API client boundary
- R2 object storage design for photos/reports
- D1 metadata/sync state design
- local sync queue
- sync status UI: off, pending, syncing, synced, error
- settings toggle and upsell card

Cloud must not be required for taking photos, adding notes, creating jobs, or exporting reports.

---

## Main Feature Requirement: Three Independent Language Layers

Do not implement one global language setting only. SiteProof needs three separate but related language controls.

### 1. UI Language

Controls app interface text.

Allowed values:

```ts
export type SiteProofLanguage = 'en' | 'es';
```

Setting:

```ts
uiLanguage: SiteProofLanguage;
```

Must affect:

- navigation labels
- buttons
- settings
- empty states
- alerts
- onboarding
- cloud upsell copy
- referral copy if referral UI exists
- report language toggle labels

Default recommendation:

- Use browser/device language if available.
- If browser language starts with `es`, default to Spanish.
- Otherwise default to English.
- Allow user override.
- Persist locally.

### 2. Capture Language

Controls the language used for field input, especially voice notes.

Setting:

```ts
captureLanguage: SiteProofLanguage;
```

Must affect:

- speech recognition language if supported
- voice note metadata
- extraction rules
- summary labels
- note prompts

Expected mapping:

```ts
const speechLocale = captureLanguage === 'es' ? 'es-PR' : 'en-US';
```

If browser speech recognition is not available, degrade gracefully to manual text note input. Never block the job workflow.

### 3. Export Language

Controls final report output.

Setting:

```ts
exportLanguage: SiteProofLanguage;
```

Must affect:

- PDF/report title
- section headings
- labels
- field names
- customer/inspector wording
- generated report filename suffix
- export packet metadata

Default recommendation:

- For Spanish-speaking crews working in the U.S., UI may be Spanish while export defaults to English.
- Preserve user override.

---

## Required Settings Model

Create or update a central settings model/service.

Suggested type:

```ts
export type SiteProofLanguage = 'en' | 'es';

export type CloudSyncStatus = 'off' | 'pending' | 'syncing' | 'synced' | 'error';

export type SiteProofSettings = {
  uiLanguage: SiteProofLanguage;
  captureLanguage: SiteProofLanguage;
  exportLanguage: SiteProofLanguage;
  cloudEnabled: boolean;
  cloudSyncStatus: CloudSyncStatus;
  stormModeEnabled: boolean;
};
```

Requirements:

- Persist settings locally.
- Use a single source of truth.
- Provide safe defaults.
- Avoid scattering language state across components.
- Provide hooks/utilities for React components.

Suggested files, adapt to repo conventions:

```txt
src/config/i18n.ts
src/contexts/SettingsContext.tsx
src/services/settingsService.ts
src/types/settings.ts
```

---

## Required Bilingual Copy System

Create a durable i18n dictionary. Avoid hardcoded English-only strings in new/modified UI.

Minimum dictionary groups:

```ts
common
navigation
jobs
capture
voice
reports
settings
cloud
offline
errors
```

Required brand copy:

Spanish:

```txt
Documenta el trabajo. Protege tu empresa. Cobra más rápido.
```

English:

```txt
Document the job. Protect your company. Get paid faster.
```

Required report language labels:

Spanish UI:

```txt
Idioma del reporte
Reporte en Español
Reporte en Inglés
Para clientes, inspectores, seguros y oficina
```

English UI:

```txt
Report Language
Spanish Report
English Report
For customers, inspectors, insurance, and office use
```

---

## Required Data Model Updates

Inspect the current repo and adapt these fields to existing models.

### Job

```ts
type Job = {
  id: string;
  customerName?: string;
  address?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  uiLanguageAtCreation?: SiteProofLanguage;
  defaultCaptureLanguage?: SiteProofLanguage;
  defaultExportLanguage?: SiteProofLanguage;
};
```

### VoiceNote / TextNote

```ts
type VoiceNote = {
  id: string;
  jobId: string;
  language: SiteProofLanguage;
  transcriptOriginal: string;
  summaryOriginal?: string;
  extractedMaterials?: string[];
  extractedIssues?: string[];
  extractedCustomerRequests?: string[];
  extractedChangeOrderCandidates?: string[];
  createdAt: string;
  syncState?: SyncState;
};
```

### MediaAsset / Photo

```ts
type MediaAsset = {
  id: string;
  jobId: string;
  uri: string;
  mediaType: 'photo' | 'video' | 'audio' | 'document';
  capturedAt: string;
  latitude?: number;
  longitude?: number;
  workflowStage?: string;
  category?: string;
  caption?: string;
  language?: SiteProofLanguage;
  syncState?: SyncState;
  cloudObjectKey?: string;
};
```

### ExportPacket

```ts
type ExportPacket = {
  id: string;
  jobId: string;
  exportLanguage: SiteProofLanguage;
  exportType: 'customer' | 'inspection' | 'insurance' | 'internal';
  createdAt: string;
  localFileUri?: string;
  cloudObjectKey?: string;
  syncState?: SyncState;
};
```

### SyncState

```ts
type SyncState = 'local_only' | 'queued' | 'syncing' | 'synced' | 'error';
```

---

## Required UI Components

Create or update components consistent with existing styling.

### Language Settings Panel

Must allow user to set:

- UI language
- capture language
- export/report language

Suggested component:

```txt
src/components/settings/LanguageSettingsPanel.tsx
```

### Report Language Toggle

Must be visible near report generation/export action.

Suggested component:

```txt
src/components/reports/ReportLanguageToggle.tsx
```

Behavior:

- Toggle English / Spanish.
- Store setting.
- Pass selected language into export service.
- Make it clear that report language is independent from UI language.

### Offline / Storm Mode Indicator

Required:

- show when offline
- show when core functionality remains available
- show cloud sync pending status if cloud is enabled but unavailable

Suggested copy:

English:

```txt
Storm Mode: Fully operational without internet.
```

Spanish:

```txt
Modo Tormenta: Funciona sin internet.
```

### Cloud Upsell / Cloud Settings Card

Functional only. Ignore pricing.

Must show:

- Cloud backup is optional
- Core app works offline without cloud
- Cloud backs up jobs/photos/reports
- Cloud sync status
- Enable/disable cloud setting or placeholder call-to-action

Suggested files:

```txt
src/components/cloud/CloudUpsellCard.tsx
src/services/cloudSyncService.ts
src/services/cloudflareClient.ts
```

---

## Required Voice / Note Functionality

Implement or harden voice capture as best supported by current platform.

Minimum:

- Capture language selector controls recognition locale.
- Voice note stores original language.
- If speech recognition unavailable, provide manual text note fallback.
- Extract structured data using local rules.
- Do not require cloud AI.

Required local extraction categories:

- materials
- issues
- customer requests
- change order candidates

Include English and Spanish keyword rules.

Examples:

```ts
const extractionKeywords = {
  en: {
    materials: ['material', 'wire', 'conduit', 'panel', 'breaker', 'fuel line'],
    issues: ['issue', 'problem', 'missing', 'damaged', 'failed', 'blocked'],
    customerRequests: ['customer requested', 'client asked', 'owner asked'],
    changeOrders: ['extra', 'change order', 'additional', 'unexpected', 'upgrade'],
  },
  es: {
    materials: ['material', 'cable', 'conduit', 'panel', 'breaker', 'línea de gas', 'linea de gas'],
    issues: ['problema', 'falta', 'dañado', 'danado', 'falló', 'fallo', 'bloqueado'],
    customerRequests: ['cliente pidió', 'cliente pidio', 'dueño pidió', 'dueno pidio'],
    changeOrders: ['extra', 'orden de cambio', 'adicional', 'inesperado', 'mejora'],
  },
};
```

---

## Required Export / PDF Functionality

Reports are a core product feature. Do not treat export as an afterthought.

Minimum report modes for this pass:

- Customer packet
- Inspection packet
- Internal packet

If existing export engine only supports one report, refactor enough to pass export language into that report without overbuilding.

Export must include:

- SiteProof branding
- job information
- customer/address
- date/time
- photo evidence section
- voice/text notes section
- materials/issues/change-order candidates if available
- footer
- export language metadata

Required English labels:

```txt
SiteProof Jobsite Proof Report
Professional Jobsite Documentation
Customer
Address
Date
Photo Evidence
Voice Notes
Materials
Issues
Customer Requests
Change Order Candidates
Generated by SiteProof
```

Required Spanish labels:

```txt
Reporte de Prueba de Obra SiteProof
Documentación Profesional de Obra
Cliente
Dirección
Fecha
Evidencia Fotográfica
Notas de Voz
Materiales
Problemas
Solicitudes del Cliente
Posibles Órdenes de Cambio
Generado por SiteProof
```

File naming:

```txt
siteproof-{jobNameOrId}-{exportLanguage}-{timestamp}.pdf
```

---

## Required Cloudflare Storage Upsell Foundation

Do not fully block this pass on production Cloudflare credentials.

Implement a clean boundary so future Cloudflare storage can be plugged in.

Required interfaces:

```ts
type CloudUploadRequest = {
  localId: string;
  jobId: string;
  objectType: 'photo' | 'report' | 'voice_note' | 'metadata';
  localUri?: string;
  payload?: unknown;
  contentType?: string;
};

type CloudUploadResult = {
  success: boolean;
  cloudObjectKey?: string;
  error?: string;
};
```

Service responsibilities:

- no-op if cloud disabled
- queue upload if offline
- attempt upload if online and configured
- mark sync state
- expose sync status to UI

Suggested architecture:

```txt
Frontend app
  -> cloudSyncService
  -> cloudflareClient
  -> Cloudflare Worker API later
  -> R2 for binary objects
  -> D1 for metadata
```

Do not expose secrets in frontend.

---

## Required AI Improvement Review Deliverables

Create a final report file after implementation.

Suggested file:

```txt
SITEPROOF_AI_IMPROVEMENT_BILINGUAL_OFFLINE_CLOUD_HANDOFF_REPORT.md
```

Report must include:

1. Summary of implementation
2. Files changed
3. Architecture decisions
4. Offline-first verification
5. Bilingual verification
6. Export verification
7. Cloud upsell boundary verification
8. Tests added/updated
9. Commands run
10. Known limitations / follow-up items

---

## Required Tests

Add or update tests where the project structure supports it.

Minimum test coverage:

### Settings

- defaults are generated correctly
- settings persist locally
- UI/capture/export languages can be changed independently

### i18n

- English keys resolve
- Spanish keys resolve
- missing keys fall back safely

### Voice extraction

- English materials/issues/change-order extraction
- Spanish materials/issues/change-order extraction

### Export

- English report contains English headings
- Spanish report contains Spanish headings
- export metadata includes selected export language

### Cloud sync boundary

- cloud disabled = no upload attempted
- offline = queued
- online placeholder/client failure = error state handled gracefully

---

## Required Verification Commands

Run the repo-appropriate commands. Use what exists in `package.json`.

Attempt, in order where available:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
npm run ai:check
npm run quality:check
```

If a command does not exist, note it in the final report. Do not invent passing results.

---

## Implementation Boundaries

Do not implement these unless they already exist and only need small integration:

- full Stripe production payment flow
- full license backend
- full customer portal
- full team chat
- full CRM
- full analytics dashboard
- complex AI agents
- production Cloudflare R2 upload requiring real credentials
- pricing/offer copy changes

This pass is about base app functionality, not monetization finalization.

---

## Acceptance Criteria

The job is complete only when:

- User can choose English or Spanish UI.
- User can choose English or Spanish capture language.
- User can choose English or Spanish export language independently.
- Job, note, media, and export data store relevant language metadata.
- Voice/manual notes work without cloud dependency.
- Rule-based extraction supports English and Spanish.
- Reports export with English or Spanish labels based on export language.
- Offline/Storm Mode behavior is visible and non-blocking.
- Cloudflare storage exists as optional settings/service boundary and does not break offline core.
- Tests or verification coverage are added for the above.
- Final implementation report is created.

---

## Final Instruction to Codex/Cursor

Run this as one complete SiteProof AI Improvement System job.

Do not ask for product clarification unless the repository makes a requirement impossible. Make reasonable implementation decisions consistent with this handoff and document them.

Preserve the core SiteProof principle:

> Document the job. Protect the company. Get paid faster.

And the Spanish-first field principle:

> Documenta el trabajo. Protege tu empresa. Cobra más rápido.
