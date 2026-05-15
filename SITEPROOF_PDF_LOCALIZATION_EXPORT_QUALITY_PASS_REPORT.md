# SiteProof PDF Localization + Export Quality Pass Report

## Outcome

The PDF/export path now consistently uses `exportLanguage` for customer-facing report output while preserving offline-first behavior.

## Hardened in this pass

- Localized remaining PDF/report prose in `pdfService.ts`, including:
  - header/footer labels
  - page labels
  - export source line
  - AI intelligence heading
  - GPS/photo fallback copy
  - timeline labels
  - proof integrity manifest labels and note
  - acceptance/signature text
  - QR verification prompt
- Localized deterministic local summaries so offline PDF generation can remain language-correct without requiring a network call.
- Localized footer/customer-packet intro strings through the existing translation system.
- Made canonical export assembly language-aware so requirement labels used in exported categories come from localized template data.
- Preserved export-language handling in the compatibility export path.
- Continued using localized template-authored content with English fallback for PDF checklist output.
- Added localized date formatting based on `exportLanguage`.

## Confirmed boundaries

- `uiLanguage` does not drive PDF text.
- `captureLanguage` does not drive PDF text except as source-note metadata when shown.
- PDF generation still works from local code/data with no translation API, Google dependency, Cloudflare dependency, or online font dependency added.
- No pricing, plan, offer, checkout, or monetization logic was changed.

## Validation

- `npm install`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run ai:check`
- `npm run quality:check`
