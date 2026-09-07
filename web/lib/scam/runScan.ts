import "server-only";

import pLimit from "p-limit";
import { callMiner } from "@/lib/telegraph/x402Client";
import {
  EMAIL_MINERS,
  IP_MINERS,
  MESSAGE_LEVEL_MINERS,
  TRANSLATION_MINER,
  URL_MINERS,
} from "@/lib/telegraph/miners";
import type { MinerDefinition } from "@/lib/telegraph/types";
import type { MinerCallRecord, ScanResult, SkippedEntity } from "@/lib/telegraph/scanTypes";
import { extractEntities } from "./extractEntities";
import { isLikelyNonEnglish } from "./langDetect";

const SERVER_MAX_SPEND_USD = Number(process.env.SCAN_SPEND_CEILING_USD ?? "5.00");
const CONCURRENCY = 6;
const FOLLOW_UP_MIN_EXCERPT_LENGTH = 40;
const CONTENT_EXTRACTION_MINER_ID = "7335";

// Message-fraud + AI-text miners re-run against a URL's extracted page content.
const FOLLOW_UP_MINERS: MinerDefinition[] = MESSAGE_LEVEL_MINERS.filter(
  (m) => m.category === "ai-text" || m.id === "251"
);

type Task = {
  miner: MinerDefinition;
  entityKind: "message" | "url" | "email" | "ip";
  /** Human-readable label shown in the evidence table and reason bullets. */
  entity: string;
  /** What actually gets passed to buildPayload — same as `entity` unless overridden. */
  analysisInput?: string;
  payloadContext: { originalText?: string };
};

async function runTask(task: Task): Promise<MinerCallRecord> {
  const payload = task.miner.buildPayload(task.analysisInput ?? task.entity, task.payloadContext);
  const res = await callMiner(task.miner.id, task.miner.method, task.miner.endpoint, payload);

  if (!res.ok) {
    return {
      minerId: task.miner.id,
      minerName: task.miner.name,
      category: task.miner.category,
      entityKind: task.entityKind,
      entity: task.entity,
      ok: false,
      cost_usd: 0,
      duration_ms: res.duration_ms,
      signal_hash: null,
      error: res.error,
    };
  }

  const rawResult = res.result as Record<string, unknown> | undefined;
  const rawExcerpt =
    task.miner.id === CONTENT_EXTRACTION_MINER_ID && typeof rawResult?.excerpt === "string"
      ? rawResult.excerpt
      : undefined;

  return {
    minerId: task.miner.id,
    minerName: task.miner.name,
    category: task.miner.category,
    entityKind: task.entityKind,
    entity: task.entity,
    ok: true,
    verdict: task.miner.parseVerdict(res.result),
    cost_usd: res.cost_usd,
    duration_ms: res.duration_ms,
    signal_hash: res.signal_hash,
    rawExcerpt,
  };
}

function estimatedUsd(miners: MinerDefinition[]): number {
  return miners.reduce((sum, m) => sum + m.minPriceUsdc / 1_000_000, 0);
}

export type ScanProgressHooks = {
  /** Fired once, right after the task list is built, with the total call count. */
  onStart?: (totalTasks: number) => void;
  /** Fired if a second wave of follow-up calls gets scheduled, with how many were added. */
  onMoreTasks?: (additionalTasks: number) => void;
  /** Fired every time a single miner call settles (success or failure). */
  onCall?: (call: MinerCallRecord) => void;
};

export type ScanOptions = {
  /** Caller-chosen spend cap for this scan, clamped to [0, SERVER_MAX_SPEND_USD]. */
  maxSpendUsd?: number;
};

export async function runScan(
  inputText: string,
  hooks: ScanProgressHooks = {},
  options: ScanOptions = {}
): Promise<ScanResult> {
  const effectiveCeiling =
    typeof options.maxSpendUsd === "number" && Number.isFinite(options.maxSpendUsd)
      ? Math.max(0, Math.min(options.maxSpendUsd, SERVER_MAX_SPEND_USD))
      : SERVER_MAX_SPEND_USD;

  const entities = extractEntities(inputText);
  const detectedNonEnglish = isLikelyNonEnglish(inputText);

  let analysisText = inputText;
  let translatedText: string | null = null;

  if (detectedNonEnglish) {
    const translationResult = await callMiner(
      TRANSLATION_MINER.id,
      TRANSLATION_MINER.method,
      TRANSLATION_MINER.endpoint,
      TRANSLATION_MINER.buildPayload(inputText, {})
    );
    if (translationResult.ok) {
      const translated = (translationResult.result as Record<string, unknown> | undefined)?.translation;
      if (typeof translated === "string" && translated.trim()) {
        translatedText = translated;
        analysisText = translated;
      }
    }
  }

  const limit = pLimit(CONCURRENCY);
  const skippedEntities: SkippedEntity[] = [];
  let estimatedSpent = 0;

  function reserve(cost: number): boolean {
    if (estimatedSpent + cost > effectiveCeiling) return false;
    estimatedSpent += cost;
    return true;
  }

  const tasks: Task[] = [];

  // Message-level checks always run, regardless of the spend ceiling.
  for (const miner of MESSAGE_LEVEL_MINERS) {
    tasks.push({
      miner,
      entityKind: "message",
      entity: "the submitted message",
      analysisInput: analysisText,
      payloadContext: { originalText: inputText },
    });
  }

  for (const url of entities.urls) {
    const cost = estimatedUsd(URL_MINERS);
    if (!reserve(cost)) {
      skippedEntities.push({ kind: "url", entity: url, reason: `Spend ceiling ($${effectiveCeiling.toFixed(2)}) reached before this URL could be checked.` });
      continue;
    }
    for (const miner of URL_MINERS) {
      tasks.push({ miner, entityKind: "url", entity: url, payloadContext: { originalText: inputText } });
    }
  }

  for (const email of entities.emails) {
    const cost = estimatedUsd(EMAIL_MINERS);
    if (!reserve(cost)) {
      skippedEntities.push({ kind: "email", entity: email, reason: `Spend ceiling ($${effectiveCeiling.toFixed(2)}) reached before this email could be checked.` });
      continue;
    }
    for (const miner of EMAIL_MINERS) {
      tasks.push({ miner, entityKind: "email", entity: email, payloadContext: {} });
    }
  }

  for (const ip of entities.ips) {
    const cost = estimatedUsd(IP_MINERS);
    if (!reserve(cost)) {
      skippedEntities.push({ kind: "ip", entity: ip, reason: `Spend ceiling ($${effectiveCeiling.toFixed(2)}) reached before this IP could be checked.` });
      continue;
    }
    for (const miner of IP_MINERS) {
      tasks.push({ miner, entityKind: "ip", entity: ip, payloadContext: {} });
    }
  }

  hooks.onStart?.(tasks.length);

  const calls: MinerCallRecord[] = await Promise.all(
    tasks.map((task) =>
      limit(async () => {
        const call = await runTask(task);
        hooks.onCall?.(call);
        return call;
      })
    )
  );

  // Wave 2: for URLs whose content-extraction call returned real page text,
  // re-run the message-fraud + AI-text jury against that page content — catches
  // scam landing pages even when the message that linked to them looks innocuous.
  const followUpTasks: Task[] = [];

  for (const extraction of calls) {
    if (extraction.minerId !== CONTENT_EXTRACTION_MINER_ID || !extraction.ok) continue;
    const pageText = extraction.rawExcerpt;
    if (!pageText || pageText.length < FOLLOW_UP_MIN_EXCERPT_LENGTH) continue;

    const cost = estimatedUsd(FOLLOW_UP_MINERS);
    if (!reserve(cost)) {
      skippedEntities.push({
        kind: "url",
        entity: extraction.entity,
        reason: `Spend ceiling ($${effectiveCeiling.toFixed(2)}) reached before this page's content could be analyzed.`,
      });
      continue;
    }
    for (const miner of FOLLOW_UP_MINERS) {
      followUpTasks.push({
        miner,
        entityKind: "url",
        entity: `${extraction.entity} (page content)`,
        analysisInput: pageText,
        payloadContext: {},
      });
    }
  }

  if (followUpTasks.length) hooks.onMoreTasks?.(followUpTasks.length);

  const followUpCalls: MinerCallRecord[] = followUpTasks.length
    ? await Promise.all(
        followUpTasks.map((task) =>
          limit(async () => {
            const call = await runTask(task);
            hooks.onCall?.(call);
            return call;
          })
        )
      )
    : [];

  const allCalls = [...calls, ...followUpCalls];

  const maliciousCount = allCalls.filter((c) => c.verdict?.label === "malicious").length;
  const suspiciousCount = allCalls.filter((c) => c.verdict?.label === "suspicious").length;

  let overallVerdict: ScanResult["overallVerdict"];
  if (maliciousCount >= 2 || (maliciousCount >= 1 && suspiciousCount >= 2)) {
    overallVerdict = "SCAM";
  } else if (maliciousCount >= 1 || suspiciousCount >= 2) {
    overallVerdict = "SUSPICIOUS";
  } else {
    overallVerdict = "SAFE";
  }

  const reasonBullets = allCalls
    .filter((c) => c.verdict && (c.verdict.label === "malicious" || c.verdict.label === "suspicious"))
    .sort((a, b) => (a.verdict!.label === "malicious" ? -1 : 1) - (b.verdict!.label === "malicious" ? -1 : 1))
    .slice(0, 10)
    .map((c) => `${c.minerName} (${c.category} on ${c.entity}): ${c.verdict!.reason}`);

  const totalCostUsd = allCalls.reduce((sum, c) => sum + c.cost_usd, 0);
  const uniqueMinersUsed = new Set(allCalls.map((c) => c.minerId)).size;

  return {
    id: "",
    createdAt: new Date().toISOString(),
    inputText,
    translatedText,
    detectedNonEnglish,
    entities,
    calls: allCalls,
    skippedEntities,
    overallVerdict,
    reasonBullets,
    totalCostUsd,
    totalCalls: allCalls.length,
    uniqueMinersUsed,
  };
}
