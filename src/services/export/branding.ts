import { SITEPROOF_BRAND } from "../../config/brand";
import { SITEPROOF_LAUNCH_OFFER } from "../../constants/siteProofOffer";

export function getReportBranding() {
  return {
    title: SITEPROOF_BRAND.appName,
    subtitle: SITEPROOF_BRAND.tagline,
    footer: SITEPROOF_LAUNCH_OFFER.reportFooter.default,
  } as const;
}

export function getProofReportTitle(jobName?: string) {
  if (!jobName) return `${SITEPROOF_BRAND.appName} Proof Report`;
  return `${jobName} — ${SITEPROOF_BRAND.appName} Proof Report`;
}
