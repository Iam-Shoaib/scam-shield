import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing — Scam Shield" };

type Tier = {
  name: string;
  price: string;
  period?: string;
  tokens: string;
  scans: string;
  blurb: string;
  features: string[];
  popular?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    tokens: "100 tokens",
    scans: "~5 checks a month",
    blurb: "Enough to check the messages that actually worry you.",
    features: ["All 23 miners included", "Full evidence on every check", "Public ledger access"],
  },
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    tokens: "1,000 tokens",
    scans: "~50 checks a month",
    blurb: "For anyone who forwards a lot of suspicious texts.",
    features: ["Everything in Free", "Priority miner queue", "Scan history export"],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    tokens: "4,000 tokens",
    scans: "~200 checks a month",
    blurb: "Deeper follow-up scans on every link, automatically.",
    features: ["Everything in Starter", "Always run the deep-scan pass", "Email/Slack alerts on scam verdicts"],
    popular: true,
  },
  {
    name: "Team",
    price: "Custom",
    tokens: "Pooled tokens",
    scans: "Shared across your team",
    blurb: "Shared ledger and seats for a whole team or org.",
    features: ["Everything in Pro", "Shared token pool", "API access", "Seat management"],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-[1140px] px-5 py-14 sm:px-8">
      <div className="max-w-[640px]">
        <h1 className="font-display text-[32px] text-graphite">Plans</h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-steel">
          Scam Shield is fully prepaid during early access — every check on this site right
          now is paid for by us, not you. This is the token-based plan we&rsquo;re moving to
          once that changes. Nothing here is billable yet.
        </p>
      </div>

      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border-default px-4 py-1.5 text-[13px] text-steel">
        <span className="h-1.5 w-1.5 rounded-full bg-suspicious-border" aria-hidden />
        Subscriptions are coming soon — nothing below can be purchased yet.
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`flex flex-col rounded-2xl border p-6 ${
              tier.popular ? "border-graphite/30 bg-paper-raised" : "border-border-default"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-medium text-graphite">{tier.name}</h2>
              {tier.popular && (
                <span className="rounded-full bg-fog px-2.5 py-0.5 text-[11px] text-steel">Popular</span>
              )}
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-[34px] text-graphite">{tier.price}</span>
              {tier.period && <span className="text-[13px] text-steel">{tier.period}</span>}
            </div>

            <p className="mt-3 text-[13.5px] leading-[1.5] text-steel">{tier.blurb}</p>

            <div className="mt-5 border-t border-border-default pt-4">
              <div className="text-[14px] font-medium text-graphite">{tier.tokens}</div>
              <div className="text-[12.5px] text-steel">{tier.scans}</div>
            </div>

            <ul className="mt-5 flex-1 space-y-2">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2 text-[13px] text-graphite/85">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-steel" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled
              title="Subscriptions are coming soon"
              className="mt-6 w-full cursor-not-allowed rounded-full border border-border-default py-2.5 text-[13px] font-medium text-steel opacity-60"
            >
              Coming soon
            </button>
          </div>
        ))}
      </div>

      <div className="mt-14 max-w-[720px] border-t border-border-default pt-8">
        <h2 className="text-[16px] font-medium text-graphite">How tokens work</h2>
        <p className="mt-2 text-[14px] leading-[1.65] text-steel">
          One token maps to $0.01 of real miner spend — the same x402 micropayment shown on
          every scan&rsquo;s evidence table today. A typical check uses 15 to 25 tokens
          depending on how many links, emails, and IPs it contains, since each one is checked
          independently. Unused tokens roll over for one month.
        </p>
      </div>
    </div>
  );
}
