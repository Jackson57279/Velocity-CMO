export function normalizeSubmittedUrl(value: string): string {
  const trimmed = value.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(candidate);
  parsed.hash = "";

  return parsed.toString();
}

export function hostnameFromUrl(value: string): string {
  return new URL(value).hostname.replace(/^www\./, "");
}
