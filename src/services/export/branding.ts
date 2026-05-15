import { SITEPROOF_BRAND } from "../../config/brand";

export function getReportBranding() {
  return {
    title: SITEPROOF_BRAND.appName,
    subtitle: SITEPROOF_BRAND.tagline,
    footer: SITEPROOF_BRAND.reportFooter,
  } as const;
}

export function getProofReportTitle(jobName?: string) {
  if (!jobName) return `${SITEPROOF_BRAND.appName} Proof Report`;
  return `${jobName} — ${SITEPROOF_BRAND.appName} Proof Report`;
}
