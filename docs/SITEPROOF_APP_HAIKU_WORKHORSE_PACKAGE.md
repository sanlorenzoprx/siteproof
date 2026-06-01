# SiteProof App - Haiku 4.5 Workhorse Package

Derived on 2026-05-31 from `SITEPROOF_HAIKU_WORKHORSE_PACKAGE.md` and scoped to the `SiteProof` app repository.

**Model:** `claude-haiku-4-5`  
**Role:** Deterministic executor for fully specified app-repo tasks.  
**Required inputs:** This file + `SITEPROOF_REMEDIATION_HANDOFF.md`.

---

## Hard rules (Haiku-specific)

1. Execute packet steps exactly as specified in the master handoff.
2. If a packet verify command fails twice, stop and escalate.
3. If packet work requires judgment not specified, escalate.
4. Stay inside lane-owned files; only Strings lane edits `src/config/i18n.ts`.
5. No secrets in client code.
6. Bilingual coverage is required for user-facing strings.
7. Read `CODEX.md` + `docs/ai/codex-operating-prompt.md` before first edit.

### Escalation token
```
ESCALATE -> WP-<id> | reason: <verify-failed | decision-needed | scope-mismatch> | detail: <one line>
```

---

## Assigned packets for SiteProof App

### Lane L-I18N
Own `src/config/i18n.ts`.

| WP | Wave | Scope | Gate |
|----|------|-------|------|
| **WP-I1** | 1 | Repair Spanish mojibake and save UTF-8 (no BOM). | `grep -nE "Ãƒ|Ã‚" src/config/i18n.ts` -> empty |
| **WP-I2** | 2 | Add every `// i18n-needed:` key emitted by UI lane in both locales. | Keys present in `en` and `es`; `npm run lint` |

### Lane L-UI
Own `src/components/**`, `src/index.css`.

| WP | Wave | Scope | Gate |
|----|------|-------|------|
| **WP-U1** | 1 | `placeholder="{t('...')}"` -> `placeholder={t('...')}` and sweep similar attrs. | `grep -rn '="{t(' src/components` -> empty; `npm run lint` |
| **WP-U2** | 1 | Contrast fixes; replace `alert()` with inline `aria-live` errors + retry; emit `// i18n-needed:` keys (do not edit i18n.ts). | no `alert(` in component files; `npm run lint` |
| **WP-U3** | 3 | >=48px touch targets, visible borders/focus rings, persistent sync badge in job header. | lint + manual mobile viewport check |
| **WP-U5** | 4 | ARIA pass: focus-trap modals, `aria-live` recording status, `role="progressbar"` on stepper, `aria-hidden` on decorative icons. | axe-core: no critical violations |

### Lane L-TOOLING
Own `package.json`, `tsconfig.json`, ESLint/Vitest config, `.github/workflows/**`, `vite.config.ts`.

| WP | Wave | Scope | Gate | Note |
|----|------|-------|------|------|
| **WP-T1** | 2 | Add ESLint + `lint:eslint`; add Vitest + RTL + smoke test; add `lint:types`. | `npm run lint:eslint && npm test` | If strict mode causes broad type cascades, escalate strict-mode sub-step to Sonnet. |
| **WP-T2** | 4 | CI workflow with types/eslint/test/audit; pin direct deps; add Dependabot. | workflow green on test PR | |

### Lane L-BACKEND (app worker packet)

| WP | Wave | Scope | Gate | Note |
|----|------|-------|------|------|
| **WP-B2** | 1 | In `workers/siteproof-api/src/index.ts`: delete `/checkout/*`, `/stripe/webhook`, `/license/*` stub handlers; add `ALLOWED_ORIGINS` CORS allow-list; copy existing `isRateLimited()` pattern from report worker. | `cd workers/siteproof-api && npx tsc --noEmit`; no forbidden route strings in `src/index.ts` | No custom crypto/signature invention; copy/delete only. |

### Cross-repo scope notes
- GTM packets `WP-G3` and `WP-G6` execute in `SiteProof.Report`.

---

## Return format (per packet)
```
WP-<id>: DONE | ESCALATED
Files changed: <list>
Verify output: <gate result>
i18n-needed emitted: <keys or none>
Bilingual: reviewed yes/no/n-a
```

## Token discipline
- Reuse context within lane packets.
- Run the packet verify command as verification.
- Avoid reading unrelated files.
