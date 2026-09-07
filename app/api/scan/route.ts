import { runScan } from "@/lib/scam/runScan";
import { saveScan } from "@/lib/scam/scanStore";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
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

      try {
        const scan = await runScan(
          text.trim(),
          {
            onStart: (totalTasks) => send({ type: "start", totalTasks }),
            onMoreTasks: (additionalTasks) => send({ type: "more_tasks", additionalTasks }),
            onCall: (call) => send({ type: "call", call }),
          },
          { maxSpendUsd }
        );
        const id = await saveScan(scan);
        send({ type: "done", scan: { ...scan, id } });
      } catch (err) {
        console.error("scan failed", err);
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
