"use client";

import { useState } from "react";
import type { ScanResult } from "@/lib/telegraph/scanTypes";

function buildTweetText(scan: ScanResult, permalink?: string): string {
  const verdictLine =
    scan.overallVerdict === "SCAM"
      ? "Scam Shield caught a scam 🚨"
      : scan.overallVerdict === "SUSPICIOUS"
        ? "Scam Shield flagged this as suspicious ⚠️"
        : "Scam Shield gave this a clean bill of health ✅";

  const lines = [
    verdictLine,
    `Cross-checked across ${scan.uniqueMinersUsed} independent @Telegraphprotoc miners (${scan.totalCalls} paid calls, $${scan.totalCostUsd.toFixed(2)}).`,
  ];
  if (permalink) lines.push(permalink);
  return lines.join("\n\n");
}

export function ShareToXButton({ scan, permalink }: { scan: ScanResult; permalink?: string }) {
  const [copied, setCopied] = useState(false);
  const text = buildTweetText(scan, permalink);
  const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

  async function copyLink() {
    if (!permalink) return;
    try {
      await navigator.clipboard.writeText(permalink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable — silently no-op, the link is still shareable via the X button
    }
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-border-default px-3.5 py-1.5 text-[13px] font-medium text-graphite transition hover:bg-fog/50"
      >
        Share to X
      </a>
      {permalink && (
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-border-default px-3 text-[13px] text-steel transition hover:bg-fog/50"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      )}
    </div>
  );
}
