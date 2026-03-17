import { z } from "zod";

import type {
  CommunityResearchReport,
  ContentIdea,
  ContentStrategyReport,
  GeoVisibilityReport,
  SEOAuditReport,
  SiteSnapshot,
} from "@/lib/types/report";
import { generateObjectWithModel } from "@/lib/utils/model";
import { clampNumber, titleCase, uniqueStrings } from "@/lib/utils/text";

const contentStrategySchema = z.object({
  positioning: z.string().min(1),
  audiences: z.array(z.string().min(1)).min(2).max(4),
  messagingPillars: z.array(z.string().min(1)).min(3).max(4),
  hooks: z.array(z.string().min(1)).min(3).max(4),
  contentIdeas: z
    .array(
      z.object({
        channel: z.string().min(1),
        title: z.string().min(1),
        angle: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .min(4)
    .max(6),
});

function inferAudiences(site: SiteSnapshot): string[] {
  const source = `${site.title} ${site.metaDescription} ${site.textContent}`.toLowerCase();
  const audiences: string[] = [];

  if (source.includes("developer")) {
    audiences.push("Developers evaluating technical fit");
  }

  if (source.includes("startup") || source.includes("founder")) {
    audiences.push("Founders looking for fast growth leverage");
  }

  if (source.includes("team") || source.includes("teams")) {
    audiences.push("Small teams consolidating workflows");
  }

  if (source.includes("enterprise") || source.includes("security")) {
    audiences.push("Ops or security-conscious buyers");
  }

  if (audiences.length === 0) {
    audiences.push(`Teams searching for ${site.primaryKeywords[0] ?? "a better workflow"}`);
  }

  return uniqueStrings(audiences).slice(0, 4);
}

function buildHooks(site: SiteSnapshot): string[] {
  const brand = titleCase(site.brandTerm);
  const keyword = site.primaryKeywords[0] ?? "growth";

  return [
    `${brand} helps teams move faster on ${keyword} without adding another bloated workflow.`,
    `The clearest wedge is not the brand itself, but the outcome it unlocks for time-starved teams.`,
    `Position the product around concrete before-and-after states instead of feature inventory.`,
    `Use the same language your users already use in community threads, not internal product language.`,
  ];
}

function buildIdeas(site: SiteSnapshot, audiences: string[]): ContentIdea[] {
  const primaryKeyword = site.primaryKeywords[0] ?? site.brandTerm;
  const audience = audiences[0] ?? "operators";

  return [
    {
      channel: "SEO",
      title: `${titleCase(primaryKeyword)} playbook`,
      angle: `Publish a practical guide aimed at ${audience.toLowerCase()} with examples, templates, and mistakes to avoid.`,
      reason: "Captures high-intent discovery queries while supporting the product pitch with usable detail.",
    },
    {
      channel: "Reddit",
      title: "Founder answer bank",
      angle: "Prepare 8-10 honest, non-promotional responses to recurring community questions tied to the core pain point.",
      reason: "Makes community participation faster without sacrificing authenticity.",
    },
    {
      channel: "X",
      title: "Proof-first thread series",
      angle: "Turn product outcomes, benchmarks, and short customer stories into repeatable short-form social threads.",
      reason: "Builds narrative repetition around outcomes instead of just features.",
    },
    {
      channel: "Landing Page",
      title: "Hero rewrite test",
      angle: "Test a clearer hero headline that combines category, audience, and outcome in one sentence.",
      reason: "Improves both conversion clarity and machine readability.",
    },
    {
      channel: "Lifecycle",
      title: "Three-email onboarding arc",
      angle: "Build a sequence covering problem framing, proof, and activation within the first week.",
      reason: "Translates top-of-funnel traffic into activation instead of just visits.",
    },
  ];
}

export async function runContentStrategyAgent(input: {
  site: SiteSnapshot;
  seo: SEOAuditReport;
  geo: GeoVisibilityReport;
  community: CommunityResearchReport;
}): Promise<ContentStrategyReport> {
  const { site, seo, geo, community } = input;
  const audiences = inferAudiences(site);
  const hooks = buildHooks(site);
  const messagingPillars = uniqueStrings([
    `Make ${titleCase(site.brandTerm)} instantly legible as a ${site.primaryKeywords[0] ?? "category"} product.`,
    seo.issues[0]?.title ?? "Fix the main SEO bottleneck first so distribution compounds over time.",
    geo.gaps[0]?.title ?? "Strengthen AI-search readability with clearer machine-friendly language.",
    community.opportunities[0]
      ? `Translate live community questions about "${community.opportunities[0].query}" into content and landing page copy.`
      : "Use manual community conversations to sharpen positioning before scaling distribution.",
  ]).slice(0, 4);
  const positioning = `${titleCase(site.brandTerm)} should be framed as a ${
    site.primaryKeywords[0] ?? "focused"
  } solution for ${audiences[0].toLowerCase()} that delivers a clear before-and-after transformation.`;
  const score = clampNumber(
    Math.round((seo.score * 0.3 + geo.score * 0.3 + community.score * 0.4) / 1),
    0,
    100,
  );
  const aiStrategy = await generateObjectWithModel({
    schema: contentStrategySchema,
    systemPrompt:
      "Return a founder-ready content strategy in JSON. Make the positioning concrete, the hooks usable, and the ideas channel-specific.",
    userPrompt: [
      `Brand: ${titleCase(site.brandTerm)}`,
      `Homepage title: ${site.title || "n/a"}`,
      `Meta description: ${site.metaDescription || "n/a"}`,
      `Primary keywords: ${site.primaryKeywords.join(", ") || "n/a"}`,
      `Detected audiences: ${audiences.join(" | ")}`,
      `SEO score: ${seo.score}`,
      `Top SEO issues: ${seo.issues.slice(0, 3).map((issue) => issue.title).join(" | ") || "n/a"}`,
      `GEO score: ${geo.score}`,
      `Top GEO gaps: ${geo.gaps.slice(0, 3).map((gap) => gap.title).join(" | ") || "n/a"}`,
      `Community summary: ${community.summary}`,
      `Top community queries: ${community.watchedQueries.join(" | ") || "n/a"}`,
      `Content excerpt: ${site.textContent}`,
    ].join("\n"),
    temperature: 0.4,
  });
  const resolvedAudiences = uniqueStrings(aiStrategy?.audiences ?? audiences).slice(0, 4);

  return {
    score,
    positioning: aiStrategy?.positioning ?? positioning,
    audiences: resolvedAudiences,
    messagingPillars: uniqueStrings(aiStrategy?.messagingPillars ?? messagingPillars).slice(0, 4),
    hooks: uniqueStrings(aiStrategy?.hooks ?? hooks).slice(0, 4),
    contentIdeas: (aiStrategy?.contentIdeas ?? buildIdeas(site, resolvedAudiences)).slice(0, 6),
  };
}
