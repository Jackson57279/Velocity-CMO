import { randomUUID } from "node:crypto"

import { z } from "zod"

import { getBillingUsageEventName } from "@/lib/billing/store"
import {
  markBillingUsageEventFailed,
  markBillingUsageEventIngested,
  markBillingUsageEventSkipped,
  recordCompletedReportCreditUsage,
} from "@/lib/billing/store"
import { getPolarClient } from "@/lib/billing/polar"
import { runCommunityResearchAgent } from "@/lib/agents/communityResearchAgent"
import { runContentStrategyAgent } from "@/lib/agents/contentStrategyAgent"
import { runGeoVisibilityAgent } from "@/lib/agents/geoVisibilityAgent"
import { runSeoAuditAgent } from "@/lib/agents/seoAuditAgent"
import { extractSite } from "@/lib/fetch/extractSite"
import {
  appendLog,
  claimAnalysisJob,
  completeAnalysisJob,
  failAnalysisJob,
  getReportById,
  getReportBillingContext,
  setAgentStatus,
  setJobStatus,
  touchAnalysisJob,
  updateReport,
  upsertScore,
} from "@/lib/store/report-store"
import type { ExecutiveBrief, MarketingReport, ScoreCard } from "@/lib/types/report"
import { generateObjectWithModel } from "@/lib/utils/model"
import { titleCase } from "@/lib/utils/text"

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
})

function scoreCard(id: string, label: string, score: number, summary: string): ScoreCard {
  return {
    id,
    label,
    score,
    summary,
  }
}

function buildFallbackSummary(report: MarketingReport): string {
  const highestPriorityIssue = report.seo?.issues[0] ?? report.geo?.gaps[0] ?? report.community?.recommendations[0]
  const strongestWin = report.content?.messagingPillars[0] ?? report.geo?.strengths[0] ?? report.seo?.strengths[0]

  return `${titleCase(report.siteSnapshot?.brandTerm ?? report.hostname)} is analyzable enough to start distribution work, but the current growth bottleneck is ${
    highestPriorityIssue?.title.toLowerCase() ?? "clarifying the core positioning"
  }. The fastest win is ${strongestWin?.replace(/\.$/, "").toLowerCase() ?? "tightening the offer language"} while the team turns the strongest insights into repeatable SEO, community, and content loops.`
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
  }
}

async function buildExecutiveArtifacts(report: MarketingReport): Promise<{
  summary: string
  brief: ExecutiveBrief
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
  ].join("\n")
  const aiBrief = await generateObjectWithModel({
    schema: executiveBriefSchema,
    systemPrompt:
      "Return a clean JSON brief for a founder-facing marketing report. The summary should be 2-3 sentences. The roadmap should contain one item each for now, next, and later.",
    userPrompt: modelPrompt,
    temperature: 0.3,
  })

  if (aiBrief) {
    return {
      summary: aiBrief.summary,
      brief: {
        narrative: aiBrief.narrative,
        priorities: aiBrief.priorities,
        roadmap: aiBrief.roadmap,
      },
    }
  }

  return {
    summary: buildFallbackSummary(report),
    brief: buildFallbackBrief(report),
  }
}

export function startMarketingAnalysis(reportId: string): void {
  queueMicrotask(() => {
    void beginMarketingAnalysis(reportId)
  })
}

function buildLockId(reportId: string): string {
  const workerId = process.env.RAILWAY_REPLICA_ID ?? process.env.HOSTNAME ?? "local-worker"

  return `${workerId}:${reportId}:${randomUUID()}`
}

async function syncCompletedReportUsage(reportId: string): Promise<void> {
  const reportContext = await getReportBillingContext(reportId)

  if (!reportContext) {
    return
  }

  const usageResult = await recordCompletedReportCreditUsage({
    organizationId: reportContext.organizationId,
    reportId,
  })

  if (usageResult.status !== "consumed") {
    return
  }

  const polarClient = getPolarClient()

  if (!usageResult.summary.hasPaidPlan) {
    await markBillingUsageEventSkipped(reportId, "Free-tier credits are enforced locally.")
    return
  }

  if (!polarClient) {
    await markBillingUsageEventSkipped(reportId, "Polar is not configured for event ingestion.")
    return
  }

  try {
    await polarClient.events.ingest({
      events: [
        {
          name: getBillingUsageEventName(),
          externalId: reportId,
          externalCustomerId: reportContext.createdByUserId,
          metadata: {
            credits: 1,
            organizationId: reportContext.organizationId,
            reportId,
          },
        },
      ],
    })
    await markBillingUsageEventIngested(reportId)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Usage event ingestion failed."
    await markBillingUsageEventFailed(reportId, message)
  }
}

async function beginMarketingAnalysis(reportId: string): Promise<void> {
  const report = await getReportById(reportId)

  if (!report || report.status === "completed" || report.status === "failed") {
    return
  }

  const lockedBy = buildLockId(reportId)
  const claimed = await claimAnalysisJob(reportId, lockedBy)

  if (!claimed) {
    return
  }

  await runMarketingAnalysis(reportId, lockedBy)
}

async function runMarketingAnalysis(reportId: string, lockedBy: string): Promise<void> {
  const initialReport = await getReportById(reportId)

  if (!initialReport) {
    return
  }

  let activeAgentId = "siteCrawlerAgent"

  async function refreshLease(): Promise<void> {
    await touchAnalysisJob(reportId, lockedBy)
  }

  try {
    await refreshLease()
    await setJobStatus(reportId, "running", "Running site crawl and agent analysis.")
    await setAgentStatus(reportId, activeAgentId, "running", "Fetching and parsing the submitted website.")
    await appendLog(reportId, activeAgentId, "info", "Fetching homepage and extracting the site snapshot.")

    const siteSnapshot = await extractSite(initialReport.normalizedUrl)
    await refreshLease()

    await updateReport(reportId, (draft) => {
      draft.siteSnapshot = siteSnapshot
      draft.hostname = siteSnapshot.hostname
    })
    await setAgentStatus(reportId, activeAgentId, "completed", "Homepage metadata and copy snapshot captured.")
    await appendLog(reportId, activeAgentId, "success", "Captured metadata, headings, keywords, and link structure.")

    activeAgentId = "seoAuditAgent"
    await refreshLease()
    await setAgentStatus(reportId, activeAgentId, "running", "Checking on-page search fundamentals.")
    await appendLog(reportId, activeAgentId, "info", "Evaluating search snippet quality, crawlability, and copy depth.")
    const seo = await runSeoAuditAgent(siteSnapshot)
    await refreshLease()
    await updateReport(reportId, (draft) => {
      draft.seo = seo
    })
    await upsertScore(
      reportId,
      scoreCard("seo", "SEO", seo.score, seo.issues[0]?.title ?? "Search foundations look healthy."),
    )
    await setAgentStatus(reportId, activeAgentId, "completed", seo.issues[0]?.title ?? "SEO checks completed.")
    await appendLog(reportId, activeAgentId, "success", `Finished SEO audit with a score of ${seo.score}.`)

    activeAgentId = "geoVisibilityAgent"
    await refreshLease()
    await setAgentStatus(reportId, activeAgentId, "running", "Scoring AI-search readiness and entity clarity.")
    await appendLog(reportId, activeAgentId, "info", "Reviewing how legible the page is for AI answer engines.")
    const geo = await runGeoVisibilityAgent(siteSnapshot)
    await refreshLease()
    await updateReport(reportId, (draft) => {
      draft.geo = geo
    })
    await upsertScore(
      reportId,
      scoreCard("geo", "GEO", geo.score, geo.gaps[0]?.title ?? "AI-search signals are reasonably clear."),
    )
    await setAgentStatus(reportId, activeAgentId, "completed", geo.summary)
    await appendLog(reportId, activeAgentId, "success", `Finished GEO analysis with a score of ${geo.score}.`)

    activeAgentId = "communityResearchAgent"
    await refreshLease()
    await setAgentStatus(reportId, activeAgentId, "running", "Scanning community demand around the offer.")
    await appendLog(reportId, activeAgentId, "info", "Checking Reddit and Hacker News for overlapping discussion patterns.")
    const community = await runCommunityResearchAgent(siteSnapshot)
    await refreshLease()
    await updateReport(reportId, (draft) => {
      draft.community = community
    })
    await upsertScore(
      reportId,
      scoreCard(
        "community",
        "Community",
        community.score,
        community.opportunities[0]?.title ?? community.summary,
      ),
    )
    await setAgentStatus(reportId, activeAgentId, "completed", community.summary)
    await appendLog(
      reportId,
      activeAgentId,
      community.opportunities.length > 0 ? "success" : "warning",
      community.summary,
    )

    activeAgentId = "contentStrategyAgent"
    await refreshLease()
    await setAgentStatus(reportId, activeAgentId, "running", "Turning the findings into positioning and content moves.")
    await appendLog(reportId, activeAgentId, "info", "Generating the first messaging pillars, hooks, and content ideas.")
    const content = await runContentStrategyAgent({
      site: siteSnapshot,
      seo,
      geo,
      community,
    })
    await refreshLease()
    await updateReport(reportId, (draft) => {
      draft.content = content
    })
    await upsertScore(
      reportId,
      scoreCard("content", "Content", content.score, content.contentIdeas[0]?.title ?? content.positioning),
    )
    await setAgentStatus(reportId, activeAgentId, "completed", content.positioning)
    await appendLog(reportId, activeAgentId, "success", "Messaging pillars and launch content ideas are ready.")

    const completedReport = await getReportById(reportId)

    if (!completedReport) {
      return
    }

    const executiveArtifacts = await buildExecutiveArtifacts(completedReport)
    await refreshLease()
    await updateReport(reportId, (draft) => {
      draft.summary = executiveArtifacts.summary
      draft.brief = executiveArtifacts.brief
      draft.scores = [...draft.scores].sort((left, right) => right.score - left.score)
    })
    await syncCompletedReportUsage(reportId)
    await appendLog(reportId, "contentStrategyAgent", "success", "Analysis complete. Final report assembled.")
    await setJobStatus(reportId, "completed")
    await completeAnalysisJob(reportId)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis failure."

    await setAgentStatus(reportId, activeAgentId, "failed", message)
    await appendLog(reportId, activeAgentId, "error", message)
    await updateReport(reportId, (draft) => {
      draft.errorMessage = message
      draft.summary = "The analysis stopped early because the site could not be fully processed."
    })
    await setJobStatus(reportId, "failed")
    await failAnalysisJob(reportId, message)
  }
}
