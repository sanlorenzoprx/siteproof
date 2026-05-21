# SiteProof Pilot Readiness Hardening v1

## Objective

Prepare SiteProof for a controlled contractor pilot by adding release hygiene, pilot checks, safer setup docs, and an in-app readiness screen.

This pass does not add a major new workflow feature. It makes the current feature set safer to test in the field.

## Added

- In-app Pilot Readiness screen at `/pilot-readiness`
- Sidebar/mobile navigation item: `Pilot`
- Pilot readiness service
- Pilot readiness hook
- Smoke-check script
- Setup documentation
- Pilot checklist documentation
- Release notes

## Pilot Readiness Checks

The in-app screen checks:

- offline database availability
- generator workflow template availability
- service worker/offline shell readiness
- network state detection
- cloud sync configuration
- sync queue health
- repository data model counts
- media pipeline evidence
- export smoke-test readiness

## Commands

```bash
npm run lint
npm run build
npm run pilot:smoke
npm run pilot:check
```

## Pilot acceptance checklist

Before handing the app to a contractor:

- [ ] `npm run pilot:check` passes
- [ ] App opens on target phone
- [ ] Offline banner behaves correctly
- [ ] Sample generator job can be created
- [ ] Required photo can be captured
- [ ] Voice note can be recorded
- [ ] Customer report can be generated
- [ ] Inspector report blocks when proof is missing
- [ ] Timeline shows photo/note/export events
- [ ] Airplane-mode reopen preserves job/media/notes
- [ ] Sync queue displays pending operations clearly

## Known pilot constraints

- Cloud sync requires manual endpoint/key setup.
- Legacy Dexie storage is retained as fallback during migration.
- AI is offline-first heuristic unless cloud AI key is configured.
- Browser storage limits vary by device/browser.

## Recommended pilot scope

Start with 1 to 3 friendly users and 1 workflow:

```text
Generator Install / Electrical Documentation
```

Do not pilot all specialties yet.

## Pilot success signals

- Crew can complete documentation without training-heavy support.
- Customer/inspector report looks professional enough to send.
- App survives airplane-mode use.
- Crew understands missing-proof warnings.
- Timeline helps explain what happened on the job.
