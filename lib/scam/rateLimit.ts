import "server-only";

/**
 * In-memory sliding-window rate limiter, keyed by caller IP. Protects
 * /api/scan — a real x402 payment happens on every call — from casual
 * abuse now that a browser extension is a second automated caller.
 *
 * Known limitation: state is per serverless instance and resets on cold
 * start, so this isn't a hard guarantee under Vercel's ephemeral
 * functions — it's a speed bump, not a durable limiter. A shared store
 * (Upstash Redis) would be the durable follow-up.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

function pruneOld(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const recent = pruneOld(hits.get(key) ?? [], now);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    hits.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true };
}

export function clientIpFrom(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
