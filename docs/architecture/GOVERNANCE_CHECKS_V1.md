# SiteProof Governance Checks v1

Run:

```bash
npm run governance:check
```

The check enforces:

- required architecture docs exist
- required ADRs exist
- canonical primitive names still exist in `src/db/schema.ts`
- no obvious forbidden imports or duplicate source-of-truth files are introduced
- legacy storage exceptions remain explicit

This check is intentionally lightweight. It is designed to stop accidental architecture drift without blocking normal product development.
