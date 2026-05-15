# SiteProof Camera + Media Pipeline v1

Implemented in this pass:

- Faster camera capture constraints using ideal 1080p/environment camera.
- Camera switch button for front/rear camera fallback.
- Requirement-aware camera overlay showing the current proof item and capture hint.
- Standardized metadata watermark overlay through `MediaPipelineService`.
- GPS accuracy display on the capture screen.
- Photo media pipeline service for thumbnail generation, compression, dimensions, file sizes, and quality scoring.
- Proof capture now saves original blob, compressed blob, thumbnail data URL, dimensions, compression state, thumbnail state, and quality score.
- Runtime `MediaAsset` records now receive actual dimensions, compressed file size, media state, and SiteProof media URI paths.
- Gallery UI now shows GPS status, media-ready status, file size, quality score, dimensions, and issue tags.

Important implementation notes:

- This is still browser/PWA-oriented storage. The legacy Dexie photo table holds blobs and thumbnails for local durability.
- Runtime `MediaAsset.local_uri` is now structured as a SiteProof URI so it can later map to OPFS, filesystem APIs, or native Android storage.
- Compression is currently performed immediately during save for reliability. A later pass can move it into a background queue/worker.
- The next technical upgrade should be persistent OPFS/file-backed media storage and background compression retries.

Next suggested pass:

- Offline hardening phase 2 for recovery testing, sync retry UX, and app-close restoration.
- Then media queue worker if field testing shows saves feel slow on lower-end Android devices.
