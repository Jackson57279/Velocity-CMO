import { z } from "zod";

import { runCommunityResearchAgent } from "@/lib/agents/communityResearchAgent";
import { runContentStrategyAgent } from "@/lib/agents/contentStrategyAgent";
import { runGeoVisibilityAgent } from "@/lib/agents/geoVisibilityAgent";
import { runSeoAuditAgent } from "@/lib/agents/seoAuditAgent";
import { extractSite } from "@/lib/fetch/extractSite";
import {
  appendLog,
  getReport,
  setAgentStatus,
  setJobStatus,
  updateReport,
  upsertScore,
} from "@/lib/store/report-store";
import type { ExecutiveBrief, MarketingReport, ScoreCard } from "@/lib/types/report";
import { generateObjectWithModel } from "@/lib/utils/model";
import { titleCase } from "@/lib/utils/text";

declare global {
  var __aiCmoActiveRuns: Set<string> | undefined;
}

const activeRuns = globalThis.__aiCmoActiveRuns ?? new Set<string>();

if (!globalThis.__aiCmoActiveRuns) {
  globalThis.__aiCmoActiveRuns = activeRuns;
}

const executiveBriefSchema = z.object({
  summary: z.string().min(1),
  narrative: z.string().min(1),
  priorities: z
    .array(
      z.object({
        title: z.string().min(1),
        detail: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
  roadmap: z
    .array(
      z.object({
        horizon: z.enum(["now", "next", "later"]),
        title: z.string().min(1),
        detail: z.string().min(1),
        owner: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
});

function scoreCard(id: string, label: string, score: number, summary: string): ScoreCard {
  return {
    id,
    label,
    score,
    summary,
  };
}

function buildFallbackSummary(report: MarketingReport): string {
  const highestPriorityIssue = report.seo?.issues[0] ?? report.geo?.gaps[0] ?? report.community?.recommendations[0];
  const strongestWin = report.content?.messagingPillars[0] ?? report.geo?.strengths[0] ?? report.seo?.strengths[0];

  return `${titleCase(report.siteSnapshot?.brandTerm ?? report.hostname)} is analyzable enough to start distribution work, but the current growth bottleneck is ${
    highestPriorityIssue?.title.toLowerCase() ?? "clarifying the core positioning"
  }. The fastest win is ${strongestWin?.replace(/\.$/, "").toLowerCase() ?? "tightening the offer language"} while the team turns the strongest insights into repeatable SEO, community, and content loops.`;
}

function buildFallbackBrief(report: MarketingReport): ExecutiveBrief {
  return {
    narrative:
      report.content?.positioning ??
      "The site has enough signal to act on, but the positioning still needs to get sharper before distribution can compound.",
    priorities: [
      {
        title: report.seo?.issues[0]?.title ?? "Clarify the search-facing story",
        detail:
          report.seo?.issues[0]?.detail ??
          "Tighten the title, meta description, and headline so the category and outcome are obvious at a glance.",
      },
      {
        title: report.geo?.gaps[0]?.title ?? "Make the offer easier for AI systems to retrieve",
        detail:
          report.geo?.gaps[0]?.detail ??
          "Expand the copy with clearer category language, use cases, and entity signals that answer engines can cite.",
      },
      {
        title: report.community?.recommendations[0]?.title ?? "Turn research into repeatable distribution",
        detail:
          report.community?.recommendations[0]?.detail ??
          "Use live community phrasing and proof points to shape early content and outbound responses.",
      },
    ],
    roadmap: [
      {
        horizon: "now",
        title: "Rewrite the homepage promise",
        detail:
          report.content?.hooks[0] ??
          "Lead with a headline that names the buyer, category, and outcome without relying on internal product language.",
        owner: "Marketing",
      },
      {
        horizon: "next",
        title: report.content?.contentIdeas[0]?.title ?? "Publish the first demand-capture asset",
        detail:
          report.content?.contentIdeas[0]?.angle ??
          "Ship a practical SEO page or guide that mirrors the language buyers already use when searching.",
        owner: "Content",
      },
      {
        horizon: "later",
        title: "Build a repeatable distribution loop",
        detail:
          report.community?.recommendations[1]?.detail ??
          "Fold community questions, sales objections, and proof points back into new landing page and social content.",
        owner: "Growth",
      },
    ],
  };
}

async function buildExecutiveArtifacts(report: MarketingReport): Promise<{
  summary: string;
  brief: ExecutiveBrief;
}> {
  const modelPrompt = [
    "You are an operator-level CMO summarizing a website audit for a founder.",
    "Create a concise executive summary plus a short action brief.",
    "Keep everything concrete, specific, and non-hypey.",
    `Brand: ${report.siteSnapshot?.brandTerm ?? report.hostname}`,
    `SEO score: ${report.seo?.score ?? "n/a"}`,
    `GEO score: ${report.geo?.score ?? "n/a"}`,
    `Community score: ${report.community?.score ?? "n/a"}`,
    `Content score: ${report.content?.score ?? "n/a"}`,
    `Top SEO issue: ${report.seo?.issues[0]?.title ?? "n/a"}`,
    `Top GEO gap: ${report.geo?.gaps[0]?.title ?? "n/a"}`,
    `Best community angle: ${report.community?.opportunities[0]?.title ?? report.community?.recommendations[0]?.title ?? "n/a"}`,
    `Positioning draft: ${report.content?.positioning ?? "n/a"}`,
    `Messaging pillars: ${(report.content?.messagingPillars ?? []).join(" | ") || "n/a"}`,
  ].join("\n");
  const aiBrief = await generateObjectWithModel({
    schema: executiveBriefSchema,
    systemPrompt:
      "Return a clean JSON brief for a founder-facing marketing report. The summary should be 2-3 sentences. The roadmap should contain one item each for now, next, and later.",
    userPrompt: modelPrompt,
    temperature: 0.3,
  });

  if (aiBrief) {
    return {
      summary: aiBrief.summary,
      brief: {
        narrative: aiBrief.narrative,
        priorities: aiBrief.priorities,
        roadmap: aiBrief.roadmap,
      },
    };
  }

  return {
    summary: buildFallbackSummary(report),
    brief: buildFallbackBrief(report),
  };
}

export function startMarketingAnalysis(reportId: string): void {
  const report = getReport(reportId);

  if (!report || activeRuns.has(reportId) || report.status === "completed" || report.status === "failed") {
    return;
  }

  activeRuns.add(reportId);

  queueMicrotask(() => {
    void runMarketingAnalysis(reportId).finally(() => {
      activeRuns.delete(reportId);
    });
  });
}

async function runMarketingAnalysis(reportId: string): Promise<void> {
  const initialReport = getReport(reportId);

  if (!initialReport) {
    return;
  }

  let activeAgentId = "siteCrawlerAgent";

  try {
    setJobStatus(reportId, "running", "Running site crawl and agent analysis.");
    setAgentStatus(reportId, activeAgentId, "running", "Fetching and parsing the submitted website.");
    appendLog(reportId, activeAgentId, "info", "Fetching homepage and extracting the site snapshot.");

    const siteSnapshot = await extractSite(initialReport.normalizedUrl);

    updateReport(reportId, (draft) => {
      draft.siteSnapshot = siteSnapshot;
      draft.hostname = siteSnapshot.hostname;
    });
    setAgentStatus(reportId, activeAgentId, "completed", "Homepage metadata and copy snapshot captured.");
    appendLog(reportId, activeAgentId, "success", "Captured metadata, headings, keywords, and link structure.");

    activeAgentId = "seoAuditAgent";
    setAgentStatus(reportId, activeAgentId, "running", "Checking on-page search fundamentals.");
    appendLog(reportId, activeAgentId, "info", "Evaluating search snippet quality, crawlability, and copy depth.");
    const seo = await runSeoAuditAgent(siteSnapshot);
    updateReport(reportId, (draft) => {
      draft.seo = seo;
    });
    upsertScore(reportId, scoreCard("seo", "SEO", seo.score, seo.issues[0]?.title ?? "Search foundations look healthy."));
    setAgentStatus(reportId, activeAgentId, "completed", seo.issues[0]?.title ?? "SEO checks completed.");
    appendLog(reportId, activeAgentId, "success", `Finished SEO audit with a score of ${seo.score}.`);

    activeAgentId = "geoVisibilityAgent";
    setAgentStatus(reportId, activeAgentId, "running", "Scoring AI-search readiness and entity clarity.");
    appendLog(reportId, activeAgentId, "info", "Reviewing how legible the page is for AI answer engines.");
    const geo = await runGeoVisibilityAgent(siteSnapshot);
    updateReport(reportId, (draft) => {
      draft.geo = geo;
    });
    upsertScore(reportId, scoreCard("geo", "GEO", geo.score, geo.gaps[0]?.title ?? "AI-search signals are reasonably clear."));
    setAgentStatus(reportId, activeAgentId, "completed", geo.summary);
    appendLog(reportId, activeAgentId, "success", `Finished GEO analysis with a score of ${geo.score}.`);

    activeAgentId = "communityResearchAgent";
    setAgentStatus(reportId, activeAgentId, "running", "Scanning community demand around the offer.");
    appendLog(reportId, activeAgentId, "info", "Checking Reddit and Hacker News for overlapping discussion patterns.");
    const community = await runCommunityResearchAgent(siteSnapshot);
    updateReport(reportId, (draft) => {
      draft.community = community;
    });
    upsertScore(
      reportId,
      scoreCard(
        "community",
        "Community",
        community.score,
        community.opportunities[0]?.title ?? community.summary,
      ),
    );
    setAgentStatus(reportId, activeAgentId, "completed", community.summary);
    appendLog(
      reportId,
      activeAgentId,
      community.opportunities.length > 0 ? "success" : "warning",
      community.summary,
    );

    activeAgentId = "contentStrategyAgent";
    setAgentStatus(reportId, activeAgentId, "running", "Turning the findings into positioning and content moves.");
    appendLog(reportId, activeAgentId, "info", "Generating the first messaging pillars, hooks, and content ideas.");
    const content = await runContentStrategyAgent({
      site: siteSnapshot,
      seo,
      geo,
      community,
    });
    updateReport(reportId, (draft) => {
      draft.content = content;
    });
    upsertScore(
      reportId,
      scoreCard("content", "Content", content.score, content.contentIdeas[0]?.title ?? content.positioning),
    );
    setAgentStatus(reportId, activeAgentId, "completed", content.positioning);
    appendLog(reportId, activeAgentId, "success", "Messaging pillars and launch content ideas are ready.");

    const completedReport = getReport(reportId);

    if (!completedReport) {
      return;
    }

    const executiveArtifacts = await buildExecutiveArtifacts(completedReport);
    updateReport(reportId, (draft) => {
      draft.summary = executiveArtifacts.summary;
      draft.brief = executiveArtifacts.brief;
      draft.scores = [...draft.scores].sort((left, right) => right.score - left.score);
    });
    appendLog(reportId, "contentStrategyAgent", "success", "Analysis complete. Final report assembled.");
    setJobStatus(reportId, "completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis failure.";

    setAgentStatus(reportId, activeAgentId, "failed", message);
    appendLog(reportId, activeAgentId, "error", message);
    updateReport(reportId, (draft) => {
      draft.errorMessage = message;
      draft.summary = "The analysis stopped early because the site could not be fully processed.";
    });
    setJobStatus(reportId, "failed");
  }
}
