import { SITEPROOF_OFFER, SITEPROOF_PLANS } from "../config/offer";

export function OfferPlanSummary() {
  return (
    <section className="p-6">
      <p className="text-sm font-semibold uppercase tracking-wide opacity-60">
        Yearly Offer Structure
      </p>

      <h2 className="mt-2 text-3xl font-bold">SiteProof pays for itself by protecting jobsite proof.</h2>

      <p className="mt-3 text-base leading-relaxed opacity-80">{SITEPROOF_OFFER.websiteMessage}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {SITEPROOF_PLANS.map((plan) => (
          <article key={plan.id} className="rounded-2xl border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
              {plan.billingLabel}
            </p>
            <h3 className="mt-2 text-xl font-bold">{plan.name}</h3>
            <p className="mt-2 text-sm opacity-75">{plan.audience}</p>
            <p className="mt-3 text-sm font-semibold">{plan.positioning}</p>

            <ul className="mt-4 space-y-2 text-sm">
              {plan.includes.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
