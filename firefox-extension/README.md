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
- **Start check** sends `{type: "SCAN_EMAIL", text, maxSpendUsd}` to
  `background.js` via `browser.runtime.sendMessage`.
- `background.js` is the only thing that talks to the network — it POSTs
  to `/api/scan`, reads the same streamed NDJSON progress the web app
  uses, and relays each miner's result back to the tab via
  `browser.tabs.sendMessage` as it resolves.
- The modal renders each incoming result as a compact log row (miner name,
  colored verdict badge, reason) in real time, then shows the final verdict
  — a large colored word matching the web app's own treatment — with a link
  to the full `/scan/[id]` report.
- If you close the modal while a scan is still running, the result still
  arrives as a bottom-right toast instead, so you don't lose it.

## Known limitation

The DOM selectors used to find the subject (`h2.hP`), sender (`.gD`), and
body (`.a3s.aiL`) are Gmail's actual current classes, but they're
undocumented and can change when Gmail ships a redesign. If the button
stops appearing, that's the first place to check.
