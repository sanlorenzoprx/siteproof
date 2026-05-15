# CODEX / CURSOR HANDOFF — SiteProof Spanish Coverage Completion Pass

## Purpose
Complete the second implementation pass for SiteProof bilingual readiness. The previous pass correctly added the bilingual architecture, independent settings, export-language support, bilingual extraction, and optional Cloudflare boundary. This pass must finish the remaining legacy UI Spanish coverage and prove completion with automated checks.

This is not an exploration task. This is a completion task.

## Current Branch
Work on the existing branch:

```bash
git checkout siteproof-ai-improvement-bilingual-core
```

Do not create a new repository.
Do not change pricing strategy.
Do not add unrelated product features.
Do not overbuild CRM, dashboards, customer portals, team chat, or collaboration.

## Source of Truth
Use these files as context:

- `CODEX_CURSOR_SITEPROOF_AI_IMPROVEMENT_HANDOFF.md`
- `SITEPROOF_AI_IMPROVEMENT_BILINGUAL_OFFLINE_CLOUD_HANDOFF_REPORT.md`
- `src/config/i18n.ts`
- `src/contexts/SettingsContext.tsx`
- Existing tests, especially `src/bilingualCore.test.ts`

## Completion Standard
The task is not complete merely because tests pass.

The task is complete only when one of these is true:

1. All user-facing legacy UI strings in active app surfaces are routed through the i18n/settings system or intentionally documented as exempt.
2. A specific blocker prevents completion, and the blocker is documented with file path, reason, and recommended next action.

Do not stop after a safe first pass if additional reachable user-facing English strings remain.

## Required Work

### 1. Inventory remaining user-facing English strings
Search the active app source for hardcoded English strings in:

- `src/components/**`
- `src/features/**`
- `src/services/**` only where strings are user-visible
- `src/pages/**` if present
- `src/App.tsx` if present
- `src/main.tsx`

Focus on strings visible to users in buttons, labels, panels, banners, modals, export screens, alerts, empty states, onboarding, settings, job detail, capture, voice, report, cloud, offline, and error states.

Ignore or document exemptions for:

- Developer logs
- Test-only strings
- Internal enum values
- Database keys
- CSS class names
- File paths
- Non-user-facing constants
- Third-party library strings that are not practical to translate

### 2. Expand `src/config/i18n.ts`
Add missing English and Spanish translation keys for all active user-facing surfaces.

Spanish should be natural contractor Spanish, not overly formal machine translation. Prefer practical Puerto Rico / U.S. contractor wording where appropriate.

Examples:

- “Capture Proof” → “Capturar prueba”
- “Generate Report” → “Generar reporte”
- “Storm Mode” → “Modo tormenta”
- “Offline Ready” → “Listo sin internet”
- “Cloud Backup” → “Respaldo en la nube”
- “Voice Note” → “Nota de voz”
- “Photo Evidence” → “Evidencia fotográfica”

### 3. Route legacy surfaces through settings/i18n
Update active UI components so they use the shared language setting instead of hardcoded English.

Priority surfaces:

1. Main layout/navigation
2. Settings
3. Job list/job detail
4. Proof/photo capture
5. Voice capture/dictation
6. Offline/Storm Mode banner
7. Export/report controls
8. Cloud upsell/status boundary
9. Empty states and errors
10. Any first-run/onboarding surfaces

### 4. Preserve independent language behavior
Do not collapse the three-language model.

These must remain independent:

- `uiLanguage` controls app UI text
- `captureLanguage` controls voice/capture language and analysis locale
- `exportLanguage` controls report/export language, labels, and filenames

A Spanish UI with English export must still work.
An English UI with Spanish capture must still work.

### 5. Keep offline-first behavior intact
Do not introduce any required network dependency.
Core job creation, photo proof, notes, voice fallback, local storage, and export must remain functional offline.

Cloudflare storage remains optional, non-blocking, and behind explicit cloud-enabled state.

### 6. Add / strengthen tests
Add tests that prove:

- UI language can switch English ⇄ Spanish
- Capture language remains independent from UI language
- Export language remains independent from UI language
- Report filenames/labels follow `exportLanguage`
- Spanish translation keys exist for newly covered surfaces
- No obvious missing translation keys for active bilingual surfaces

If possible, add a lightweight static guard that catches newly introduced user-facing hardcoded English in high-priority component paths. The guard may allow documented exemptions.

### 7. Update documentation
Create or update a completion report:

`SITEPROOF_SPANISH_COVERAGE_COMPLETION_PASS_REPORT.md`

The report must include:

- Summary of files changed
- List of surfaces translated
- List of intentional exemptions, if any
- Remaining blockers, if any
- Verification commands run
- Confirmation that offline core and Cloudflare optional boundary remain intact

## Required Verification Commands
Run all available checks that exist in this repo. At minimum run:

```bash
npm install
npm run lint
npm run test
npm run build
npm run ai:check
npm run quality:check
```

If any command does not exist, document that clearly in the report and run the nearest available equivalent.

## Acceptance Criteria
This pass is accepted only if:

- The app still builds.
- Tests pass.
- Spanish coverage is expanded across all active legacy UI surfaces or documented as intentionally exempt.
- The three independent language settings still work.
- Offline core remains non-blocking.
- Cloudflare storage remains optional upsell boundary only.
- A completion report is created.

## Final Output Required From Codex/Cursor
When finished, report:

1. What changed
2. What files changed
3. What user-facing surfaces are now bilingual
4. What remains untranslated and why
5. What tests/checks were run
6. Whether the branch is ready to commit/merge

If any active user-facing English strings remain, do not simply say “tests passed.” Explain exactly why they remain.
