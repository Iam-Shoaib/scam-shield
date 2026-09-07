# Scam Shield for Gmail (Firefox extension)

Injects a "Check with Scam Shield" button above any opened Gmail email.
Clicking it opens a small modal — pick how thorough the check should be
(Base / Medium / Heavy), hit **Start check**, and watch a live log of each
miner answering in real time, ending in a Safe/Suspicious/Scam/Inconclusive
verdict with a link to the full report on the web app.

## Load it in Firefox (unpacked, for testing)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `manifest.json` in this folder.
4. Open [mail.google.com](https://mail.google.com), open any email, and the
   button should appear on the right, just below the subject line.

Temporary add-ons are removed when Firefox closes — reload from
`about:debugging` each session while testing.

## Config

`config.js` holds `API_ORIGIN` and `WEB_APP_ORIGIN`. Both currently point
at the deployed app (`https://scam-shield-rouge.vercel.app`). To test
against a local `npm run dev` server instead, edit `config.js` to use
`http://localhost:3000` (both lines are already there, just commented).

If you change either origin, add it to `host_permissions` in
`manifest.json` too, or the background script's fetch will be blocked.

## How it works

- `content/gmail.js` watches Gmail's DOM for an opened email (`h2.hP` is
  Gmail's subject heading), injects the button, and extracts the sender,
  subject, and body as plain text.
- Clicking the button opens a modal. Picking a priority (Base/Medium/Heavy)
  maps to the same spend-ceiling presets as the web app (~$0.15/$0.50/$2.00)
  and is sent as `maxSpendUsd`.
- **Start check** opens a long-lived `browser.runtime.connect` port to
  `background.js` and sends `{type: "SCAN_EMAIL", text, maxSpendUsd}` over
  it. A port, not a one-off `sendMessage`, on purpose: Firefox evicts this
  extension's background page after ~30s of what it considers idle time,
  and a scan (payments run strictly sequentially, and a slow miner can eat
  its full 30s timeout) routinely runs past that. Holding the port open
  isn't enough by itself, though — Firefox only resets the idle timer when
  the background page actually receives something through it — so the
  content script also pings the port every 8s for as long as the scan is
  running, purely to generate that traffic.
- `background.js` is the only thing that talks to the network — it POSTs
  to `/api/scan`, reads the same streamed NDJSON progress the web app
  uses, and relays each miner's result back over the port as it resolves.
- The modal renders each incoming result as a compact log row (miner name,
  colored verdict badge, reason) in real time, then shows the final verdict
  — a large colored word matching the web app's own treatment — with a link
  to the full `/scan/[id]` report.
- If you close the modal while a scan is still running, the result still
  arrives as a bottom-right toast instead, so you don't lose it.
- Every scan gets its `/scan/{id}` report the moment it starts — well
  before it finishes — so if the port to the background script is ever
  lost mid-scan despite the keepalive ping, the modal shows a link to that
  report instead of just an error: the scan keeps running and finalizing
  server-side regardless of whether the extension is still listening.

## Known limitation

The DOM selectors used to find the subject (`h2.hP`), sender (`.gD`), and
body (`.a3s.aiL`) are Gmail's actual current classes, but they're
undocumented and can change when Gmail ships a redesign. If the button
stops appearing, that's the first place to check.
