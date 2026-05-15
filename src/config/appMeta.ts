import { SITEPROOF_BRAND } from "./brand";

export const APP_META = {
  title: SITEPROOF_BRAND.appName,
  description: SITEPROOF_BRAND.elevatorPitch,
  themeName: `${SITEPROOF_BRAND.appName} — ${SITEPROOF_BRAND.tagline}`,
} as const;
