import { z } from "zod";

import type { GeoVisibilityReport, Recommendation, SiteSnapshot } from "@/lib/types/report";
import { generateObjectWithModel } from "@/lib/utils/model";
import { clampNumber } from "@/lib/utils/text";

const geoEnhancementSchema = z.object({
  summary: z.string().min(1),
  strengths: z.array(z.string().min(1)).min(1).max(4),
  signals: z.array(z.string().min(1)).min(1).max(5),
});

function gap(
  title: string,
  detail: string,
  priority: Recommendation["priority"],
  impact: string,
): Recommendation {
  return {
    title,
    detail,
    priority,
    impact,
    owner: "Marketing",
  };
}

export async function runGeoVisibilityAgent(site: SiteSnapshot): Promise<GeoVisibilityReport> {
  const strengths: string[] = [];
  const signals: string[] = [];
  const gaps: Recommendation[] = [];
  let score = 38;

  const titleSource = `${site.title} ${site.headings.h1.join(" ")}`.toLowerCase();
  const brandLower = site.brandTerm.toLowerCase();

  if (titleSource.includes(brandLower)) {
    score += 14;
    strengths.push("Brand term appears directly in the title or primary heading.");
  } else {
    gaps.push(
      gap(
        "Name the brand more explicitly",
        "Mention the brand in the title tag or primary hero heading so AI answers can map the entity faster.",
        "high",
        "Improves brand attribution inside AI-generated results.",
      ),
    );
  }

  if (site.metaDescription.length >= 80) {
    score += 10;
    signals.push("Meta description gives the page a machine-readable summary.");
  } else {
    gaps.push(
      gap(
        "Tighten the machine-readable summary",
        "Add a richer meta description that explains audience, category, and outcome in one line.",
        "medium",
        "Makes the page easier for AI systems to summarize accurately.",
      ),
    );
  }

  if (site.primaryKeywords.length >= 3) {
    score += 12;
    strengths.push("The page exposes multiple category keywords that can anchor AI retrieval.");
  } else {
    gaps.push(
      gap(
        "Clarify the category language",
        "Repeat the category, user segment, and core use case in headings and body copy instead of relying on brand copy alone.",
        "medium",
        "Raises the chance that AI search engines retrieve the page for non-branded queries.",
      ),
    );
  }

  if (site.wordCount >= 250) {
    score += 10;
    signals.push("The page has enough copy to support answer generation and citation.");
  } else {
    gaps.push(
      gap(
        "Add retrieval-friendly detail",
        "Expand the copy with specific use cases, buyer concerns, and implementation details that an answer engine can cite.",
        "medium",
        "Improves long-tail answer coverage.",
      ),
    );
  }

  if (site.structuredDataCount > 0) {
    score += 8;
    strengths.push("Structured data gives answer engines clearer entity signals.");
  } else {
    gaps.push(
      gap(
        "Add entity schema",
        "Use Organization or Product schema to make the company, offer, and page intent easier to parse.",
        "medium",
        "Improves machine understanding for AI overviews and answer engines.",
      ),
    );
  }

  if (site.hasOpenGraph) {
    score += 6;
    signals.push("Open Graph metadata is present for richer distribution previews.");
  }

  if (site.internalLinkCount >= 5) {
    score += 6;
    strengths.push("Internal links suggest there is supporting content AI tools can traverse later.");
  }

  if (site.externalLinkCount > 0) {
    score += 4;
    signals.push("Outbound references can help contextualize the page topic.");
  }

  const clampedScore = clampNumber(Math.round(score), 0, 100);
  const fallbackSummary =
    clampedScore >= 70
      ? "The page is fairly legible for AI answer engines, but stronger category wording and proof content would improve retrieval."
      : "The page has the beginnings of a usable AI-search footprint, but it still needs clearer entity language, richer copy, and more retrieval-friendly structure.";
  const aiEnhancement = await generateObjectWithModel({
    schema: geoEnhancementSchema,
    systemPrompt:
      "Return a concise GEO analysis in JSON for a founder. Keep the wording grounded and retrieval-focused.",
    userPrompt: [
      `Brand: ${site.brandTerm}`,
      `Homepage title: ${site.title || "n/a"}`,
      `Meta description: ${site.metaDescription || "n/a"}`,
      `Primary keywords: ${site.primaryKeywords.join(", ") || "n/a"}`,
      `Word count: ${site.wordCount}`,
      `Structured data blocks: ${site.structuredDataCount}`,
      `Open Graph present: ${site.hasOpenGraph ? "yes" : "no"}`,
      `Internal links: ${site.internalLinkCount}`,
      `Initial score: ${clampedScore}`,
      `Current strengths: ${strengths.join(" | ") || "n/a"}`,
      `Current signals: ${signals.join(" | ") || "n/a"}`,
      `Current gaps: ${gaps.map((item) => item.title).join(" | ") || "n/a"}`,
    ].join("\n"),
    temperature: 0.3,
  });

  return {
    score: clampedScore,
    summary: aiEnhancement?.summary ?? fallbackSummary,
    strengths: aiEnhancement?.strengths ?? strengths,
    signals: aiEnhancement?.signals ?? signals,
    gaps,
  };
}
