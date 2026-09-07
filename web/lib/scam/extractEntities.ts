const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g;

export type ExtractedEntities = {
  urls: string[];
  emails: string[];
  ips: string[];
};

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function extractEntities(text: string): ExtractedEntities {
  const urls = dedupe([...text.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;:!?]+$/, "")));
  const emails = dedupe([...text.matchAll(EMAIL_RE)].map((m) => m[0]));
  // Don't double-count an IP that's actually inside one of the URLs already captured.
  const ips = dedupe([...text.matchAll(IPV4_RE)].map((m) => m[0])).filter(
    (ip) => !urls.some((u) => u.includes(ip))
  );
  return { urls, emails, ips };
}
