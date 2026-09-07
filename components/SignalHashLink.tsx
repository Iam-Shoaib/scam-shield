"use client";

import { useState } from "react";

const TELEGRAPH_EXPLORER_URL = process.env.NEXT_PUBLIC_TELEGRAPH_EXPLORER_URL ?? "https://explorer.telegraphprotocol.com";

export function SignalHashLink({ hash }: { hash: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!hash) return <span className="text-steel/50">—</span>;
  const value: string = hash;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the verify link still works
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
      <a
        href={`${TELEGRAPH_EXPLORER_URL}/signal/${hash}`}
        target="_blank"
        rel="noreferrer"
        title="Verify this call on the Telegraph explorer"
        className="text-steel underline decoration-border-default underline-offset-2 transition hover:text-graphite"
      >
        {hash.slice(0, 10)}…
      </a>
      <button
        type="button"
        onClick={copy}
        title="Copy signal hash"
        className="flex shrink-0 items-center justify-center text-steel transition hover:text-graphite"
      >
        {copied ? (
          <span className="text-[11px] text-safe-text">✓</span>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </span>
  );
}
