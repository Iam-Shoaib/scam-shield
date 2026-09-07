import "server-only";

import pLimit from "p-limit";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";

const BASE_SEPOLIA_CAIP2 = "eip155:84532";

// The facilitator settlement path can't reliably keep up with concurrent
// payments from one wallet — firing several at once (runScan's task
// concurrency is 6) reproducibly caused a wave of bare-402 failures even with
// funds available. Payments from this wallet are therefore strictly
// sequential: one settles before the next one is even attempted.
const paymentLimit = pLimit(1);

let fetchWithPaymentSingleton: typeof fetch | null = null;

function getFetchWithPayment(): typeof fetch {
  if (fetchWithPaymentSingleton) return fetchWithPaymentSingleton;

  const privateKey = process.env.EVM_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("EVM_PRIVATE_KEY is not set");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = new x402Client().register(
    BASE_SEPOLIA_CAIP2,
    new ExactEvmScheme(account)
  );

  fetchWithPaymentSingleton = wrapFetchWithPayment(fetch, client);
  return fetchWithPaymentSingleton;
}

export type MinerCallSuccess = {
  ok: true;
  minerId: string;
  minerName: string;
  result: unknown;
  cost_usd: number;
  duration_ms: number;
  signal_hash: string | null;
};

export type MinerCallFailure = {
  ok: false;
  minerId: string;
  minerName: string | null;
  error: string;
  duration_ms: number;
};

export type MinerCallResult = MinerCallSuccess | MinerCallFailure;

type ProceedAnywayBody = {
  error?: string;
  proceed_anyway?: { field: string; value: unknown };
  warnings?: string[];
};

async function askOnce(
  nodeUrl: string,
  minerId: string,
  method: "GET" | "POST",
  endpoint: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
  extra?: Record<string, unknown>
): Promise<Response> {
  const fetchWithPayment = getFetchWithPayment();
  return paymentLimit(() =>
    fetchWithPayment(`${nodeUrl}/engine/v1/ask/${minerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, endpoint, payload, ...extra }),
      signal,
    })
  );
}

type AttemptOutcome =
  | { kind: "success"; res: Response }
  | { kind: "payment-failed"; status: number }
  | { kind: "hard-failure"; error: string };

async function attemptOnce(
  nodeUrl: string,
  minerId: string,
  method: "GET" | "POST",
  endpoint: string,
  payload: Record<string, unknown>,
  signal: AbortSignal
): Promise<AttemptOutcome> {
  let res = await askOnce(nodeUrl, minerId, method, endpoint, payload, signal);

  if (res.status === 422) {
    const warningBody = (await res.json().catch(() => null)) as ProceedAnywayBody | null;
    const proceed = warningBody?.proceed_anyway;
    if (proceed?.field) {
      res = await askOnce(nodeUrl, minerId, method, endpoint, payload, signal, {
        [proceed.field]: proceed.value,
      });
    } else {
      return { kind: "hard-failure", error: `HTTP 422: ${JSON.stringify(warningBody ?? {}).slice(0, 500)}` };
    }
  }

  // A bare 402 even after the wrapper attached a payment signature means the
  // settlement itself was rejected — usually a nonce collision from firing
  // several payments from the same wallet concurrently. Worth a fresh retry
  // with a brand-new signature/nonce rather than a hard failure.
  if (res.status === 402) {
    return { kind: "payment-failed", status: 402 };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { kind: "hard-failure", error: `HTTP ${res.status}: ${text.slice(0, 500)}` };
  }

  return { kind: "success", res };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_PAYMENT_RETRIES = 3;
const MINER_TIMEOUT_MS = 30_000;

/**
 * Calls a Telegraph miner through the paid Engine endpoint. Never throws —
 * a miner-side failure (bad payload, unregistered miner, upstream error)
 * comes back as MinerCallFailure, per Telegraph's docs failed calls are
 * never charged.
 *
 * Two documented/observed conditions get an automatic retry, each safe
 * because you're only charged when a call actually runs:
 * - 422 "request is predicted to fail" with a `proceed_anyway` hint.
 * - A bare 402 even with a payment signature attached, which in practice is
 *   a settlement race from concurrent payments off the same wallet rather
 *   than a real decline — a fresh signature/nonce usually clears it.
 *
 * The whole call — including retries — is bounded to MINER_TIMEOUT_MS. One
 * AbortController spans the entire attempt: x402's fetch wrapper clones the
 * initial Request for its own internal payment retry, and a clone shares
 * its parent's AbortSignal, so aborting here cancels whichever request
 * (probe or paid retry) is actually in flight and frees payments's
 * strictly-sequential queue for the next miner — a hung miner no longer
 * blocks every call behind it.
 */
export async function callMiner(
  minerId: string,
  method: "GET" | "POST",
  endpoint: string,
  payload: Record<string, unknown>
): Promise<MinerCallResult> {
  const nodeUrl = process.env.TELEGRAPH_NODE_URL ?? "https://devnode.telegraphprotocol.com";
  const started = Date.now();

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), MINER_TIMEOUT_MS);

  try {
    let outcome = await attemptOnce(nodeUrl, minerId, method, endpoint, payload, controller.signal);

    for (let attempt = 0; outcome.kind === "payment-failed" && attempt < MAX_PAYMENT_RETRIES; attempt++) {
      await sleep(500 * (attempt + 1) + Math.random() * 400);
      outcome = await attemptOnce(nodeUrl, minerId, method, endpoint, payload, controller.signal);
    }

    const duration_ms = Date.now() - started;

    if (outcome.kind === "payment-failed") {
      return { ok: false, minerId, minerName: null, error: "HTTP 402: payment not accepted after retries", duration_ms };
    }
    if (outcome.kind === "hard-failure") {
      return { ok: false, minerId, minerName: null, error: outcome.error, duration_ms };
    }

    const body = (await outcome.res.json()) as {
      miner_id?: string;
      miner_name?: string;
      result?: unknown;
      cost_usd?: number;
      duration_ms?: number;
      signal_hash?: string;
    };

    return {
      ok: true,
      minerId,
      minerName: body.miner_name ?? minerId,
      result: body.result,
      cost_usd: body.cost_usd ?? 0,
      duration_ms: body.duration_ms ?? duration_ms,
      signal_hash: body.signal_hash ?? null,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      minerId,
      minerName: null,
      error: timedOut
        ? `Timed out waiting for a response after ${MINER_TIMEOUT_MS / 1000}s.`
        : err instanceof Error
          ? err.message
          : String(err),
      duration_ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timeoutTimer);
  }
}
