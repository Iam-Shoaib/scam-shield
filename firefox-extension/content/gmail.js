// Content script: runs inside mail.google.com. Detects an opened email,
// injects the "Check with Scam Shield" button, and drives the check modal.
// Never fetches directly — everything goes through the background script.

const SHIELD_ICON = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 2.5 27 6.5v8.2c0 8-4.6 13.4-11 14.8-6.4-1.4-11-6.8-11-14.8V6.5L16 2.5Z" fill="currentColor"/>
  <path d="M11.5 16.3 14.6 19.4 20.8 12.8" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const VERDICT_WORD = {
  safe: "Safe.",
  suspicious: "Suspicious.",
  scam: "Scam.",
  inconclusive: "Inconclusive.",
};

const HEADLINE = {
  safe: "Nothing here looks wrong.",
  suspicious: "A few things don't add up.",
  scam: "This is almost certainly a scam.",
  inconclusive: "We couldn't get an answer.",
};

const PRIORITIES = [
  { key: "base", label: "Base", maxSpendUsd: 0.15, hint: "~$0.15" },
  { key: "medium", label: "Medium", maxSpendUsd: 0.5, hint: "~$0.50" },
  { key: "heavy", label: "Heavy", maxSpendUsd: 2, hint: "~$2.00" },
];

function deriveVariant(scan) {
  if (scan.calls?.length > 0 && scan.calls.every((c) => !c.ok)) return "inconclusive";
  if (scan.overallVerdict === "SAFE") return "safe";
  if (scan.overallVerdict === "SUSPICIOUS") return "suspicious";
  return "scam";
}

function labelFor(call) {
  if (!call.ok) return "error";
  return call.verdict?.label ?? "unknown";
}

function reasonFor(call) {
  if (call.ok) return call.verdict?.reason ?? "—";
  return "This miner didn't answer — the verdict is built from the ones that did.";
}

let currentSubjectEl = null;
let scanning = false;
let selectedPriority = "medium";
let modalIsOpen = false;

function extractEmailText() {
  const subject = document.querySelector("h2.hP")?.textContent?.trim() ?? "";

  const senderEls = Array.from(document.querySelectorAll(".gD"));
  const senders = senderEls
    .map((el) => el.getAttribute("email") || el.getAttribute("name") || el.textContent)
    .filter(Boolean)
    .slice(0, 1);

  const bodyEls = Array.from(document.querySelectorAll(".a3s.aiL")).filter((el) => el.offsetParent !== null);
  const body = bodyEls.map((el) => el.innerText.trim()).join("\n\n");

  return [`From: ${senders[0] ?? "unknown"}`, `Subject: ${subject}`, "", body].join("\n").slice(0, 20000);
}

// ---------------------------------------------------------------------------
// Fallback toast — only used if the user closes the modal mid-scan, so they
// still find out what happened.
// ---------------------------------------------------------------------------

function getToast() {
  let toast = document.getElementById("ss-toast-root");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "ss-toast-root";
    toast.className = "ss-toast";
    document.body.appendChild(toast);
  }
  return toast;
}

function removeToast() {
  document.getElementById("ss-toast-root")?.remove();
}

function renderResultToast(scan, detailsUrl) {
  const variant = deriveVariant(scan);
  const toast = getToast();
  toast.dataset.variant = variant;
  toast.innerHTML = `
    <div class="ss-toast-header">
      <p class="ss-toast-title">${VERDICT_WORD[variant]}</p>
      <button class="ss-toast-close" type="button" aria-label="Close">✕</button>
    </div>
    <p class="ss-toast-body">${HEADLINE[variant]}</p>
    <a class="ss-toast-link" href="${detailsUrl}" target="_blank" rel="noreferrer">See full report →</a>
  `;
  toast.querySelector(".ss-toast-close").addEventListener("click", removeToast);
  setTimeout(removeToast, 25000);
}

function renderErrorToast(message) {
  const toast = getToast();
  toast.dataset.variant = "inconclusive";
  toast.innerHTML = `
    <div class="ss-toast-header">
      <p class="ss-toast-title">Couldn't check this</p>
      <button class="ss-toast-close" type="button" aria-label="Close">✕</button>
    </div>
    <p class="ss-toast-body">${message}</p>
  `;
  toast.querySelector(".ss-toast-close").addEventListener("click", removeToast);
}

// ---------------------------------------------------------------------------
// Modal — the main interaction surface
// ---------------------------------------------------------------------------

function buildModal() {
  const backdrop = document.createElement("div");
  backdrop.id = "ss-modal-backdrop";
  backdrop.className = "ss-modal-backdrop";
  backdrop.innerHTML = `
    <div class="ss-modal" role="dialog" aria-modal="true">
      <div class="ss-modal-header">
        <div class="ss-modal-title-row">
          <span class="ss-modal-shield">${SHIELD_ICON}</span>
          <p class="ss-modal-title">Check with Scam Shield</p>
        </div>
        <button id="ss-modal-close" class="ss-toast-close" type="button" aria-label="Close">✕</button>
      </div>

      <div id="ss-modal-selector" class="ss-modal-body">
        <p class="ss-modal-sub">Choose how thorough the check should be.</p>
        <div class="ss-priority-row">
          ${PRIORITIES.map(
            (p) =>
              `<button type="button" class="ss-priority-btn${p.key === selectedPriority ? " ss-priority-selected" : ""}" data-key="${p.key}">${p.label}<span>${p.hint}</span></button>`
          ).join("")}
        </div>
        <button id="ss-start-button" class="ss-start-button" type="button">Start check</button>
      </div>

      <div id="ss-modal-progress" class="ss-modal-body" hidden>
        <div class="ss-progress-line"><span class="ss-spinner"></span><span id="ss-progress-text">Reading the message…</span></div>
        <div id="ss-log-list" class="ss-log-list"></div>
      </div>

      <div id="ss-modal-result" class="ss-modal-body" hidden>
        <p id="ss-result-word" class="ss-result-word"></p>
        <p id="ss-result-headline" class="ss-result-headline"></p>
        <div id="ss-log-list-final" class="ss-log-list"></div>
        <a id="ss-details-link" class="ss-start-button ss-details-link" target="_blank" rel="noreferrer">See full report on the web app →</a>
      </div>

      <div id="ss-modal-error" class="ss-modal-body" hidden>
        <p id="ss-error-text" class="ss-toast-body"></p>
      </div>
    </div>
  `;
  return backdrop;
}

function openModal() {
  closeModal();
  const modal = buildModal();
  document.body.appendChild(modal);
  modalIsOpen = true;

  modal.querySelector("#ss-modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelectorAll(".ss-priority-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPriority = btn.dataset.key;
      modal.querySelectorAll(".ss-priority-btn").forEach((b) => b.classList.toggle("ss-priority-selected", b === btn));
    });
  });

  modal.querySelector("#ss-start-button").addEventListener("click", () => beginScanFromModal(modal));
}

function closeModal() {
  document.getElementById("ss-modal-backdrop")?.remove();
  modalIsOpen = false;
}

function appendLogRow(container, call) {
  const label = labelFor(call);
  const row = document.createElement("div");
  row.className = "ss-log-row";
  row.innerHTML = `
    <div class="ss-log-row-head">
      <span class="ss-log-miner">${call.minerName}</span>
      <span class="ss-log-badge" data-label="${label}">${label}</span>
    </div>
    <p class="ss-log-reason">${reasonFor(call)}</p>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function beginScanFromModal(modal) {
  const button = document.getElementById("ss-check-button");
  if (button) setButtonState(button, "loading");
  scanning = true;

  modal.querySelector("#ss-modal-selector").hidden = true;
  modal.querySelector("#ss-modal-progress").hidden = false;

  const preset = PRIORITIES.find((p) => p.key === selectedPriority) ?? PRIORITIES[1];
  const text = extractEmailText();

  // A long-lived port, not a one-off sendMessage: Firefox evicts this
  // extension's non-persistent background page after ~30s idle, and a
  // scan (strictly-sequential payments, up to a 30s timeout per miner)
  // routinely runs past that. Keeping the port open for the scan's whole
  // lifetime is what keeps the background page — and the stream it's
  // relaying from — alive long enough to finish.
  let settled = false;
  let port;
  try {
    port = browser.runtime.connect({ name: "scan" });
  } catch {
    scanning = false;
    if (button) setButtonState(button, "idle");
    showModalError("Couldn't reach the extension background script.");
    return;
  }

  port.onMessage.addListener((message) => {
    if (message.type === "SCAN_RESULT" || message.type === "SCAN_ERROR") {
      settled = true;
    }
    handleScanMessage(message);
  });

  port.onDisconnect.addListener(() => {
    if (settled) return;
    scanning = false;
    if (button) setButtonState(button, "idle");
    showModalError("Lost connection to the extension while checking — please try again.");
  });

  port.postMessage({ type: "SCAN_EMAIL", text, maxSpendUsd: preset.maxSpendUsd });
}

function showModalError(message) {
  const modal = document.getElementById("ss-modal-backdrop");
  if (!modal) {
    renderErrorToast(message);
    return;
  }
  modal.querySelector("#ss-modal-progress").hidden = true;
  modal.querySelector("#ss-modal-selector").hidden = true;
  modal.querySelector("#ss-modal-error").hidden = false;
  modal.querySelector("#ss-error-text").textContent = message;
}

function handleScanMessage(message) {
  const modal = document.getElementById("ss-modal-backdrop");

  if (message.type === "SCAN_PROGRESS") {
    if (modal) {
      const el = modal.querySelector("#ss-progress-text");
      if (el) {
        el.textContent =
          message.total > 0 ? `${message.resolved} of ${message.total} miners have answered…` : "Reading the message…";
      }
    }
  } else if (message.type === "SCAN_CALL") {
    if (modal) {
      const progressText = modal.querySelector("#ss-progress-text");
      if (progressText) {
        progressText.textContent =
          message.total > 0 ? `${message.resolved} of ${message.total} miners have answered…` : "Checking…";
      }
      appendLogRow(modal.querySelector("#ss-log-list"), message.call);
    }
  } else if (message.type === "SCAN_RESULT") {
    scanning = false;
    const button = document.getElementById("ss-check-button");
    if (button) setButtonState(button, "idle");

    if (modal) {
      const variant = deriveVariant(message.scan);
      modal.querySelector("#ss-modal-progress").hidden = true;
      modal.querySelector("#ss-modal-result").hidden = false;
      const wordEl = modal.querySelector("#ss-result-word");
      wordEl.textContent = VERDICT_WORD[variant];
      wordEl.dataset.variant = variant;
      modal.querySelector("#ss-result-headline").textContent = HEADLINE[variant];
      modal.querySelector("#ss-details-link").href = message.detailsUrl;

      const finalLog = modal.querySelector("#ss-log-list-final");
      message.scan.calls
        .slice()
        .sort((a, b) => {
          const rank = { malicious: 0, suspicious: 1, unknown: 2, clean: 3 };
          const ra = a.verdict ? rank[a.verdict.label] ?? 4 : 4;
          const rb = b.verdict ? rank[b.verdict.label] ?? 4 : 4;
          return ra - rb;
        })
        .forEach((call) => appendLogRow(finalLog, call));
    } else {
      renderResultToast(message.scan, message.detailsUrl);
    }
  } else if (message.type === "SCAN_ERROR") {
    scanning = false;
    const button = document.getElementById("ss-check-button");
    if (button) setButtonState(button, "idle");
    showModalError(message.error);
  }
}

// ---------------------------------------------------------------------------
// Button injection
// ---------------------------------------------------------------------------

function setButtonState(button, state) {
  if (state === "loading") {
    button.disabled = true;
    button.innerHTML = `<span class="ss-spinner"></span> Checking…`;
  } else {
    button.disabled = false;
    button.innerHTML = `${SHIELD_ICON} Check with Scam Shield`;
  }
}

function injectButton(subjectEl) {
  const row = document.createElement("div");
  row.className = "ss-button-row";
  row.innerHTML = `<button id="ss-check-button" class="ss-check-button" type="button">${SHIELD_ICON} Check with Scam Shield</button>`;
  subjectEl.insertAdjacentElement("afterend", row);
  row.querySelector("#ss-check-button").addEventListener("click", () => {
    if (scanning) return;
    openModal();
  });
}

function checkForOpenEmail() {
  const subjectEl = document.querySelector("h2.hP");
  if (!subjectEl || subjectEl === currentSubjectEl) return;

  currentSubjectEl = subjectEl;
  document.querySelectorAll(".ss-button-row").forEach((el) => el.remove());
  removeToast();
  closeModal();
  scanning = false;
  injectButton(subjectEl);
}

let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(checkForOpenEmail, 300);
});

observer.observe(document.body, { childList: true, subtree: true });
checkForOpenEmail();
