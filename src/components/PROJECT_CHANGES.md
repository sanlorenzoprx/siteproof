# SiteProof Project Structure and Changes

SiteProof is an industry-first, offline-first documentation engine for contractors. It eliminates the "hassle" of paperwork by automating site photos, voice notes, and GPS-verified PDF reports.

## 📂 Directory Structure

```text
/
├── src/
│   ├── components/       # UI Components
│   │   ├── CameraCapture.tsx     # Custom camera wrapper for site photos
│   │   ├── CreateJob.tsx         # New job initialization form
│   │   ├── JobDetail.tsx         # Main project hub (Tabs: Photos, Voice, Report)
│   │   ├── JobList.tsx           # Dashboard view of all active work orders
│   │   ├── Layout.tsx            # Main shell with sidebar and background sync logic
│   │   ├── LicenseScreen.tsx     # 30-day trial and activation logic
│   │   ├── Settings.tsx          # Cloudflare Worker configuration
│   │   └── VoiceNoteCapture.tsx  # Audio capture and AI transcription interface
│   ├── lib/
│   │   └── utils.ts              # Tailwind merger and utility functions
│   ├── services/         # Business Logic & Infrastructure
│   │   ├── aiService.ts          # Backend AI boundary wrapper for transcription/summaries
│   │   ├── cloudService.ts       # Cloudflare Worker API client
│   │   ├── pdfService.ts         # jsPDF-based professional report generator
│   │   └── siteProofDataService.ts     # Canonical app data facade
│   ├── types.ts          # Global TypeScript interfaces
│   ├── App.tsx           # Main routing and license gatekeeper
│   ├── index.css         # Tailwind directives and custom themes
│   └── main.tsx          # App entry point with Router support
├── metadata.json         # PWA permissions (Camera, Mic, GPS)
└── package.json          # Dependencies (jspdf, motion, routing, etc.)
```

## 🛠 Key Components & Logic Changes

### 1. Data Layer (`/src/services/`)
- **Offline Persistence**: Current runtime uses repository-backed IndexedDB through SiteProofDataService as the app-facing data facade for low-signal field operation.
- **Pro PDF Engine**: `PdfService` generates a styled, multi-page report with branding, project metadata, and image evidence grids.
- **AI Boundary**: `AIService` calls SiteProof `/api/ai/*` endpoints so provider calls stay behind the backend boundary.

### 2. UI & UX (`/src/components/`)
- **Native-Like Camera**: `CameraCapture` provides a rapid-fire interface for categories like "Panel", "Meter", and "Fuel Line" without leaving the app context.
- **Voice Transcription**: `VoiceNoteCapture` simulates real-time transcription, allowing contractors to document issues hands-free.
- **Contractor Dashboard**: `JobList` uses `motion` for smooth list transitions and provides high-visibility project status.

### 3. Cloud Integration (`cloudService.ts`)
- **Background Sync**: `Layout.tsx` contains a timer that periodically triggers `CloudService` to push local data to a Cloudflare Worker if configured.
- **Remote Export**: Support for sending PDF reports directly to customer emails via Cloudflare Email bindings.

### 4. License Management (`App.tsx` & `LicenseScreen.tsx`)
- **Trial Lock**: Implements a 30-day trial counter. Upon expiration, the app redirects to the activation screen, requiring a yearly license key to unlock.

## 📦 New Dependencies Added
- `jspdf`: PDF generation.
- Cloudflare Workers AI: backend-only AI boundary for summaries and transcription.
- `react-router-dom`: SPA routing.
- `motion`: Interaction animations.
- `date-fns`: Professional date formatting.
- `clsx` & `tailwind-merge`: Dynamic UI styling.
