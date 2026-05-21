import { SITEPROOF_BRAND } from "./brand";
import { SITEPROOF_LAUNCH_OFFER } from "../constants/siteProofOffer";

export const SITEPROOF_OFFER = {
  offerName: SITEPROOF_LAUNCH_OFFER.name,
  billingModel: "one_time_launch_offer",
  buyerMessage:
    SITEPROOF_LAUNCH_OFFER.brandLine,
  inAppMessage:
    SITEPROOF_LAUNCH_OFFER.tagline,
  websiteMessage:
    "One missed change order, one delayed inspection, or one disputed invoice can cost more than SiteProof.",
  valueFrame: [
    "Reduce lost documentation time",
    "Reduce office admin and report-building time",
    "Reduce missed change-order revenue",
    "Reduce inspection delays from missing proof",
    "Reduce payment disputes and customer arguments",
    "Improve cash flow with faster proof reports",
  ],
  appIncludedSummary: [
    ...SITEPROOF_LAUNCH_OFFER.included,
  ],
  roiPrinciple:
    "SiteProof should pay for itself through saved time, faster approvals, stronger documentation, fewer disputes, and recovered billable work.",
  emotionalClose:
    "When the job is questioned, your company has the proof.",
} as const;

export const SITEPROOF_PLANS = [
  {
    id: "core",
    name: "SiteProof Core",
    billingLabel: "Yearly License",
    audience: "Small contractors and crews that need job proof fast.",
    positioning: "Fast job documentation without internet dependency.",
    includes: [
      "Offline job documentation",
      "Photos, notes, GPS, and timestamps",
      "Basic proof reports",
      "Customer completion reports",
      "Local/offline storage",
      "Yearly product updates",
    ],
  },
  {
    id: "pro",
    name: "SiteProof Pro",
    billingLabel: "Yearly License",
    audience: "Growing companies that need stronger office/field handoff.",
    positioning: "Better visibility, stronger reports, and cleaner operational proof.",
    includes: [
      "Everything in Core",
      "Cloud backup",
      "Multi-device sync",
      "Office/field handoff",
      "Inspection-ready reports",
      "Change-order candidate tracking",
      "Branded exports",
      "Priority support",
    ],
  },
  {
    id: "operations",
    name: "SiteProof Operations",
    billingLabel: "Yearly License",
    audience: "Companies running multiple crews or standardized documentation workflows.",
    positioning: "Company-wide proof control across crews, jobs, and reports.",
    includes: [
      "Everything in Pro",
      "Crew/user management",
      "Company templates",
      "Manager review workflow",
      "Report standards",
      "Inspector/customer report modes",
      "Implementation support",
      "Annual ROI review",
    ],
  },
] as const;

export type SiteProofPlanId = (typeof SITEPROOF_PLANS)[number]["id"];

export function getPlanById(planId: SiteProofPlanId) {
  return SITEPROOF_PLANS.find((plan) => plan.id === planId) ?? SITEPROOF_PLANS[0];
}

export function getInAppOfferHeader(planId: SiteProofPlanId = "core") {
  const plan = getPlanById(planId);

  return {
    appName: SITEPROOF_BRAND.appName,
    tagline: SITEPROOF_BRAND.tagline,
    planName: plan.name,
    billingLabel: plan.billingLabel,
    message: SITEPROOF_OFFER.inAppMessage,
  } as const;
}
