# App Report PDF QA Checklist

Use `npx tsx scripts/manual-report-qa.ts` to generate the QA PDFs in `tmp/report-qa`.

## Reports To Generate

- Customer Completion Report
- Daily Job Proof Report
- Inspection Readiness Report
- Change Order Evidence Report
- Photo Proof Timeline
- Payment Proof / Final Handoff Report
- All Reports as one combined PDF

## Desktop Review

- PDF opens without corruption.
- Title is correct.
- Sections render in report-specific order.
- Photos are visible and not badly stretched or cropped.
- GPS, date, time, stage, and proof status labels are readable.
- Text does not overflow or get cut off.
- Inspection disclaimer appears in the Inspection Readiness Report.
- Payment note appears in the Payment Proof / Final Handoff Report.
- Footer and page numbers render cleanly.
- Export history title and proof count match the generated report.

## Phone Review

- PDF opens from the app/browser.
- Filename is understandable.
- Pages are readable without broken layout.
- Images load.
- All Reports opens as one combined PDF.
- Share/export behavior works.

## Spanish Review

- Dropdown labels appear in Spanish.
- Report titles appear in Spanish.
- Section labels appear in Spanish.
- Inspection disclaimer appears in Spanish.
- Payment note appears in Spanish.
- Filename is ASCII-safe and readable.

## Guardrail Review

- No app report includes START-HERE or sales insert content.
- No report invents approvals, code compliance, inspection approval, payment approval, invoice status, or customer acceptance.
- Inspection readiness language describes documented evidence only.
- Payment final handoff language supports review without threats, legal claims, or payment guarantees.
