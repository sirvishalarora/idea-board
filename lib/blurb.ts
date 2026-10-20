export function blurb(details: string, maxLen = 120): string {
  const trimmed = details.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1).trimEnd() + "…";
}
