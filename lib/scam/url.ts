export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    // Not a full URL (e.g. a bare host was passed) — strip any path/scheme remnants.
    return url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  }
}
