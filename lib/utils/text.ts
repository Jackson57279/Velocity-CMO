const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "been",
  "from",
  "have",
  "into",
  "more",
  "that",
  "their",
  "there",
  "these",
  "this",
  "with",
  "your",
  "what",
  "when",
  "where",
  "which",
  "while",
  "will",
  "than",
  "them",
  "they",
  "were",
  "make",
  "made",
  "over",
  "very",
  "using",
  "used",
  "help",
  "helps",
  "into",
  "through",
  "without",
  "across",
  "platform",
  "product",
  "products",
  "solution",
  "solutions",
  "company",
  "companies",
  "software",
  "website",
  "home",
  "page",
]);

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function truncateText(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

export function extractKeywords(input: string, limit = 6): string[] {
  const matches = input.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  const counts = new Map<string, number>();

  for (const match of matches) {
    if (STOP_WORDS.has(match) || /^\d+$/.test(match)) {
      continue;
    }

    counts.set(match, (counts.get(match) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

export function inferBrandTerm(hostname: string, title: string, firstHeading?: string): string {
  const source = `${title} ${firstHeading ?? ""}`.trim();
  const titleToken = source
    .split(/[\s|:,-]+/)
    .map((token) => token.trim())
    .find((token) => token.length > 2 && /^[a-z0-9]+$/i.test(token));

  if (titleToken) {
    return titleToken;
  }

  const hostToken = hostname.split(".")[0] ?? hostname;

  return titleCase(hostToken.replace(/[-_]+/g, " "));
}

export function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
