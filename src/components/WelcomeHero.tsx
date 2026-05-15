import { SITEPROOF_BRAND } from "../config/brand";

export function WelcomeHero() {
  return (
    <section className="min-h-screen flex flex-col justify-center p-6">
      <p className="text-sm font-semibold uppercase tracking-wide opacity-70">
        {SITEPROOF_BRAND.appName}
      </p>

      <h1 className="mt-3 text-4xl font-bold leading-tight">
        {SITEPROOF_BRAND.tagline}
      </h1>

      <p className="mt-4 text-lg opacity-80">
        {SITEPROOF_BRAND.elevatorPitch}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <button className="rounded-xl px-5 py-4 text-lg font-bold">
          {SITEPROOF_BRAND.primaryCTA}
        </button>

        <button className="rounded-xl px-5 py-4 text-lg font-semibold opacity-80">
          {SITEPROOF_BRAND.secondaryCTA}
        </button>
      </div>

      <p className="mt-6 text-sm opacity-70">{SITEPROOF_BRAND.stormModeBanner}</p>
    </section>
  );
}
