import { randomUUID } from "node:crypto"

import { and, desc, eq, lt, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { analysisJobs, reports } from "@/lib/db/schema"
import {
  type AgentDescriptor,
  type AgentLogEntry,
  type AgentStatus,
  type LogLevel,
  type MarketingReport,
  type ScoreCard,
  reportAgentBlueprint,
} from "@/lib/types/report"

const ANALYSIS_LOCK_WINDOW_MS = 20 * 60 * 1000

function cloneAgents(): AgentDescriptor[] {
  return reportAgentBlueprint.map((agent) => ({ ...agent }))
}

function hydrateReport(report: MarketingReport): MarketingReport {
  return report
}

async function getStoredReport(reportId: string): Promise<MarketingReport | undefined> {
  const [record] = await db.select({ payload: reports.payload }).from(reports).where(eq(reports.id, reportId)).limit(1)

  return record ? hydrateReport(record.payload) : undefined
}

function reportRowValues(report: MarketingReport, organizationId: string, createdByUserId: string) {
  return {
    id: report.id,
    organizationId,
    createdByUserId,
    submittedUrl: report.submittedUrl,
    normalizedUrl: report.normalizedUrl,
    hostname: report.hostname,
    status: report.status,
    summary: report.summary,
    payload: report,
    createdAt: new Date(report.createdAt),
    updatedAt: new Date(report.updatedAt),
  }
}

async function persistReport(
  report: MarketingReport,
  organizationId: string,
  createdByUserId: string,
): Promise<void> {
  await db
    .update(reports)
    .set({
      organizationId,
      createdByUserId,
      submittedUrl: report.submittedUrl,
      normalizedUrl: report.normalizedUrl,
      hostname: report.hostname,
      status: report.status,
      summary: report.summary,
      payload: report,
      updatedAt: new Date(report.updatedAt),
    })
    .where(eq(reports.id, report.id))
}

export async function createReport({
  submittedUrl,
  normalizedUrl,
  hostname,
  organizationId,
  createdByUserId,
}: {
  submittedUrl: string
  normalizedUrl: string
  hostname: string
  organizationId: string
  createdByUserId: string
}): Promise<MarketingReport> {
  const timestamp = new Date().toISOString()
  const report: MarketingReport = {
    id: randomUUID(),
    submittedUrl,
    normalizedUrl,
    hostname,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "queued",
    summary: "Queued analysis. Waiting for the first agents to start.",
    agents: cloneAgents(),
    logs: [],
    scores: [],
  }

  await db.insert(reports).values(reportRowValues(report, organizationId, createdByUserId))
  await db.insert(analysisJobs).values({
    reportId: report.id,
    organizationId,
    status: "queued",
  })

  return report
}

export async function getReport(reportId: string, organizationId: string): Promise<MarketingReport | undefined> {
  const [record] = await db
    .select({ payload: reports.payload })
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.organizationId, organizationId)))
    .limit(1)

  return record ? hydrateReport(record.payload) : undefined
}

export async function listReports(organizationId: string, limit = 6): Promise<MarketingReport[]> {
  const records = await db
    .select({ payload: reports.payload })
    .from(reports)
    .where(eq(reports.organizationId, organizationId))
    .orderBy(desc(reports.updatedAt))
    .limit(limit)

  return records.map((record) => hydrateReport(record.payload))
}

export async function updateReport(
  reportId: string,
  updater: (draft: MarketingReport) => void,
): Promise<MarketingReport | undefined> {
  const [record] = await db
    .select({
      payload: reports.payload,
      organizationId: reports.organizationId,
      createdByUserId: reports.createdByUserId,
    })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)

  if (!record) {
    return undefined
  }

  const draft = structuredClone(record.payload)
  updater(draft)
  draft.updatedAt = new Date().toISOString()

  await persistReport(draft, record.organizationId, record.createdByUserId)

  return draft
}

export async function setJobStatus(
  reportId: string,
  status: MarketingReport["status"],
  summary?: string,
): Promise<MarketingReport | undefined> {
  return updateReport(reportId, (draft) => {
    draft.status = status

    if (summary) {
      draft.summary = summary
    }
  })
}

export async function setAgentStatus(
  reportId: string,
  agentId: string,
  status: AgentStatus,
  summary?: string,
): Promise<MarketingReport | undefined> {
  return updateReport(reportId, (draft) => {
    const agent = draft.agents.find((candidate) => candidate.id === agentId)

    if (!agent) {
      return
    }

    agent.status = status

    if (status === "running" && !agent.startedAt) {
      agent.startedAt = new Date().toISOString()
    }

    if (status === "completed" || status === "failed") {
      agent.completedAt = new Date().toISOString()
    }

    if (summary) {
      agent.summary = summary
    }
  })
}

export async function appendLog(
  reportId: string,
  agentId: string,
  level: LogLevel,
  message: string,
): Promise<AgentLogEntry | undefined> {
  const entry: AgentLogEntry = {
    id: randomUUID(),
    agentId,
    level,
    message,
    timestamp: new Date().toISOString(),
  }

  const updated = await updateReport(reportId, (draft) => {
    draft.logs.push(entry)
  })

  return updated ? entry : undefined
}

export async function upsertScore(reportId: string, score: ScoreCard): Promise<MarketingReport | undefined> {
  return updateReport(reportId, (draft) => {
    const existingIndex = draft.scores.findIndex((candidate) => candidate.id === score.id)

    if (existingIndex === -1) {
      draft.scores.push(score)
      return
    }

    draft.scores[existingIndex] = score
  })
}

export async function claimAnalysisJob(reportId: string, lockedBy: string): Promise<boolean> {
  const staleThreshold = new Date(Date.now() - ANALYSIS_LOCK_WINDOW_MS)
  const [claimedJob] = await db
    .update(analysisJobs)
    .set({
      status: "running",
      lockedAt: new Date(),
      lockedBy,
      startedAt: sql`coalesce(${analysisJobs.startedAt}, now())`,
      completedAt: null,
      attemptCount: sql`${analysisJobs.attemptCount} + 1`,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(analysisJobs.reportId, reportId),
        or(
          eq(analysisJobs.status, "queued"),
          and(eq(analysisJobs.status, "running"), lt(analysisJobs.lockedAt, staleThreshold)),
        ),
      ),
    )
    .returning({ reportId: analysisJobs.reportId })

  return Boolean(claimedJob)
}

export async function touchAnalysisJob(reportId: string, lockedBy: string): Promise<void> {
  await db
    .update(analysisJobs)
    .set({
      lockedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(analysisJobs.reportId, reportId), eq(analysisJobs.lockedBy, lockedBy)))
}

export async function completeAnalysisJob(reportId: string): Promise<void> {
  await db
    .update(analysisJobs)
    .set({
      status: "completed",
      lockedAt: null,
      lockedBy: null,
      completedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(analysisJobs.reportId, reportId))
}

export async function failAnalysisJob(reportId: string, message: string): Promise<void> {
  await db
    .update(analysisJobs)
    .set({
      status: "failed",
      lockedAt: null,
      lockedBy: null,
      completedAt: new Date(),
      lastError: message,
      updatedAt: new Date(),
    })
    .where(eq(analysisJobs.reportId, reportId))
}

export async function getReportById(reportId: string): Promise<MarketingReport | undefined> {
  return getStoredReport(reportId)
}
