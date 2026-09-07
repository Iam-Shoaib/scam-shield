# Scam Shield — web app

The Next.js app: the scan tool, permalink verdict pages, the public ledger,
and the pricing page. See the [repo root README](../README.md) for
screenshots and an overview of what this does.

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
  check/              the scan tool
  scan/[id]/          permalink verdict page + OG image
  ledger/            public ledger
  pricing/           pricing page
  about/             pipeline + miner directory
  api/               scan, scans, stats route handlers
components/          shared UI (VerdictCard, EvidenceTable, Badge, ...)
lib/telegraph/       miner registry + x402 payment client
lib/scam/            entity extraction, language detection, scan orchestrator
```
