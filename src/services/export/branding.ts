import { SITEPROOF_BRAND } from "../../config/brand";
import { SITEPROOF_LAUNCH_OFFER } from "../../constants/siteProofOffer";
import { SettingsService } from "../settingsService";

export function getReportBranding() {
  return {
    title: SITEPROOF_BRAND.appName,
    subtitle: SITEPROOF_BRAND.tagline,
    footer: SITEPROOF_LAUNCH_OFFER.reportFooter.default,
  } as const;
}

export function getProofReportTitle(jobName?: string) {
  if (!jobName) return `${SITEPROOF_BRAND.appName} Proof Report`;
  return `${jobName} - ${SITEPROOF_BRAND.appName} Proof Report`;
}

export async function getSettingsReportBranding() {
  const settings = await SettingsService.getSettings();
  return {
    title: settings.companyProfile.companyName || SITEPROOF_BRAND.appName,
    subtitle: settings.companyProfile.primaryTrade || SITEPROOF_BRAND.tagline,
    phone: settings.companyProfile.businessPhone,
    email: settings.companyProfile.businessEmail,
    website: settings.companyProfile.website,
    licenseNumber: settings.companyProfile.licenseNumber || '',
    serviceArea: settings.companyProfile.serviceArea,
    paymentTerms: settings.reportDefaults.paymentTerms,
    warrantyServiceNote: settings.reportDefaults.warrantyServiceNote,
    disclaimer: settings.reportDefaults.defaultDisclaimer,
    footer: SITEPROOF_LAUNCH_OFFER.reportFooter.default,
  };
}
