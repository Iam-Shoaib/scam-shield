import type { ScanResult } from "@/lib/telegraph/scanTypes";
import type { NormalizedVerdict } from "@/lib/telegraph/types";

export type DisplayVerdict = "safe" | "suspicious" | "scam" | "inconclusive";

/**
 * Maps a scan's stored verdict to what should actually be shown. A scan
 * where every miner call failed carries no real signal — showing "Safe" for
 * that is a false negative, the worst failure mode for a tool like this — so
 * it gets its own neutral "inconclusive" treatment instead of borrowing green.
 */
export function deriveDisplayVerdict(scan: ScanResult): DisplayVerdict {
  if (scan.calls.length > 0 && scan.calls.every((c) => !c.ok)) return "inconclusive";
  if (scan.overallVerdict === "SAFE") return "safe";
  if (scan.overallVerdict === "SUSPICIOUS") return "suspicious";
  return "scam";
}

const VERDICT_WORD: Record<DisplayVerdict, string> = {
  safe: "Safe.",
  suspicious: "Suspicious.",
  scam: "Scam.",
  inconclusive: "Inconclusive.",
};

const TEXT_CLASS: Record<DisplayVerdict, string> = {
  safe: "text-safe-text",
  suspicious: "text-suspicious-text",
  scam: "text-scam-text",
  inconclusive: "text-unknown-text",
};

const PILL_CLASS: Record<DisplayVerdict, string> = {
  safe: "bg-safe-fill text-safe-text ring-safe-border/40",
  suspicious: "bg-suspicious-fill text-suspicious-text ring-suspicious-border/40",
  scam: "bg-scam-fill text-scam-text ring-scam-border/40",
  inconclusive: "bg-unknown-fill text-unknown-text ring-unknown-border/40",
};

/**
 * The verdict as a typographic object — the one bold move on the page.
 * Large serif, verdict-coloured, set as a short spoken sentence rather
 * than a status code.
 */
export function VerdictDisplay({ variant, className = "" }: { variant: DisplayVerdict; className?: string }) {
  return (
    <p
      className={`font-display text-[44px] leading-[1.05] tracking-[-0.01em] sm:text-[56px] ${TEXT_CLASS[variant]} ${className}`}
    >
      {VERDICT_WORD[variant]}
    </p>
  );
}

/** Compact status chip — used in tables and lists where space is tight. */
export function OverallBadge({ scan, className = "" }: { scan: ScanResult; className?: string }) {
  const variant = deriveDisplayVerdict(scan);
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium ring-1 ${PILL_CLASS[variant]} ${className}`}
    >
      {variant}
    </span>
  );
}

const LABEL_CLASS: Record<NormalizedVerdict["label"], string> = {
  clean: "bg-safe-fill text-safe-text",
  suspicious: "bg-suspicious-fill text-suspicious-text",
  malicious: "bg-scam-fill text-scam-text",
  unknown: "bg-unknown-fill text-unknown-text",
};

export function LabelBadge({ label }: { label: NormalizedVerdict["label"] }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium ${LABEL_CLASS[label]}`}>
      {label}
    </span>
  );
}
