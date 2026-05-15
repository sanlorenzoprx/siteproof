import { SITEPROOF_BRAND } from "../config/brand";
import { SITEPROOF_OFFER, getInAppOfferHeader, type SiteProofPlanId } from "../config/offer";

type LicenseValueCardProps = {
  planId?: SiteProofPlanId;
  status?: "active" | "trial" | "expired" | "inactive";
};

export function LicenseValueCard({ planId = "core", status = "active" }: LicenseValueCardProps) {
  const offer = getInAppOfferHeader(planId);
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <section className="rounded-2xl border p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
        {offer.appName} License
      </p>

      <div className="mt-2 flex flex-col gap-1">
        <h2 className="text-2xl font-bold">{offer.planName}</h2>
        <p className="text-sm font-medium opacity-70">
          {offer.billingLabel} · Status: {statusLabel}
        </p>
      </div>

      <p className="mt-4 text-base leading-relaxed">{offer.message}</p>

      <div className="mt-5 grid gap-2">
        {SITEPROOF_OFFER.appIncludedSummary.map((item) => (
          <div key={item} className="rounded-xl border px-3 py-2 text-sm">
            {item}
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm font-semibold">{SITEPROOF_BRAND.tagline}</p>
    </section>
  );
}
