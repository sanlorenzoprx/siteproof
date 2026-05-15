# SiteProof Proof Integrity System v1

This pass upgrades SiteProof from field documentation toward trusted field evidence.

## Implemented

### Immutable proof IDs
- Existing ProofObject IDs are now used as permanent proof identifiers in manifests and exports.
- Legacy photo/voice IDs are bridged into ProofObjects through runtime metadata.

### SHA-256 proof hashing
- New `ProofIntegrityService` creates canonical SHA-256 hashes for:
  - photos
  - voice notes
  - runtime ProofObjects
  - export manifests
- Hashes are deterministic over proof metadata plus source media/text hash.

### Tamper detection
- Runtime ProofObjects can be verified against their stored integrity hash.
- Verification returns:
  - `verified`
  - `modified`
  - `missing_hash`
  - `unavailable`

### Chain-of-custody logs
- Legacy `JobPhoto` and `VoiceNote` now carry custody entries.
- Runtime `ProofObject` now supports `chain_of_custody`.
- Export generation records a manifest event in the timeline.

### Signed export manifests
- PDF export now builds a `siteproof-export-manifest-v1` manifest.
- Manifest includes:
  - proof count
  - media count
  - timeline event count
  - manifest hash
  - signed manifest hash placeholder
  - per-proof verification status
- ExportPacket records now store manifest hashes.

### PDF evidence page
- Generated PDFs now include a `PROOF INTEGRITY MANIFEST` page.
- This gives customers, inspectors, insurance reviewers, and internal teams a quick way to see proof IDs, verification status, and hash prefixes.

## Important note

This is strong local integrity, not yet court-grade third-party notarization.

For legal-grade signatures later, replace the local placeholder signature with one of:
- server-held private key signing
- Cloudflare Worker signing endpoint
- trusted timestamp authority
- blockchain/notary anchoring if the market demands it

## Verification

Passed:

```bash
npm run lint
npm run build
```
