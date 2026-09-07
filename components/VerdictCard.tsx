import type { ScanResult } from "@/lib/telegraph/scanTypes";
import { deriveDisplayVerdict, VerdictDisplay, type DisplayVerdict } from "./Badge";
import { ShareToXButton } from "./ShareToXButton";

const HEADLINE: Record<DisplayVerdict, string> = {
  safe: "Nothing here looks wrong.",
  suspicious: "A few things don't add up.",
  scam: "This is almost certainly a scam.",
  inconclusive: "We couldn't get an answer.",
};

const ACCENT_BORDER: Record<DisplayVerdict, string> = {
  safe: "border-l-safe-border",
  suspicious: "border-l-suspicious-border",
  scam: "border-l-scam-border",
  inconclusive: "border-l-unknown-border",
};

function MetaItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-l border-border-default pl-4 text-[13px] text-steel first:border-l-0 first:pl-0">
      {children}
    </span>
  );
}

function InfrastructureNotice({ scan, variant }: { scan: ScanResult; variant: DisplayVerdict }) {
  if (variant !== "inconclusive") return null;

  const paymentFailures = scan.calls.filter((c) => c.error?.includes("402")).length;
  const looksLikeFunding = paymentFailures > scan.calls.length / 2;

  return (
    <div className="mt-6 rounded-lg border border-unknown-border/40 bg-unknown-fill px-4 py-3 text-[13px] text-unknown-text">
      {looksLikeFunding
        ? "None of these checks could be paid for — the wallet funding this app may be out of USDC right now. This isn't a verdict — try again shortly."
        : "No miner could be reached for this scan. This isn't a verdict — see the errors in the evidence below and try again."}
    </div>
  );
}

export function VerdictCard({
  scan,
  permalink,
  className = "",
}: {
  scan: ScanResult;
  permalink?: string;
  className?: string;
}) {
  const variant = deriveDisplayVerdict(scan);

  return (
    <div
      className={`animate-rise-in rounded-[20px] border border-border-default border-l-4 bg-paper-raised px-6 py-8 sm:px-10 sm:py-10 ${ACCENT_BORDER[variant]} ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <VerdictDisplay variant={variant} />
        <ShareToXButton scan={scan} permalink={permalink} />
      </div>

      <p className="mt-3 text-[17px] text-graphite">{HEADLINE[variant]}</p>

      {variant !== "inconclusive" && scan.reasonBullets.length > 0 && (
        <ul className="mt-6 space-y-2.5">
          {scan.reasonBullets.map((bullet, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-[1.55] text-graphite/90">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-steel" aria-hidden />
              {bullet}
            </li>
          ))}
        </ul>
      )}

      <InfrastructureNotice scan={scan} variant={variant} />

      {scan.detectedNonEnglish && scan.translatedText && (
        <p className="mt-6 rounded-lg bg-fog/50 px-4 py-3 text-[13px] text-steel">
          Detected non-English input — analysis ran on a translated copy via LangWire.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-4 border-t border-border-default pt-5">
        <MetaItem>{scan.totalCalls} miner calls</MetaItem>
        <MetaItem>{scan.uniqueMinersUsed} unique miners</MetaItem>
        <MetaItem>${scan.totalCostUsd.toFixed(4)} paid via x402</MetaItem>
        <MetaItem>{new Date(scan.createdAt).toLocaleString()}</MetaItem>
      </div>

      {scan.skippedEntities.length > 0 && (
        <p className="mt-3 text-[13px] text-steel">
          {scan.skippedEntities.length} entit{scan.skippedEntities.length === 1 ? "y" : "ies"} skipped (spend
          ceiling).
        </p>
      )}
    </div>
  );
}
