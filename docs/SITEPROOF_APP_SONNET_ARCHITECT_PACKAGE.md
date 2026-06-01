# SiteProof App - Sonnet 4.6 Architect Package

Derived on 2026-05-31 from `SITEPROOF_SONNET_ARCHITECT_PACKAGE.md` and scoped to the `SiteProof` app repository.

**Model:** `claude-sonnet-4-6`  
**Role:** Judgment executor for data layer, sync integrity, and high-risk UI refactor packets in the app.  
**Required inputs:** This file + `SITEPROOF_REMEDIATION_HANDOFF.md` (full steps/Acceptance/Verify per WP-id).

---

## Operating posture (Sonnet-specific)

1. You may exercise judgment within packet intent while staying aligned to CODEX.md: stronger primitives, simpler workflows, no duplicate models, no client secrets, bilingual-complete.
2. Work in small, compilable increments. For large packets, commit one file/component at a time and keep the build green.
3. Prove correctness with tests, especially for schema migrations and sync conflict handling.
4. Prioritize escalations that block a wave.
5. Return the standard 9-point report from `docs/ai/codex-operating-prompt.md` for each packet.

---

## Assigned packets for SiteProof App

### Lane L-BACKEND (app-side scope only)
| WP | Wave | Why Sonnet | Test that proves it |
|----|------|------------|---------------------|
| **WP-B1** | 1 | Cross-repo integration from the app side: repoint `licenseApiClient.ts` to the real D1/Stripe backend and verify request/response field contracts. | Forged key -> `valid:false` against real backend (integration, after G1/G2 deploy). |

Scope note: `WP-B2` is Haiku-owned app-worker cleanup. `WP-B3` has app-side UI/client impacts but requires report-worker endpoint work in `SiteProof.Report`.

### Lane L-DATA - app data ownership
You own this lane end-to-end (`src/db/**`, `src/services/sync/**`, `siteProofDataService.ts`, `cloudSyncService.ts`).

| WP | Wave | Why Sonnet | Test that proves it |
|----|------|------------|---------------------|
| **WP-D1** | 2 | Collapse legacy `types.ts` into canonical `db/schema.ts` across ~40 files; add enum data migration. | `grep -rl "src/types'" src` empty; old jobs still load. |
| **WP-D2** | 3 | Conflict-resolution logic (LWW + conflict log). Depends on D1. | Tests: local-newer / remote-newer / equal-timestamp. |
| **WP-D3** | 3 | Versioned IDB migrations + keep-or-drop-Dexie decision. | Ordered bumps; failed migration does not drop data; no installed-but-unused dep. |
| **WP-D4** | 3 | `Promise.allSettled` per-op sync + payload field whitelisting (PII). | 1 failing op in a batch of 3 -> other 2 complete. |
| **WP-D5** | 4 | Web Worker for PDF + image compression; virtualize lists >50. | Main thread unblocked on 200-proof export; flat memory at 500 items. |

### Lane L-UI - refactor packet only
| WP | Wave | Why Sonnet | Note |
|----|------|------------|------|
| **WP-U4** | 4 | Split 1,005-line `JobDetail.tsx` into 5 sections + `React.lazy()`. Depends on WP-D1. | No new component > ~300 lines; verify code-split chunk in `dist`. |

Cross-repo dependency note: `WP-G1` and `WP-G2` execute in `SiteProof.Report`. `WP-B3` is cross-repo and should be sequenced with app and report changes together.

### Escalation intake
Any `ESCALATE -> WP-<id>` from Haiku lands here, with expected focus on strict-mode/type-system cascades in app code.

---

## Token discipline for Sonnet
- Use Sonnet tokens on judgment-heavy app packets.
- Reuse schema/sync context across D1->D2->D3->D4.
- Lead with failing tests to minimize debugging loops.
