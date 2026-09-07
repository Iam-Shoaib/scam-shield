# Scam Shield

Paste a suspicious message, email, or link. Scam Shield pays 20+ independent
AI "miners" on the [Telegraph Protocol](https://telegraphprotocol.com) network
to check it — link safety, certificate trust, sender reputation, scam-pattern
classifiers, AI-generated-text detection, prompt-injection detection — and
hands back one honest verdict, with every finding, cost, and cryptographic
signal hash shown in full.

## Structure

This is a monorepo. Each package is independent (its own `package.json`,
its own `node_modules`) — there's no shared build tooling between them.

| Package | Status | Description |
|---|---|---|
| [`web/`](./web) | Live | Next.js web app — the scan tool, public ledger, and pricing page. |
| `extension/` | Planned | Browser extension for scanning links/messages inline while browsing. |
| `mobile/` | Planned | Android app for automatic SMS scam detection. |

## Development

Each package has its own README with setup instructions. Start with
[`web/README.md`](./web/README.md).
