# SiteProof JobDetail / Settings Spanish Completion Report

## Summary

Focused migration completed for app-owned UI chrome in `JobDetail` and `Settings`. Both screens now use dedicated `jobDetail` and `settingsDetail` i18n groups for their active labels, buttons, status copy, alerts, and helper text while preserving the separate UI/capture/export language model.

## Files Changed

- `src/config/i18n.ts`
- `src/components/JobDetail.tsx`
- `src/components/Settings.tsx`
- `src/bilingualCore.test.ts`

## Migrated Surfaces

- Job detail header status/actions
- Detail tabs, gallery, notes, export area, packet history
- Sidebar summaries, offline-proof message, fast actions, closeout state
- Workflow stage chrome such as action labels, priority badges, checklist labels
- Settings identity/profile labels, cloud configuration labels, speech section, and offline/archive indicators

## Exact Exemptions

1. **Template-authored workflow content** in `JobDetail`
   - `stage.display_name`, `stage.description`, `requirement.display_name`, `requirement.field_instruction`, and checklist item text are template data, not hardcoded component UI strings.
   - Reason: translating template content safely requires bilingual template data, not component-level string substitution.
   - Recommended next action: add localized template fields in workflow template schema.
2. **Literal example URL placeholders** in `Settings`
   - `www.yourcompany.com`, `linkedin.com/company/...`, and `https://siteproof-api.workers.dev`
   - Reason: these are functional URL examples rather than English prose; translating them would reduce clarity.

## Tests Strengthened

- Added a static regression guard preventing selected hardcoded English labels from returning in `JobDetail` and `Settings`.

## Verification

- `npm install` ✅
- `npm run lint` ✅
- `npm run test` ✅
- `npm run build` ✅
- `npm run ai:check` ✅
- `npm run quality:check` ✅

## Boundary Confirmation

- No business logic changed.
- No pricing, plan structure, offer strategy, or cloud monetization logic changed.
- UI, capture, and export language controls remain independent.
