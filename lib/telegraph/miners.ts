import { domainFromUrl } from "@/lib/scam/url";
import type { MinerDefinition, NormalizedVerdict } from "./types";

// Miner responses are heterogeneous external JSON with no shared shape —
// this is the one deliberate `any` boundary the normalizers below read through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rec(result: unknown): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result ?? {}) as Record<string, any>;
}

function unknownVerdict(reason: string): NormalizedVerdict {
  return { label: "unknown", reason };
}

// ---------------------------------------------------------------------------
// Link safety (per URL)
// ---------------------------------------------------------------------------

const urlhaus: MinerDefinition = {
  id: "11",
  name: "URLhaus",
  category: "link-safety",
  appliesTo: "url",
  method: "POST",
  endpoint: "/check-url",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ url }),
  parseVerdict: (result) => {
    const r = rec(result);
    const threat = String(r.threat ?? "").toLowerCase();
    const status = String(r.url_status ?? "").toLowerCase();
    if (!threat && !status) return unknownVerdict("URLhaus had no record for this URL.");
    if (status === "online" || threat) {
      return {
        label: "malicious",
        reason: `URLhaus lists this URL as a known ${threat || "threat"} (${status || "reported"}).`,
      };
    }
    return { label: "clean", reason: "Not found in the URLhaus malware/phishing feed." };
  },
};

const phishtank: MinerDefinition = {
  id: "222",
  name: "PhishTank",
  category: "link-safety",
  appliesTo: "url",
  method: "POST",
  endpoint: "/check",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ url, format: "json" }),
  parseVerdict: (result) => {
    const r = rec(result);
    if (!r.in_database) return unknownVerdict("Not in the PhishTank community phishing database.");
    if (r.verified) {
      return { label: "malicious", reason: "PhishTank has a community-verified phishing report for this URL." };
    }
    return { label: "suspicious", reason: "PhishTank has an unverified phishing report for this URL." };
  },
};

const virustotal: MinerDefinition = {
  id: "203",
  name: "VirusTotal",
  category: "link-safety",
  appliesTo: "url",
  method: "GET",
  endpoint: "/api/v3/domains/{domain}",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ domain: domainFromUrl(url) }),
  parseVerdict: (result) => {
    const attrs = rec(result)?.data?.attributes ?? {};
    const stats = attrs.last_analysis_stats ?? {};
    const malicious = Number(stats.malicious ?? 0);
    const suspicious = Number(stats.suspicious ?? 0);
    if (!("malicious" in stats) && !("suspicious" in stats)) {
      return unknownVerdict("VirusTotal (demo/eval key) had no analysis stats for this domain.");
    }
    if (malicious > 0) {
      return { label: "malicious", reason: `${malicious} of ${Object.values(stats).reduce((a: number, b) => a + Number(b), 0)} VirusTotal engines flag this domain as malicious.` };
    }
    if (suspicious > 0) {
      return { label: "suspicious", reason: `${suspicious} VirusTotal engines flag this domain as suspicious.` };
    }
    return { label: "clean", reason: "No VirusTotal engine flags this domain." };
  },
};

const proofgate: MinerDefinition = {
  id: "7402",
  name: "ProofGate",
  category: "link-safety",
  appliesTo: "url",
  method: "POST",
  endpoint: "/scan",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ url }),
  parseVerdict: (result) => {
    const r = rec(result);
    const verdict = String(r.verdict ?? "").toLowerCase();
    const confidence = typeof r.confidence === "number" ? r.confidence : undefined;
    const reason = r.answer ?? r.reason ?? "ProofGate returned no explanation.";
    if (r.malicious === true || verdict.includes("malicious") || verdict.includes("phish")) {
      return { label: "malicious", confidence, reason };
    }
    if (verdict.includes("suspicious") || verdict.includes("caution")) {
      return { label: "suspicious", confidence, reason };
    }
    if (verdict.includes("clean") || verdict.includes("safe") || verdict.includes("benign")) {
      return { label: "clean", confidence, reason };
    }
    return { label: "unknown", confidence, reason };
  },
};

const netwireUrlScan: MinerDefinition = {
  id: "7334",
  name: "NetWire URL Scan",
  category: "link-safety",
  appliesTo: "url",
  method: "GET",
  endpoint: "/url-scan",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ url }),
  parseVerdict: (result) => {
    const r = rec(result);
    if (r.reachable === false) {
      return { label: "suspicious", confidence: r.confidence, reason: r.summary ?? "URL did not resolve or respond." };
    }
    if (r.https === false) {
      return { label: "suspicious", confidence: r.confidence, reason: r.summary ?? "URL is not served over HTTPS." };
    }
    return { label: "clean", confidence: r.confidence, reason: r.summary ?? "URL is reachable over a valid connection." };
  },
};

const urlscanIo: MinerDefinition = {
  id: "223",
  name: "URLScan.io",
  category: "link-safety",
  appliesTo: "url",
  method: "POST",
  endpoint: "/scan",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ url, visibility: "public" }),
  parseVerdict: (result) => {
    const r = rec(result);
    const malicious = r.verdicts?.overall?.malicious ?? r.verdicts?.urlscan?.malicious;
    if (r.uuid && malicious === undefined) {
      return unknownVerdict(`Scan submitted (uuid ${r.uuid}); verdict not polled in this MVP — see the hosted result page.`);
    }
    if (malicious === true) return { label: "malicious", reason: "URLScan.io's sandboxed render flagged this page as malicious." };
    if (malicious === false) return { label: "clean", reason: "URLScan.io's sandboxed render found no malicious indicators." };
    return unknownVerdict("URLScan.io did not return a verdict.");
  },
};

// ---------------------------------------------------------------------------
// Certificate trust (per URL's domain)
// ---------------------------------------------------------------------------

const netwireSsl: MinerDefinition = {
  id: "7332",
  name: "NetWire SSL",
  category: "cert-trust",
  appliesTo: "url",
  method: "GET",
  endpoint: "/ssl-check",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ domain: domainFromUrl(url) }),
  parseVerdict: (result) => {
    const r = rec(result);
    if (r.valid === false || r.https_reachable === false) {
      return { label: "suspicious", confidence: r.confidence, reason: r.summary ?? "TLS certificate is invalid or unreachable." };
    }
    if (typeof r.days_remaining === "number" && r.days_remaining < 3) {
      return { label: "suspicious", confidence: r.confidence, reason: `Certificate expires in ${r.days_remaining} day(s).` };
    }
    return { label: "clean", confidence: r.confidence, reason: r.summary ?? "Valid TLS certificate." };
  },
};

const certSpotter: MinerDefinition = {
  id: "10",
  name: "Cert Spotter",
  category: "cert-trust",
  appliesTo: "url",
  method: "GET",
  endpoint: "/issuances",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ domain: domainFromUrl(url) }),
  parseVerdict: (result) => {
    const r = rec(result);
    if (r.has_valid_cert === false) {
      return { label: "suspicious", reason: `No currently valid certificate found (last: ${r.not_after ?? "unknown"}).` };
    }
    if (r.has_valid_cert === true) {
      return { label: "clean", reason: `Valid certificate on record, expires ${r.not_after ?? "unknown"}.` };
    }
    return unknownVerdict("No certificate-transparency record found for this domain.");
  },
};

const sslLabs: MinerDefinition = {
  id: "227",
  name: "SSL Labs",
  category: "cert-trust",
  appliesTo: "url",
  method: "GET",
  endpoint: "/analyze",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ host: domainFromUrl(url) }),
  parseVerdict: (result) => {
    const r = rec(result);
    const grades: string[] = Array.isArray(r.grades) ? r.grades : r.grades ? [String(r.grades)] : [];
    if (r.status && r.status !== "READY") {
      return unknownVerdict(`SSL Labs assessment status: ${r.status}.`);
    }
    const worst = grades.sort().pop();
    if (!worst) return unknownVerdict("SSL Labs returned no grade.");
    if (worst.startsWith("F") || worst.startsWith("T")) {
      return { label: "malicious", reason: `SSL Labs grade ${worst} — untrusted or broken TLS configuration.` };
    }
    if (worst.startsWith("C") || worst.startsWith("D") || worst.startsWith("E")) {
      return { label: "suspicious", reason: `SSL Labs grade ${worst} — weak TLS configuration.` };
    }
    return { label: "clean", reason: `SSL Labs grade ${worst}.` };
  },
};

// ---------------------------------------------------------------------------
// Content extraction (per URL) — feeds page text back into AI-text + Sigvora
// ---------------------------------------------------------------------------

const netwireExtract: MinerDefinition = {
  id: "7335",
  name: "NetWire Content Extraction",
  category: "content-extraction",
  appliesTo: "url",
  method: "GET",
  endpoint: "/extract",
  minPriceUsdc: 10000,
  buildPayload: (url) => ({ url }),
  parseVerdict: (result) => {
    const r = rec(result);
    return unknownVerdict(r.title ? `Extracted page "${r.title}" (${r.char_count ?? "?"} chars).` : "Could not extract page content.");
  },
};

// ---------------------------------------------------------------------------
// Sender forensics
// ---------------------------------------------------------------------------

const emailRep: MinerDefinition = {
  id: "221",
  name: "EmailRep",
  category: "sender-forensics",
  appliesTo: "email",
  method: "GET",
  endpoint: "/{email}",
  minPriceUsdc: 10000,
  buildPayload: (email) => ({ email }),
  parseVerdict: (result) => {
    const r = rec(result);
    const details = rec(r.details);
    const flagged = details.malicious_activity || details.blacklisted || details.credentials_leaked;
    if (flagged) {
      return {
        label: "suspicious",
        reason: `EmailRep flags this address: ${Object.entries(details).filter(([, v]) => v).map(([k]) => k).join(", ")}.`,
      };
    }
    if (r.suspicious) return { label: "suspicious", reason: "EmailRep marks this address as suspicious." };
    if (r.reputation) return { label: "clean", reason: `EmailRep reputation: ${r.reputation}.` };
    return unknownVerdict("EmailRep had no reputation record for this address.");
  },
};

const iplocate: MinerDefinition = {
  id: "204",
  name: "IPLocate",
  category: "sender-forensics",
  appliesTo: "ip",
  method: "GET",
  endpoint: "/api/lookup/{ip}",
  minPriceUsdc: 10000,
  buildPayload: (ip) => ({ ip }),
  parseVerdict: (result) => {
    const r = rec(result);
    const privacy = rec(r.privacy);
    if (privacy.abuser || privacy.tor) {
      return { label: "suspicious", reason: `IP flagged as ${privacy.tor ? "Tor exit node" : "a known abuser"}, hosted via ${r.country ?? "unknown location"}.` };
    }
    if (privacy.vpn || privacy.proxy || privacy.hosting) {
      return { label: "suspicious", reason: `IP resolves to ${[privacy.vpn && "VPN", privacy.proxy && "proxy", privacy.hosting && "hosting infrastructure"].filter(Boolean).join("/")} in ${r.country ?? "unknown location"}, not a residential/business connection.` };
    }
    return { label: "clean", reason: `IP resolves to ${r.country ?? "an unflagged network"}, no privacy/abuse flags.` };
  },
};

const netwireIpGeo: MinerDefinition = {
  id: "7333",
  name: "NetWire IP Geolocation",
  category: "sender-forensics",
  appliesTo: "ip",
  method: "GET",
  endpoint: "/ip-geolocate",
  minPriceUsdc: 10000,
  buildPayload: (ip) => ({ ip }),
  parseVerdict: (result) => {
    const r = rec(result);
    return unknownVerdict(r.summary ?? `IP geolocated to ${r.city ?? ""} ${r.country ?? ""}`.trim());
  },
};

// ---------------------------------------------------------------------------
// Message-fraud classifiers (always run on the raw text)
// ---------------------------------------------------------------------------

function labelFromWord(word: string | undefined): NormalizedVerdict["label"] {
  const w = (word ?? "").toLowerCase();
  if (["scam", "fraud", "malicious", "phishing", "block", "high", "critical"].some((k) => w.includes(k))) return "malicious";
  if (["suspicious", "caution", "recheck", "review", "medium", "warn"].some((k) => w.includes(k))) return "suspicious";
  if (["safe", "clean", "benign", "low", "allow", "supported", "none"].some((k) => w.includes(k))) return "clean";
  return "unknown";
}

const NEGATION_WORDS = [
  "not",
  "no ",
  "n't",
  "cannot",
  "can't",
  "without",
  "lacks",
  "lacking",
  "none of",
  "neither",
];

/**
 * Some miners (SarzOps) return a free-text explanation rather than a short
 * classification word, and reuse it as both the label signal and the
 * human-readable reason. Naive substring keyword matching (labelFromWord)
 * misreads negated prose — "does not match any known scam template" gets
 * flagged malicious purely because it contains "scam". This checks each
 * sentence for a severity keyword *and* requires that sentence to be free
 * of a negation cue before counting the hit, so an explanation of why
 * something ISN'T a match doesn't get read as a positive match.
 */
function labelFromProse(text: string): NormalizedVerdict["label"] {
  const sentences = text.toLowerCase().split(/(?<=[.!?])\s+/);
  const tiers: [string[], NormalizedVerdict["label"]][] = [
    [["scam", "fraud", "malicious", "phishing", "block", "high risk", "critical"], "malicious"],
    [["suspicious", "caution", "recheck", "review", "medium risk", "warn"], "suspicious"],
    [["safe", "clean", "benign", "low risk", "allow", "legitimate"], "clean"],
  ];
  for (const [keywords, label] of tiers) {
    const hasUnnegatedHit = sentences.some((sentence) => {
      const matchesKeyword = keywords.some((k) => sentence.includes(k));
      if (!matchesKeyword) return false;
      const isNegated = NEGATION_WORDS.some((n) => sentence.includes(n));
      return !isNegated;
    });
    if (hasUnnegatedHit) return label;
  }
  return "unknown";
}

const sigvora: MinerDefinition = {
  id: "251",
  name: "Sigvora",
  category: "message-fraud",
  appliesTo: "message",
  method: "POST",
  endpoint: "/analyze",
  minPriceUsdc: 10000,
  buildPayload: (text) => ({ content: text }),
  parseVerdict: (result) => {
    const r = rec(result);
    return { label: labelFromWord(r.label), confidence: r.confidence, reason: r.reason ?? "Sigvora returned no explanation." };
  },
};

const telegraphSentinelFraud: MinerDefinition = {
  id: "94217603",
  name: "Telegraph Sentinel",
  category: "message-fraud",
  appliesTo: "message",
  method: "POST",
  endpoint: "/fraud-query",
  minPriceUsdc: 10000,
  buildPayload: (text) => ({ query: `Is the following message a known type of scam? ${text}` }),
  parseVerdict: (result) => {
    const r = rec(result);
    return { label: labelFromWord(r.label ?? r.risk_level), confidence: r.confidence, reason: r.reason ?? r.explanation ?? r.answer ?? "No explanation returned." };
  },
};

const sarzOps: MinerDefinition = {
  id: "91001",
  name: "SarzOps",
  category: "message-fraud",
  appliesTo: "message",
  method: "POST",
  endpoint: "/fraud",
  minPriceUsdc: 10000,
  buildPayload: (text) => ({ query: `Does the following message match a known fraud/scam pattern? ${text}` }),
  parseVerdict: (result) => {
    const r = rec(result);
    const signal = String(r.signal ?? "");
    // SarzOps's "signal" field is free-text prose, not a short classification
    // word — labelFromWord's substring matching misreads negated explanations
    // ("does not match any known scam template") as a malicious hit.
    return { label: labelFromProse(signal), reason: signal || "SarzOps returned no signal." };
  },
};

const qarinah: MinerDefinition = {
  id: "717190",
  name: "Qarinah ProofPack",
  category: "message-fraud",
  appliesTo: "message",
  method: "POST",
  endpoint: "/v1/proof",
  minPriceUsdc: 10000,
  buildPayload: (text) => ({ query: text, intent: "FACT_CHECK" }),
  parseVerdict: (result) => {
    const r = rec(result);
    if (r.abstained) return unknownVerdict(r.reason ?? "Qarinah abstained — insufficient evidence.");
    return { label: labelFromWord(r.verdict), confidence: r.confidence, reason: r.reason ?? r.answer ?? "No explanation returned." };
  },
};

const eviplan: MinerDefinition = {
  id: "232",
  name: "EviPlan",
  category: "message-fraud",
  appliesTo: "message",
  method: "POST",
  endpoint: "/verify",
  minPriceUsdc: 10000,
  buildPayload: (text) => ({ action_type: "trust_forwarded_message", query: text }),
  parseVerdict: (result) => {
    const r = rec(result);
    const decision = String(r.gate_decision ?? "").toUpperCase();
    const label = decision === "BLOCK" ? "malicious" : decision === "RECHECK" ? "suspicious" : decision === "ALLOW" ? "clean" : "unknown";
    return { label, confidence: r.confidence, reason: r.reason ?? "EviPlan returned no explanation." };
  },
};

// ---------------------------------------------------------------------------
// AI-generated-text jury (always run)
// ---------------------------------------------------------------------------

function aiTextVerdict(label: unknown, confidence: unknown, reason: string): NormalizedVerdict {
  const isAi = String(label ?? "").toLowerCase().includes("ai");
  return {
    label: isAi ? "suspicious" : "clean",
    confidence: typeof confidence === "number" ? confidence : undefined,
    reason,
  };
}

const itsAi: MinerDefinition = {
  id: "32",
  name: "ItsAI",
  category: "ai-text",
  appliesTo: "message",
  method: "POST",
  endpoint: "/detect",
  minPriceUsdc: 20000,
  buildPayload: (text) => ({ text }),
  parseVerdict: (result) => {
    const r = rec(result);
    return aiTextVerdict(r.answer ?? r.label, r.confidence, `ItsAI: ${JSON.stringify(r.answer ?? r.label ?? r)}`.slice(0, 200));
  },
};

const veritarach: MinerDefinition = {
  id: "708425",
  name: "Veritarach",
  category: "ai-text",
  appliesTo: "message",
  method: "POST",
  endpoint: "/predict",
  minPriceUsdc: 10000,
  buildPayload: (text) => ({ text }),
  parseVerdict: (result) => {
    const r = rec(result);
    return aiTextVerdict(r.label, r.confidence, `Veritarach: ${r.label ?? "no label"} (${r.confidence ?? "?"} confidence).`);
  },
};

const caliber: MinerDefinition = {
  id: "20260830",
  name: "CALIBER TRUTHPORT",
  category: "ai-text",
  appliesTo: "message",
  method: "POST",
  endpoint: "/predict",
  minPriceUsdc: 10000,
  buildPayload: (text) => ({ text, query: text }),
  parseVerdict: (result) => {
    const r = rec(result);
    return aiTextVerdict(r.label, r.confidence, r.reason ?? `CALIBER: ${r.label ?? "no label"}.`);
  },
};

// ---------------------------------------------------------------------------
// Prompt-injection detection (always run) — the differentiator
// ---------------------------------------------------------------------------

const elcaro: MinerDefinition = {
  id: "8848",
  name: "Elcaro IPI Detector",
  category: "prompt-injection",
  appliesTo: "message",
  method: "POST",
  endpoint: "/scan",
  minPriceUsdc: 10000,
  buildPayload: (text) => ({ content: text, content_type: "chat_message" }),
  parseVerdict: (result) => {
    const r = rec(result);
    const level = String(r.risk_level ?? "").toLowerCase();
    const label = level === "dangerous" ? "malicious" : level === "suspicious" ? "suspicious" : level === "safe" ? "clean" : "unknown";
    return { label, confidence: r.risk_score, reason: r.summary ?? "Elcaro returned no summary." };
  },
};

// ---------------------------------------------------------------------------
// Translation (conditional preprocessing step, not part of verdict rollup)
// ---------------------------------------------------------------------------

const langwire: MinerDefinition = {
  id: "7337",
  name: "LangWire",
  category: "translation",
  appliesTo: "message",
  method: "GET",
  endpoint: "/translate",
  minPriceUsdc: 10000,
  buildPayload: (text) => ({ text, to: "en" }),
  parseVerdict: (result) => {
    const r = rec(result);
    return unknownVerdict(r.summary ?? "Translated.");
  },
};

// ---------------------------------------------------------------------------

export const MESSAGE_LEVEL_MINERS: MinerDefinition[] = [
  sigvora,
  telegraphSentinelFraud,
  sarzOps,
  qarinah,
  eviplan,
  itsAi,
  veritarach,
  caliber,
  elcaro,
];

export const URL_MINERS: MinerDefinition[] = [
  urlhaus,
  phishtank,
  virustotal,
  proofgate,
  netwireUrlScan,
  urlscanIo,
  netwireSsl,
  certSpotter,
  sslLabs,
  netwireExtract,
];

export const EMAIL_MINERS: MinerDefinition[] = [emailRep];

export const IP_MINERS: MinerDefinition[] = [iplocate, netwireIpGeo];

export const TRANSLATION_MINER = langwire;

export const ALL_MINERS: MinerDefinition[] = [
  ...MESSAGE_LEVEL_MINERS,
  ...URL_MINERS,
  ...EMAIL_MINERS,
  ...IP_MINERS,
  langwire,
];
