/**
 * Maps a raw miner/transport error string into a short, human sentence for
 * the evidence table. The audience is people worried about a scam text, not
 * developers — raw upstream JSON never belongs in that column. The original
 * error is still available via the row's title/tooltip for anyone who wants it.
 */
export function humanizeMinerError(error: string): string {
  const lower = error.toLowerCase();

  if (lower.includes("payment not accepted") || /http 402/.test(lower)) {
    return "Payment to this miner didn't go through — it was skipped, not charged.";
  }
  if (lower.includes("low_words") || lower.includes("characters) so we can")) {
    return "This miner needs a longer message to analyze and skipped this one.";
  }
  if (lower.includes("cloudflare") || lower.includes("just a moment") || lower.includes("doctype html")) {
    return "This miner's provider is currently behind a bot-check page and couldn't answer.";
  }
  if (lower.includes("declared credential") || lower.includes("did not resolve")) {
    return "This miner isn't fully configured on the network yet.";
  }
  if (lower.includes("not a valid domain") || lower.includes("invalidargumenterror")) {
    return "This miner couldn't parse the domain in this test link.";
  }
  if (lower.includes("429")) {
    return "This miner is rate-limited right now and couldn't answer.";
  }
  if (lower.includes("unauthorized") || lower.includes("401")) {
    return "This miner's own credentials are misconfigured — not a problem with your scan.";
  }
  if (lower.includes("predicted to fail")) {
    return "This miner declined the request before it could run.";
  }
  return "This miner didn't respond in time — the verdict is built from the ones that did.";
}
