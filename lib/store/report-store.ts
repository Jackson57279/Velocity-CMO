import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  type AgentDescriptor,
  type AgentLogEntry,
  type AgentStatus,
  type LogLevel,
  type MarketingReport,
  type ScoreCard,
  reportAgentBlueprint,
} from "@/lib/types/report";

declare global {
  var __aiCmoReports: Map<string, MarketingReport> | undefined;
  var __aiCmoReportStorageReady: boolean | undefined;
}

const STORAGE_DIR = join(process.cwd(), ".data", "reports");
const reportStore = globalThis.__aiCmoReports ?? new Map<string, MarketingReport>();

if (!globalThis.__aiCmoReports) {
  globalThis.__aiCmoReports = reportStore;
}

function ensureStorageDir(): void {
  if (globalThis.__aiCmoReportStorageReady) {
    return;
  }

  mkdirSync(STORAGE_DIR, { recursive: true });
  globalThis.__aiCmoReportStorageReady = true;
}

function reportFilePath(reportId: string): string {
  return join(STORAGE_DIR, `${reportId}.json`);
}

function rememberReport(report: MarketingReport): MarketingReport {
  reportStore.set(report.id, report);
  return report;
}

function persistReport(report: MarketingReport): void {
  ensureStorageDir();

  const destinationPath = reportFilePath(report.id);
  const temporaryPath = `${destinationPath}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(report, null, 2), "utf8");
  renameSync(temporaryPath, destinationPath);
}

function parseStoredReport(serializedReport: string): MarketingReport | undefined {
  try {
    const parsed = JSON.parse(serializedReport) as MarketingReport;

    if (!parsed.id || !parsed.updatedAt) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

function readStoredReport(reportId: string): MarketingReport | undefined {
  ensureStorageDir();

  const storedPath = reportFilePath(reportId);

  if (!existsSync(storedPath)) {
    return undefined;
  }

  const parsed = parseStoredReport(readFileSync(storedPath, "utf8"));

  return parsed ? rememberReport(parsed) : undefined;
}

function cloneAgents(): AgentDescriptor[] {
  return reportAgentBlueprint.map((agent) => ({ ...agent }));
}

export function createReport(submittedUrl: string, normalizedUrl: string, hostname: string): MarketingReport {
  const timestamp = new Date().toISOString();
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
  };

  rememberReport(report);
  persistReport(report);

  return rememberReport(report);
}

export function getReport(reportId: string): MarketingReport | undefined {
  return reportStore.get(reportId) ?? readStoredReport(reportId);
}

export function listReports(limit = 6): MarketingReport[] {
  ensureStorageDir();

  const mergedReports = new Map<string, MarketingReport>();

  for (const report of reportStore.values()) {
    mergedReports.set(report.id, report);
  }

  for (const fileName of readdirSync(STORAGE_DIR)) {
    if (!fileName.endsWith(".json")) {
      continue;
    }

    const parsed = parseStoredReport(readFileSync(join(STORAGE_DIR, fileName), "utf8"));

    if (parsed) {
      mergedReports.set(parsed.id, parsed);
      rememberReport(parsed);
    }
  }

  return Array.from(mergedReports.values())
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, limit);
}

export function updateReport(
  reportId: string,
  updater: (draft: MarketingReport) => void,
): MarketingReport | undefined {
  const current = getReport(reportId);

  if (!current) {
    return undefined;
  }

  const draft = structuredClone(current);
  updater(draft);
  draft.updatedAt = new Date().toISOString();
  rememberReport(draft);
  persistReport(draft);

  return draft;
}

export function setJobStatus(
  reportId: string,
  status: MarketingReport["status"],
  summary?: string,
): MarketingReport | undefined {
  return updateReport(reportId, (draft) => {
    draft.status = status;

    if (summary) {
      draft.summary = summary;
    }
  });
}

export function setAgentStatus(
  reportId: string,
  agentId: string,
  status: AgentStatus,
  summary?: string,
): MarketingReport | undefined {
  return updateReport(reportId, (draft) => {
    const agent = draft.agents.find((candidate) => candidate.id === agentId);

    if (!agent) {
      return;
    }

    agent.status = status;

    if (status === "running" && !agent.startedAt) {
      agent.startedAt = new Date().toISOString();
    }

    if (status === "completed" || status === "failed") {
      agent.completedAt = new Date().toISOString();
    }

    if (summary) {
      agent.summary = summary;
    }
  });
}

export function appendLog(
  reportId: string,
  agentId: string,
  level: LogLevel,
  message: string,
): AgentLogEntry | undefined {
  const entry: AgentLogEntry = {
    id: randomUUID(),
    agentId,
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  const updated = updateReport(reportId, (draft) => {
    draft.logs.push(entry);
  });

  return updated ? entry : undefined;
}

export function upsertScore(reportId: string, score: ScoreCard): MarketingReport | undefined {
  return updateReport(reportId, (draft) => {
    const existingIndex = draft.scores.findIndex((candidate) => candidate.id === score.id);

    if (existingIndex === -1) {
      draft.scores.push(score);
      return;
    }

    draft.scores[existingIndex] = score;
  });
}
