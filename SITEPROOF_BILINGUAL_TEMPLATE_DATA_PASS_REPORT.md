# SiteProof Bilingual Template Data Pass Report

## Scope completed

- Added bilingual authored-text support at the workflow template schema and service layer.
- Localized the bundled generator/electrical starter template for:
  - stage display names
  - stage descriptions
  - requirement display names
  - requirement field instructions
  - checklist item display names
  - checklist item descriptions
- Updated UI consumers to request localized template data from `TemplateCatalogService` using `uiLanguage`.
- Preserved the independent `uiLanguage`, `captureLanguage`, and `exportLanguage` settings model.
- Added English fallback behavior whenever selected-language authored text is missing.

## Implementation notes

- Existing English fields remain in place for compatibility and as the final fallback.
- New `*_i18n` fields hold authored localized values without changing workflow logic or proof requirements.
- `TemplateCatalogService.localizeTemplate()` returns a localized view of the template instead of forcing components to hardcode translations.
- Localized data is now consumed by:
  - `JobDetail`
  - `CreateJob`
  - `Onboarding`
  - `CameraCapture`
  - `VoiceNoteCapture`

## Tests added

- Template-authored content resolves to Spanish from the data layer.
- Missing selected-language content falls back to English.
- Capture categories and requirement context respect the selected UI language.

## Validation run

- `npm install` ✅
- `npm run lint` ✅
- `npm run test` ✅
- `npm run build` ✅
- `npm run ai:check` ✅
- `npm run quality:check` ✅

## Constraints preserved

- No workflow logic changed.
- No proof requirements changed.
- No pricing, offer, or cloud monetization logic changed.
- Capture and export language behavior remain independent from UI language.
