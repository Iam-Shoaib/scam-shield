# Scam Shield

**One honest verdict, from twenty places that don't agree on much.**

Paste a suspicious message, email, or link. Scam Shield pays 20+ independent
AI "miners" on the [Telegraph Protocol](https://telegraphprotocol.com)
network — real x402 micropayments, real answers — to check it, then hands
back one plain-language verdict: **Safe**, **Suspicious**, or **Scam**. Every
finding, cost, and cryptographic signal hash is shown in full, not hidden
behind a black-box score.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Telegraph Protocol](https://img.shields.io/badge/Telegraph-Protocol-1F7A50)](https://telegraphprotocol.com)
[![x402](https://img.shields.io/badge/payments-x402-lightgrey)](https://github.com/x402-foundation/x402)

---

## Why it holds up

- **No single point of failure.** Six independent services check link safety
  alone. When one is slow, wrong, or offline, the scan doesn't wait for it —
  the others still reach a verdict.
- **Nothing is hidden.** Every finding, cost, and signal hash is public and
  independently verifiable on the Telegraph explorer — not a percentage you
  have to trust.
- **Paid, not guessed.** Every answer comes from a service with real money
  riding on being right, settled live via x402 on Base Sepolia.

## Screenshots

**One message in, one honest verdict out**

![Landing page](./docs/screenshots/landing.jpg)

**A scam caught, with every finding shown**

![Scan detail page](./docs/screenshots/scan-detail.jpg)

**Every check, publicly auditable**

![Public ledger](./docs/screenshots/ledger.jpg)

**Free during early access — token-based plan coming**

![Pricing page](./docs/screenshots/pricing.jpg)

## How it works

1. Paste a message, email, or link.
2. The text is scanned locally for URLs, emails, and IP addresses — free,
   no miner calls yet.
3. Non-English text is translated first, so every downstream check runs on
   English.
4. The raw text always goes through message-fraud, AI-text, and
   prompt-injection miners.
5. Every URL found is checked for link safety and certificate trust, and its
   page content is extracted and re-analyzed too — catching scam landing
   pages even when the message itself looks clean.
6. Every email and IP found gets its own reputation and geolocation checks.
7. Results are rolled into one verdict, streamed to the page live as each
   miner answers, and published to the public ledger with full evidence.

Full technical breakdown: [`app/about`](./app/about/page.tsx).

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- **MongoDB** — persists every scan for the public ledger and stats
- **`@x402/*`** — pays Telegraph miners live via x402 on Base Sepolia

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | What it's for |
   |---|---|
   | `EVM_PRIVATE_KEY` | Wallet that pays miners via x402. Must hold USDC on Base Sepolia (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`). Server-only, never sent to the client. |
   | `TELEGRAPH_NODE_URL` | Telegraph node base URL — defaults to the public devnode. |
   | `MONGODB_URI` | A local MongoDB instance works fine for development; use Atlas in production. |
   | `SCAN_SPEND_CEILING_USD` | Safety-net ceiling on spend per scan (default `5.00`). The message-level checks always run regardless of this; it only bounds how many URLs/emails/IPs get the full entity-driven fan-out. |

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Requirements

- **Node.js 20+** — the `@x402/*` packages sign payments with the WebCrypto
  API, which Node 18 doesn't expose.
- A funded wallet (see above) — without USDC on the configured wallet, scans
  will run but every miner call will fail at the payment step.

## Scripts

```bash
npm run dev     # start the dev server (Turbopack)
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```

## Project layout

```
app/                 routes (App Router)
  page.tsx           landing page
  check/             the scan tool
  scan/[id]/         permalink verdict page + OG image
  ledger/            public ledger
  pricing/           pricing page
  about/             pipeline + miner directory
  api/               scan, scans, stats route handlers
components/          shared UI (VerdictCard, EvidenceTable, Badge, ...)
lib/telegraph/       miner registry + x402 payment client
lib/scam/            entity extraction, language detection, scan orchestrator
docs/screenshots/    README screenshots
```
