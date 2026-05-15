# SiteProof DB Layer v1

Drop these files into your app under `src/db/`.

## Files

- `schema.ts` — core SiteProof entities and shared types.
- `indexedDb.ts` — IndexedDB database/open/migration/index setup.
- `repositories/*` — starter repository layer for jobs, proof, media, stages, templates, voice notes, exports, timeline, customers, and sync.

## Basic usage

```ts
import { openSiteProofDb } from './db/indexedDb';
import { jobRepository, proofRepository } from './db/repositories';

await openSiteProofDb();

const job = await jobRepository.createJob({
  company_id: 'local-company',
  job_title: 'Generator Install - Main St',
  job_type: 'generator_install',
  trade: 'electrical',
  template_id: 'generator_install_v1',
  template_version: '1.0.0',
});

await proofRepository.createProof({
  job_id: job.job_id,
  proof_type: 'photo',
  title: 'Meter before work',
  required_flag: true,
  requirement_id: 'meter_before',
  export_tags: ['inspector_packet', 'customer_packet'],
});
```

## Next integration step

Wire `jobRepository.createJob()` into `CreateJob.tsx`, then replace legacy storage/photo writes with `proofRepository.createProof()` + `mediaRepository.createMedia()`.
