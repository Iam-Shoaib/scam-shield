// Background script: the only place that talks to the Scam Shield API.
// Content scripts run inside Gmail's page and never fetch directly —
// this keeps the request privileged (bypasses Gmail's page CSP and CORS
// entirely, since host_permissions makes this an extension-trusted fetch).

browser.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "SCAN_EMAIL") return;
  const tabId = sender.tab?.id;
  if (typeof tabId !== "number") return;

  runScan(message.text, message.maxSpendUsd, tabId).catch((err) => {
    browser.tabs
      .sendMessage(tabId, {
        type: "SCAN_ERROR",
        error: err instanceof Error ? err.message : "Something went wrong.",
      })
      .catch(() => {});
  });

  // Fire-and-forget from the content script's perspective — progress and
  // the final result arrive as separate tabs.sendMessage calls below,
  // since a scan can take well over a minute.
  return Promise.resolve({ started: true });
});

async function runScan(text, maxSpendUsd, tabId) {
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
        await browser.tabs.sendMessage(tabId, { type: "SCAN_PROGRESS", resolved, total: totalTasks });
      } else if (msg.type === "more_tasks") {
        totalTasks += msg.additionalTasks;
        await browser.tabs.sendMessage(tabId, { type: "SCAN_PROGRESS", resolved, total: totalTasks });
      } else if (msg.type === "call") {
        resolved += 1;
        await browser.tabs.sendMessage(tabId, {
          type: "SCAN_CALL",
          call: msg.call,
          resolved,
          total: totalTasks,
        });
      } else if (msg.type === "done") {
        await browser.tabs.sendMessage(tabId, {
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
