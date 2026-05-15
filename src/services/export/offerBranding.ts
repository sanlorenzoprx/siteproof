import { SITEPROOF_BRAND } from '../../config/brand';
import { SITEPROOF_OFFER } from '../../config/offer';
import { translate } from '../../config/i18n';
import type { SiteProofLanguage } from '../../types/settings';

export function getLicenseReportFooter(language: SiteProofLanguage = 'en') {
  return [
    SITEPROOF_BRAND.tagline,
    SITEPROOF_OFFER.emotionalClose,
    translate(language, 'reports.footerGenerated'),
  ].join(' ');
}

export function getCustomerProofPacketIntro(language: SiteProofLanguage = 'en') {
  return {
    title: 'Jobsite Proof Packet',
    subtitle: SITEPROOF_BRAND.tagline,
    summary: translate(language, 'reports.customerPacketIntro'),
  } as const;
}
