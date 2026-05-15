import { SITEPROOF_BRAND } from "../../config/brand";
import { SITEPROOF_OFFER, getPlanById, type SiteProofPlanId } from "../../config/offer";

export type LicenseStatus = "active" | "trial" | "expired" | "inactive";

export function buildLicenseValueSummary(planId: SiteProofPlanId = "core", status: LicenseStatus = "active") {
  const plan = getPlanById(planId);

  return {
    title: `${plan.name} — ${plan.billingLabel}`,
    status,
    tagline: SITEPROOF_BRAND.tagline,
    message: SITEPROOF_OFFER.inAppMessage,
    included: SITEPROOF_OFFER.appIncludedSummary,
    roiPrinciple: SITEPROOF_OFFER.roiPrinciple,
  } as const;
}

export function buildOfferProposalSummary(planId: SiteProofPlanId = "pro") {
  const plan = getPlanById(planId);

  return {
    title: `${plan.name} ${plan.billingLabel}`,
    buyerMessage: SITEPROOF_OFFER.buyerMessage,
    websiteMessage: SITEPROOF_OFFER.websiteMessage,
    valueFrame: SITEPROOF_OFFER.valueFrame,
    includes: plan.includes,
    close: SITEPROOF_OFFER.emotionalClose,
  } as const;
}
