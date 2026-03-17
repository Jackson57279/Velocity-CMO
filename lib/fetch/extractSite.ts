import { load } from "cheerio";

import type { SiteSnapshot } from "@/lib/types/report";
import { cleanWhitespace, extractKeywords, inferBrandTerm, truncateText, uniqueStrings } from "@/lib/utils/text";
import { hostnameFromUrl, normalizeSubmittedUrl } from "@/lib/utils/url";

export async function extractSite(inputUrl: string): Promise<SiteSnapshot> {
  const normalizedUrl = normalizeSubmittedUrl(inputUrl);
  const response = await fetch(normalizedUrl, {
    headers: {
      "User-Agent": "ai-cmo-app/0.1 (+https://localhost)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Site fetch failed with status ${response.status}.`);
  }

  const html = await response.text();
  const finalUrl = response.url || normalizedUrl;
  const hostname = hostnameFromUrl(finalUrl);
  const $ = load(html);

  const title =
    cleanWhitespace($("title").first().text()) ||
    cleanWhitespace($("meta[property='og:title']").attr("content") || "");
  const metaDescription =
    cleanWhitespace($("meta[name='description']").attr("content") || "") ||
    cleanWhitespace($("meta[property='og:description']").attr("content") || "");
  const h1 = $("h1")
    .map((_, element) => cleanWhitespace($(element).text()))
    .get()
    .filter(Boolean);
  const h2 = $("h2")
    .map((_, element) => cleanWhitespace($(element).text()))
    .get()
    .filter(Boolean);
  const h3 = $("h3")
    .map((_, element) => cleanWhitespace($(element).text()))
    .get()
    .filter(Boolean);
  const paragraphText = $("p, li")
    .map((_, element) => cleanWhitespace($(element).text()))
    .get()
    .filter(Boolean)
    .join(" ");
  const textContent = truncateText(
    cleanWhitespace(
      `${title} ${metaDescription} ${h1.join(" ")} ${h2.join(" ")} ${paragraphText}`.trim(),
    ),
    5000,
  );
  const canonicalUrl = $("link[rel='canonical']").attr("href")?.trim();
  const robots = $("meta[name='robots']").attr("content")?.trim();
  const language = $("html").attr("lang")?.trim();
  const hasOpenGraph =
    $("meta[property='og:title']").length > 0 || $("meta[property='og:description']").length > 0;
  const structuredDataCount = $("script[type='application/ld+json']").length;
  const imagesTotal = $("img").length;
  const imagesWithoutAlt = $("img")
    .toArray()
    .filter((element) => !($(element).attr("alt") || "").trim()).length;

  const externalDomains = new Set<string>();
  let internalLinkCount = 0;
  let externalLinkCount = 0;

  for (const element of $("a[href]").toArray()) {
    const href = $(element).attr("href");

    if (!href) {
      continue;
    }

    try {
      const resolved = new URL(href, finalUrl);
      const resolvedHostname = resolved.hostname.replace(/^www\./, "");

      if (resolvedHostname === hostname) {
        internalLinkCount += 1;
      } else {
        externalLinkCount += 1;
        externalDomains.add(resolvedHostname);
      }
    } catch {
      continue;
    }
  }

  const brandTerm = inferBrandTerm(hostname, title, h1[0]);
  const primaryKeywords = uniqueStrings(
    extractKeywords(`${title} ${metaDescription} ${h1.join(" ")} ${h2.join(" ")}`),
  );

  return {
    sourceUrl: inputUrl,
    finalUrl,
    hostname,
    brandTerm,
    title,
    metaDescription,
    canonicalUrl,
    robots,
    language,
    headings: { h1, h2, h3 },
    textContent,
    wordCount: textContent.split(/\s+/).filter(Boolean).length,
    primaryKeywords,
    hasOpenGraph,
    structuredDataCount,
    imagesTotal,
    imagesWithoutAlt,
    internalLinkCount,
    externalLinkCount,
    externalDomains: Array.from(externalDomains).slice(0, 8),
  };
}
