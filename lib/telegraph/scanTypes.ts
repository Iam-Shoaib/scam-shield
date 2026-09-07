import type { EntityKind, MinerCategory, NormalizedVerdict } from "./types";

export type MinerCallRecord = {
  minerId: string;
  minerName: string;
  category: MinerCategory;
  entityKind: EntityKind;
  entity: string;
  ok: boolean;
  verdict?: NormalizedVerdict;
  cost_usd: number;
  duration_ms: number;
  signal_hash: string | null;
  error?: string;
  /** Populated only for the content-extraction miner, used to drive a follow-up pass. */
  rawExcerpt?: string;
};

export type SkippedEntity = {
  kind: EntityKind;
  entity: string;
  reason: string;
};

export type OverallVerdict = "SAFE" | "SUSPICIOUS" | "SCAM";

export type ScanResult = {
  id: string;
  createdAt: string;
  inputText: string;
  translatedText: string | null;
  detectedNonEnglish: boolean;
  entities: { urls: string[]; emails: string[]; ips: string[] };
  calls: MinerCallRecord[];
  skippedEntities: SkippedEntity[];
  overallVerdict: OverallVerdict;
  reasonBullets: string[];
  totalCostUsd: number;
  totalCalls: number;
  uniqueMinersUsed: number;
};
