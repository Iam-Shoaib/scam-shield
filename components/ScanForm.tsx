"use client";

import { useRef, useState } from "react";
import type { MinerCallRecord, ScanResult } from "@/lib/telegraph/scanTypes";
import { VerdictCard } from "./VerdictCard";
import { EvidenceTable } from "./EvidenceTable";

const EXAMPLES = [
  {
    label: "Fake delivery text",
    text: "USPS: Your package could not be delivered due to an incomplete address. Update your delivery preferences within 24 hours: http://usps-tracking-update.example/confirm",
  },
  {
    label: "Phishing \"account suspended\" email",
    text: "Your account has been temporarily suspended due to unusual sign-in activity. Verify your identity within 24 hours to avoid permanent suspension: http://secure-verify-account.example/login",
  },
  {
    label: "Legitimate newsletter link",
    text: "Thanks for subscribing! Read this week's roundup on our blog: https://stripe.com/blog",
  },
];

type StreamMessage =
  | { type: "start"; totalTasks: number }
  | { type: "more_tasks"; additionalTasks: number }
  | { type: "call"; call: MinerCallRecord }
  | { type: "done"; scan: ScanResult }
  | { type: "error"; error: string };

type Phase = "idle" | "streaming" | "done" | "error";

const SPEND_PRESETS = [
  { key: "essentials", label: "Essentials", maxSpendUsd: 0.15, hint: "message only, ~$0.15" },
  { key: "standard", label: "Standard", maxSpendUsd: 0.5, hint: "message + links, ~$0.50" },
  { key: "thorough", label: "Thorough", maxSpendUsd: 2, hint: "everything found, ~$2.00" },
] as const;

type SpendPresetKey = (typeof SPEND_PRESETS)[number]["key"];

export function ScanForm() {
  const [text, setText] = useState("");
  const [spendPreset, setSpendPreset] = useState<SpendPresetKey>("standard");
  const [phase, setPhase] = useState<Phase>("idle");
  const [totalTasks, setTotalTasks] = useState(0);
  const [liveCalls, setLiveCalls] = useState<MinerCallRecord[]>([]);
  const [finalScan, setFinalScan] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || phase === "streaming") return;

    setPhase("streaming");
    setErrorMessage(null);
    setFinalScan(null);
    setLiveCalls([]);
    setTotalTasks(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const maxSpendUsd = SPEND_PRESETS.find((p) => p.key === spendPreset)?.maxSpendUsd;
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, maxSpendUsd }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status}).`);
      }
      if (!res.body) throw new Error("This browser doesn't support streamed responses.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;

          const msg = JSON.parse(line) as StreamMessage;
          if (msg.type === "start") setTotalTasks(msg.totalTasks);
          else if (msg.type === "more_tasks") setTotalTasks((t) => t + msg.additionalTasks);
          else if (msg.type === "call") setLiveCalls((prev) => [...prev, msg.call]);
          else if (msg.type === "done") {
            setFinalScan(msg.scan);
            setPhase("done");
          } else if (msg.type === "error") {
            throw new Error(msg.error);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setErrorMessage(describeError(err instanceof Error ? err.message : "Something went wrong."));
      setPhase("error");
    }
  }

  const resolved = liveCalls.length;
  const isStreaming = phase === "streaming";

  return (
    <div className="space-y-8">
      <div>
        <form onSubmit={handleSubmit}>
          <div
            className={`rounded-2xl border bg-paper-raised transition ${
              isStreaming ? "border-border-default" : "border-border-default focus-within:border-graphite/40"
            }`}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Paste the suspicious message, email, or link here…\n\ne.g. "Congratulations! You’ve won a $1000 gift card. Claim now: hxxp://amaz0n-rewards.example/claim"'}
              rows={5}
              disabled={isStreaming}
              className="w-full resize-y bg-transparent px-5 py-4 text-[15px] leading-[1.6] text-graphite outline-none placeholder:text-steel/70 disabled:opacity-60"
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-border-default px-5 pt-3">
              <span className="text-[12px] text-steel">Spend limit</span>
              <div className="flex gap-1.5">
                {SPEND_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => setSpendPreset(preset.key)}
                    title={preset.hint}
                    className={`rounded-full border px-3 py-1 text-[12px] transition disabled:opacity-50 ${
                      spendPreset === preset.key
                        ? "border-graphite bg-graphite text-paper"
                        : "border-border-default text-steel hover:border-graphite/40 hover:text-graphite"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <p className="text-[12px] text-steel">
                {SPEND_PRESETS.find((p) => p.key === spendPreset)?.hint}
              </p>
              <button
                type="submit"
                disabled={isStreaming || !text.trim()}
                className="rounded-full bg-graphite px-5 py-2 text-[14px] font-medium text-paper transition hover:opacity-90 disabled:opacity-30"
              >
                {isStreaming ? `Checking with ${totalTasks || "…"} miners` : "Check message"}
              </button>
            </div>
          </div>

          {phase === "idle" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => setText(ex.text)}
                  className="rounded-full border border-border-default px-3 py-1.5 text-[12px] text-steel transition hover:border-graphite/40 hover:text-graphite"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          )}
        </form>

        {isStreaming && (
          <div className="mt-6 flex items-center gap-3 text-[13px] text-steel">
            <video
              src="/Animation.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              aria-hidden
            />
            {totalTasks > 0
              ? `${resolved} of ${totalTasks} miners have answered…`
              : "Reading the message and finding what to check…"}
          </div>
        )}

        {phase === "error" && errorMessage && (
          <div className="mt-6 rounded-lg border border-scam-border/30 bg-scam-subtle px-4 py-3 text-[14px] text-scam-text">
            {errorMessage}
          </div>
        )}
      </div>

      {isStreaming && liveCalls.length > 0 && <EvidenceTable calls={liveCalls} live />}

      {phase === "done" && finalScan && (
        <div className="space-y-4">
          <VerdictCard
            scan={finalScan}
            permalink={typeof window !== "undefined" ? `${window.location.origin}/scan/${finalScan.id}` : undefined}
          />
          <EvidenceTable calls={finalScan.calls} />
        </div>
      )}
    </div>
  );
}

function describeError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "Couldn't reach Scam Shield — check your connection and try again.";
  }
  if (lower.includes("too long")) {
    return message;
  }
  return message || "Something went wrong while checking this. Try again in a moment.";
}
