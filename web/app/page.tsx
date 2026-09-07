import Link from "next/link";
import { getStats } from "@/lib/scam/scanStore";
import { ALL_MINERS, URL_MINERS } from "@/lib/telegraph/miners";

export const dynamic = "force-dynamic";

const TELEGRAPH_INTENT_COUNT = 9;

const STEPS = [
  {
    title: "Paste it.",
    body: "A message, a forwarded email, a bare link — anything you're unsure about.",
  },
  {
    title: "It fans out.",
    body: "Every URL, email, and IP inside gets its own set of checks, run in parallel across every relevant miner.",
  },
  {
    title: "One verdict, fully shown.",
    body: "Safe, suspicious, or scam — with every finding, cost, and cryptographic signal hash left open for you to check.",
  },
];

const REASONS = [
  {
    title: "No single point of failure",
    body: "When one source is slow, wrong, or offline, the others don't wait for it. A verdict never rests on one model's mood.",
  },
  {
    title: "Nothing is hidden",
    body: "Every finding, cost, and cryptographic signal hash is public on the ledger — check any of it yourself, anytime.",
  },
  {
    title: "Paid, not guessed",
    body: "Each answer comes from a service with real money riding on being right, not a free heuristic tuned for engagement.",
  },
  {
    title: "A verdict, not a score",
    body: "You get one plain sentence you can act on in seconds — not a percentage you're left to interpret alone.",
  },
];

export default async function LandingPage() {
  const stats = await getStats();
  const linkSafetyMiners = URL_MINERS.filter((m) => m.category === "link-safety").length;

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto w-full max-w-[1140px] px-5 pt-16 pb-14 sm:px-8 sm:pt-24 sm:pb-20">
        <div className="max-w-[720px]">
          <h1 className="font-display text-[42px] leading-[1.08] text-graphite sm:text-[58px]">
            One message. Twenty independent opinions. One honest verdict.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.6] text-steel">
            Scam Shield pays {ALL_MINERS.length} independent AI examiners on the Telegraph
            network to check a suspicious message, email, or link — then shows you exactly
            what each one found, what it cost, and how to verify it yourself.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/check"
              className="rounded-full bg-graphite px-6 py-3 text-[15px] font-medium text-paper transition hover:opacity-90"
            >
              Check a message
            </Link>
            <Link
              href="/ledger"
              className="text-[15px] text-steel underline decoration-border-default underline-offset-4 transition hover:text-graphite"
            >
              See what it&rsquo;s caught
            </Link>
          </div>
        </div>
      </section>

      {/* Flex stats */}
      <section className="border-y border-border-default bg-paper-raised">
        <div className="mx-auto grid w-full max-w-[1140px] grid-cols-2 gap-8 px-5 py-10 sm:grid-cols-4 sm:px-8">
          <Stat value={String(ALL_MINERS.length)} label="independent miners" />
          <Stat value={String(TELEGRAPH_INTENT_COUNT)} label="Telegraph intents covered" />
          <Stat value={stats.totalScans.toLocaleString()} label="scans run" />
          <Stat value={`$${stats.totalCostUsd.toFixed(2)}`} label="paid out in verified checks" />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-[1140px] px-5 py-16 sm:px-8 sm:py-24">
        <h2 className="font-display text-[30px] text-graphite">How it works</h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <span className="font-display text-[15px] text-steel">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-[17px] font-medium text-graphite">{step.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-[1.6] text-steel">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border-default bg-paper-raised p-8">
          <h3 className="text-[17px] font-medium text-graphite">Why so many miners?</h3>
          <p className="mt-2 max-w-[68ch] text-[14.5px] leading-[1.65] text-steel">
            Any single service can be slow, wrong, or simply down. Scam Shield never waits on
            one: when a miner errors or times out mid-scan, the check continues without it, and
            the miners that did answer still reach a verdict. Redundancy isn&rsquo;t a fallback
            plan here — it&rsquo;s the whole design. {linkSafetyMiners} independent services check
            link safety alone, so no single outage or bad call ever decides your answer.
          </p>
        </div>
      </section>

      {/* Why it works */}
      <section className="border-t border-border-default bg-paper-raised">
        <div className="mx-auto w-full max-w-[1140px] px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="font-display text-[30px] text-graphite">Why it holds up</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {REASONS.map((reason) => (
              <div key={reason.title} className="border-t border-border-default pt-5">
                <h3 className="text-[16px] font-medium text-graphite">{reason.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-steel">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto w-full max-w-[1140px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border-default p-8 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-[17px] font-medium text-graphite">Free while we&rsquo;re in early access</h3>
            <p className="mt-1.5 max-w-[56ch] text-[14.5px] text-steel">
              Every check above is prepaid by Scam Shield itself — you don&rsquo;t spend a
              cent. A token-based plan is coming for when that changes.
            </p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 rounded-full border border-border-default px-5 py-2.5 text-[14px] font-medium text-graphite transition hover:bg-fog/50"
          >
            See the plan
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-[30px] text-graphite sm:text-[36px]">{value}</div>
      <div className="mt-0.5 text-[13px] text-steel">{label}</div>
    </div>
  );
}
