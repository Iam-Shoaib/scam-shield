// Background script: the only place that talks to the Scam Shield API.
// Content scripts run inside Gmail's page and never fetch directly —
// this keeps the request privileged (bypasses Gmail's page CSP and CORS
// entirely, since host_permissions makes this an extension-trusted fetch).
//
// Scans are driven over a long-lived runtime.Port rather than one-off
// runtime.sendMessage/tabs.sendMessage calls. Firefox treats this MV3
// background script as a non-persistent event page and evicts it after
// ~30s of what it considers idle time — a raw fetch() awaiting stream
// chunks doesn't reset that timer. Since payments are sent strictly
// sequentially and a slow miner can eat its full 30s timeout, a scan
// easily runs past that window; without a port, the background page gets
// killed mid-stream, the scan still finishes and saves server-side, but
// the extension never hears about it. Holding the port open for the
// scan's duration keeps the background page alive to relay every event.
browser.runtime.onConnect.addListener((port) => {
  if (port.name !== "scan") return;

  port.onMessage.addListener((message) => {
    if (message?.type !== "SCAN_EMAIL") return;
    runScan(message.text, message.maxSpendUsd, port).catch((err) => {
      try {
        port.postMessage({
          type: "SCAN_ERROR",
          error: err instanceof Error ? err.message : "Something went wrong.",
        });
      } catch {
        // Port already disconnected (e.g. the Gmail tab was closed) — nothing to relay to.
      }
    });
  });
});

async function runScan(text, maxSpendUsd, port) {
  const res = await fetch(`${API_ORIGIN}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, maxSpendUsd }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Request failed (${res.status}).`);
  }
  if (!res.body) throw new Error("This browser doesn't support streamed responses.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let totalTasks = 0;
  let resolved = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;

      const msg = JSON.parse(line);

      if (msg.type === "start") {
        totalTasks = msg.totalTasks;
        port.postMessage({ type: "SCAN_PROGRESS", resolved, total: totalTasks });
      } else if (msg.type === "more_tasks") {
        totalTasks += msg.additionalTasks;
        port.postMessage({ type: "SCAN_PROGRESS", resolved, total: totalTasks });
      } else if (msg.type === "call") {
        resolved += 1;
        port.postMessage({
          type: "SCAN_CALL",
          call: msg.call,
          resolved,
          total: totalTasks,
        });
      } else if (msg.type === "done") {
        port.postMessage({
          type: "SCAN_RESULT",
          scan: msg.scan,
          detailsUrl: `${WEB_APP_ORIGIN}/scan/${msg.scan.id}`,
        });
      } else if (msg.type === "error") {
        throw new Error(msg.error);
      }
    }
  }
}
