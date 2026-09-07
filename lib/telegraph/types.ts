export type MinerCategory =
  | "link-safety"
  | "cert-trust"
  | "content-extraction"
  | "sender-forensics"
  | "message-fraud"
  | "ai-text"
  | "prompt-injection"
  | "translation";

export type EntityKind = "message" | "url" | "email" | "ip";

export type NormalizedVerdict = {
  /** Coarse label every miner's output gets mapped to. */
  label: "clean" | "suspicious" | "malicious" | "unknown";
  /** 0-1 confidence when the miner reports one. */
  confidence?: number;
  /** Short human-readable reason, built from the miner's own fields. */
  reason: string;
};

export type MinerDefinition = {
  id: string;
  name: string;
  category: MinerCategory;
  /** Which kind of extracted entity this miner runs against. */
  appliesTo: EntityKind;
  method: "GET" | "POST";
  /** The miner's own relative endpoint path, as declared in its OpenAPI. */
  endpoint: string;
  minPriceUsdc: number;
  /** Builds the Engine `payload` object for one entity value. */
  buildPayload: (entity: string, context: { originalText?: string }) => Record<string, unknown>;
  /** Normalizes a raw miner result into a common verdict shape. */
  parseVerdict: (result: unknown) => NormalizedVerdict;
};
