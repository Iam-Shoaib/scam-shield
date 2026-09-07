import { franc } from "franc-min";

/**
 * Returns true when the text is confidently detected as non-English.
 * Short or ambiguous text ("und" / too little signal) is treated as
 * English so we don't burn a translation call on it.
 */
export function isLikelyNonEnglish(text: string): boolean {
  if (text.trim().length < 20) return false;
  const code = franc(text);
  return code !== "und" && code !== "eng";
}
