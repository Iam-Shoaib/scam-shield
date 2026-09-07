import {
  EMAIL_MINERS,
  IP_MINERS,
  MESSAGE_LEVEL_MINERS,
  TRANSLATION_MINER,
  URL_MINERS,
} from "@/lib/telegraph/miners";
import type { MinerDefinition } from "@/lib/telegraph/types";

const CATEGORY_LABEL: Record<MinerDefinition["category"], string> = {
  "link-safety": "Link safety — checked per URL found",
  "cert-trust": "Certificate trust — checked per URL's domain",
  "content-extraction": "Content extraction — checked per URL",
  "sender-forensics": "Sender forensics — checked per email or IP found",
  "message-fraud": "Message-fraud classifiers — always run on the text",
  "ai-text": "AI-generated-text jury — always run",
  "prompt-injection": "Prompt-injection detection — always run",
  translation: "Translation — runs first for non-English input",
};

const MINER_DESCRIPTION: Record<string, string> = {
  "251": "Classifies scam-message patterns — credential requests, investment pitches, payment pressure.",
  "94217603": "Checks against documented fraud schemes and known scam wallets.",
  "91001": "Answers whether a message matches a known fraud pattern, with sources.",
  "717190": "Fact-checks specific claims in the text against live evidence.",
  "232": "Judges whether there's enough evidence to act on this message at all.",
  "32": "Detects AI-generated text via a Bittensor subnet model.",
  "708425": "Fine-tuned classifier for AI-generated vs. human-written text.",
  "20260830": "Stylometry ensemble estimating the probability text is AI-written.",
  "8848": "Scans for indirect prompt-injection attempts hidden in the text.",
  "11": "Checks a URL against a crowd-sourced malware and phishing feed.",
  "222": "Checks a URL against the community phishing database.",
  "203": "Scores a domain against 70+ antivirus and threat-intel engines.",
  "7402": "Aggregates phishing, malware, and domain-age signals for a URL.",
  "7334": "Live reachability, HTTPS, and redirect check for a URL.",
  "223": "Sandboxed render of a page, capturing verdicts and redirects.",
  "7332": "Validates a domain's live TLS certificate.",
  "10": "Looks up the most recent certificate-transparency record for a domain.",
  "227": "Deep TLS configuration grade — A+ through F — for a host.",
  "7335": "Pulls the title and body text off a linked page.",
  "221": "Reputation lookup for an email address — leaks, blacklists, abuse.",
  "204": "Geolocation and privacy/abuse risk flags for an IP address.",
  "7333": "Geolocation for an IP address from two independent providers.",
  "7337": "Translates non-English input to English before analysis.",
};

const STEPS = [
  "Paste a message, email, or link.",
  "The text is scanned locally for URLs, emails, and IP addresses — free, no miner calls yet.",
  "Non-English text is translated first, so every downstream check runs on English.",
  "The raw text always goes through the message-fraud, AI-text, and prompt-injection miners.",
  "Every URL found is checked for link safety and certificate trust, and its page content is extracted.",
  "If a URL's extracted page reads as substantial, it's re-run through the fraud and AI-text jury too — catching scam landing pages even when the message itself looks clean.",
  "Every email and IP found gets its own reputation and geolocation checks.",
  "Results are rolled into one verdict, and every finding — cost, latency, signal hash included — is published to the ledger.",
];

function groupByCategory(miners: MinerDefinition[]) {
  const groups = new Map<MinerDefinition["category"], MinerDefinition[]>();
  for (const m of miners) {
    const list = groups.get(m.category) ?? [];
    list.push(m);
    groups.set(m.category, list);
  }
  return groups;
}

export default function AboutPage() {
  const groups = groupByCategory([
    ...MESSAGE_LEVEL_MINERS,
    ...URL_MINERS,
    ...EMAIL_MINERS,
    ...IP_MINERS,
    TRANSLATION_MINER,
  ]);

  return (
    <div className="mx-auto w-full max-w-[860px] space-y-16 px-5 py-14 sm:px-8">
      <div>
        <h1 className="font-display text-[32px] text-graphite">How Scam Shield works</h1>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.6] text-steel">
          One pasted message can trigger fifteen to twenty-five paid Telegraph miner calls,
          depending on how many links, emails, and IPs it contains. Every call is a real x402
          micropayment on Base Sepolia — nothing here is mocked or cached.
        </p>
      </div>

      <div className="border-t border-border-default">
        {STEPS.map((step, i) => (
          <div key={i} className="flex gap-5 border-b border-border-default py-4">
            <span className="font-display w-7 shrink-0 text-[18px] text-steel">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-[14.5px] leading-[1.6] text-graphite/90">{step}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border-default bg-paper-raised p-8">
        <h2 className="text-[16px] font-medium text-graphite">Why miners overlap on purpose</h2>
        <p className="mt-2 max-w-[68ch] text-[14px] leading-[1.65] text-steel">
          Several categories above are covered by more than one miner deliberately. Link
          safety alone is checked by six independent services; certificate trust by three.
          If one is slow, wrong, or offline, the scan doesn&rsquo;t stop or wait for it — the
          others still answer, and the verdict is built from whichever miners actually
          responded. No single miner going down, or being wrong, can take the whole check
          with it.
        </p>
      </div>

      <div className="space-y-10">
        {Array.from(groups.entries()).map(([category, miners]) => (
          <div key={category}>
            <h2 className="text-[13px] text-steel">{CATEGORY_LABEL[category]}</h2>
            <div className="mt-3 border-t border-border-default">
              {miners.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-1 border-b border-border-default py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <div className="flex items-baseline gap-3 sm:w-[42%] sm:shrink-0">
                    <span className="text-[14.5px] font-medium text-graphite">{m.name}</span>
                  </div>
                  <p className="flex-1 text-[13.5px] text-steel">{MINER_DESCRIPTION[m.id] ?? "—"}</p>
                  <span className="font-mono text-[12px] text-steel/70">${(m.minPriceUsdc / 1_000_000).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
