import { runScan } from "@/lib/scam/runScan";
import { createPendingScan, deletePendingScan, finalizeScan } from "@/lib/scam/scanStore";
import { checkRateLimit, clientIpFrom } from "@/lib/scam/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(clientIpFrom(request));
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: `Too many checks from this connection — try again in ${rateLimit.retryAfterSeconds}s.`,
      }),
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), { status: 400 });
  }

  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string" || !text.trim()) {
    return new Response(JSON.stringify({ error: "Provide a non-empty `text` field." }), { status: 400 });
  }
  if (text.length > 20000) {
    return new Response(JSON.stringify({ error: "Text is too long (max 20,000 characters)." }), { status: 400 });
  }

  const rawMaxSpend = (body as { maxSpendUsd?: unknown })?.maxSpendUsd;
  const maxSpendUsd =
    typeof rawMaxSpend === "number" && Number.isFinite(rawMaxSpend) && rawMaxSpend >= 0 ? rawMaxSpend : undefined;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: object) => {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      };

      // Created before any miner is called so callers with a fragile
      // connection (the Firefox extension's background page can be
      // evicted mid-stream) have a stable /scan/{id} link to fall back on
      // even if they never see the "done" event — the scan finishes and
      // finalizes under this same id regardless of who's still listening.
      let scanId: string | undefined;
      try {
        scanId = await createPendingScan(text.trim());
        const scan = await runScan(
          text.trim(),
          {
            onStart: (totalTasks) => send({ type: "start", totalTasks, scanId }),
            onMoreTasks: (additionalTasks) => send({ type: "more_tasks", additionalTasks }),
            onCall: (call) => send({ type: "call", call }),
          },
          { maxSpendUsd }
        );
        await finalizeScan(scanId, scan);
        send({ type: "done", scan: { ...scan, id: scanId } });
      } catch (err) {
        console.error("scan failed", err);
        if (scanId) await deletePendingScan(scanId).catch(() => {});
        send({ type: "error", error: err instanceof Error ? err.message : "Scan failed." });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
