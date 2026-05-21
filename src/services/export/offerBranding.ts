import { SITEPROOF_BRAND } from '../../config/brand';
import { SITEPROOF_LAUNCH_OFFER } from '../../constants/siteProofOffer';
import { translate } from '../../config/i18n';
import type { SiteProofLanguage } from '../../types/settings';

export function getLicenseReportFooter(language: SiteProofLanguage = 'en') {
  return [
    SITEPROOF_LAUNCH_OFFER.reportFooter.default,
    translate(language, 'reports.footerGenerated'),
  ].join(' ');
}

export function getBrandedReportFooter() {
  return SITEPROOF_LAUNCH_OFFER.reportFooter.branded;
}

export function getReportEmailPostscript() {
  return SITEPROOF_LAUNCH_OFFER.reportFooter.emailPs;
}

export function getCustomerProofPacketIntro(language: SiteProofLanguage = 'en') {
  return {
    title: 'Jobsite Proof Report',
    subtitle: SITEPROOF_BRAND.tagline,
    summary: translate(language, 'reports.customerPacketIntro'),
  } as const;
}
