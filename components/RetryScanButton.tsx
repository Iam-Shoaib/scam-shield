"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-submits the same text as a fresh scan and jumps to its result once
 * done — shown only on scans where too many miner calls failed to trust
 * the verdict (see isMajorityFailed in Badge.tsx).
 */
export function RetryScanButton({ text }: { text: string }) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setIsRetrying(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status}).`);
      }
      if (!res.body) throw new Error("This browser doesn't support streamed responses.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let scanId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg.type === "done") scanId = msg.scan.id;
          else if (msg.type === "error") throw new Error(msg.error);
        }
      }

      if (!scanId) throw new Error("Retry didn't return a result.");
      router.push(`/scan/${scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed — try again in a moment.");
      setIsRetrying(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        className="rounded-full bg-graphite px-4 py-2 text-[13px] font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
      >
        {isRetrying ? "Retrying…" : "Retry this check"}
      </button>
      {error && <p className="mt-2 text-[13px] text-scam-text">{error}</p>}
    </div>
  );
}
