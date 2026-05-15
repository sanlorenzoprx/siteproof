import { SITEPROOF_BRAND } from "./brand";

export const SITEPROOF_OFFER = {
  offerName: "SiteProof Yearly License",
  billingModel: "yearly_recurring",
  buyerMessage:
    "A yearly jobsite protection system that helps contractors document work, reduce disputes, and get paid faster.",
  inAppMessage:
    "Your SiteProof yearly license helps your company document jobs, protect proof, reduce disputes, and get paid faster.",
  websiteMessage:
    "One missed change order, one delayed inspection, or one disputed invoice can cost more than a year of SiteProof.",
  valueFrame: [
    "Reduce lost documentation time",
    "Reduce office admin and report-building time",
    "Reduce missed change-order revenue",
    "Reduce inspection delays from missing proof",
    "Reduce payment disputes and customer arguments",
    "Improve cash flow with faster proof packets",
  ],
  appIncludedSummary: [
    "Unlimited job documentation",
    "Photo proof capture",
    "Voice notes",
    "GPS and timestamp records",
    "Offline mode",
    "Proof reports",
    "Customer and inspection packets",
    "Support and product updates",
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
      "Customer completion packets",
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
      "Inspector/customer packet modes",
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
