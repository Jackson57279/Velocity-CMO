"use client";

import Link from "next/link";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import type {
  AgentDescriptor,
  AgentLogEntry,
  CheckResult,
  ContentIdea,
  ExecutionStep,
  MarketingReport,
  Recommendation,
  ScoreCard,
  StrategicInsight,
} from "@/lib/types/report";

interface AgentDashboardProps {
  reportId: string;
  initialReport?: MarketingReport;
}

type FeedTone = Recommendation["priority"] | "neutral";

interface FeedItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly badge: string;
  readonly tone: FeedTone;
  readonly meta: string;
  readonly href?: string;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRunDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatRunDate(value);
}

function statusIcon(status: string): string {
  switch (status) {
    case "completed":
    case "success":
      return "✓";
    case "running":
      return "◐";
    case "failed":
    case "error":
      return "✕";
    case "queued":
    case "pending":
      return "○";
    default:
      return "○";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "completed":
    case "success":
      return "#10b981";
    case "running":
      return "#f59e0b";
    case "failed":
    case "error":
      return "#ef4444";
    case "queued":
    case "pending":
      return "#6b7280";
    default:
      return "#6b7280";
  }
}

function priorityColor(priority: FeedTone): string {
  switch (priority) {
    case "high":
      return "#ef4444";
    case "medium":
      return "#f59e0b";
    case "low":
      return "#10b981";
    default:
      return "#6b7280";
  }
}

function checkIcon(status: CheckResult["status"]): string {
  switch (status) {
    case "pass":
      return "✓";
    case "warn":
      return "◐";
    case "fail":
      return "✕";
    default:
      return "○";
  }
}

function checkColor(status: CheckResult["status"]): string {
  switch (status) {
    case "pass":
      return "#10b981";
    case "warn":
      return "#f59e0b";
    case "fail":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

function scoreColor(score: number): string {
  if (score >= 75) return "#10b981";
  if (score >= 55) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Excellent";
  if (score >= 55) return "Good";
  return "Needs Attention";
}

function horizonLabel(value: ExecutionStep["horizon"]): string {
  const labels = { now: "Now", next: "Next", later: "Later" };
  return labels[value] || value;
}

function calculateProgress(report: MarketingReport): number {
  if (report.status === "completed") return 100;
  const settledAgents = report.agents.filter(
    (agent) => agent.status === "completed" || agent.status === "failed"
  ).length;
  return Math.round((settledAgents / Math.max(report.agents.length, 1)) * 100);
}

function uniqueValues(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function monogram(value: string): string {
  const normalized = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return normalized.slice(0, 2) || "AI";
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}): JSX.Element {
  return (
    <Link
      href={href}
      className={`dash-nav-item ${active ? "dash-nav-active" : ""}`}
    >
      <span className="dash-nav-icon">{icon}</span>
      <span className="dash-nav-label">{label}</span>
    </Link>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendUp,
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}): JSX.Element {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-header">
        <span className="dash-stat-label">{label}</span>
        {trend && (
          <span
            className={`dash-stat-trend ${trendUp ? "dash-trend-up" : "dash-trend-down"}`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="dash-stat-value">{value}</div>
    </div>
  );
}

function ScoreRing({
  score,
  label,
  size = 64,
}: {
  score: number;
  label: string;
  size?: number;
}): JSX.Element {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="dash-score-ring">
      <svg width={size} height={size} className="dash-ring-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
      </svg>
      <div className="dash-ring-content">
        <span className="dash-ring-score" style={{ color }}>
          {score}
        </span>
        <span className="dash-ring-label">{label}</span>
      </div>
    </div>
  );
}

function AgentRow({ agent, progress }: { agent: AgentDescriptor; progress?: number }): JSX.Element {
  const isRunning = agent.status === "running";

  return (
    <div className="dash-agent-row">
      <div className="dash-agent-info">
        <span
          className="dash-agent-status"
          style={{ color: statusColor(agent.status) }}
        >
          {statusIcon(agent.status)}
        </span>
        <div className="dash-agent-details">
          <span className="dash-agent-name">{agent.name}</span>
          <span className="dash-agent-meta">
            {agent.summary || (isRunning ? "Processing..." : "Waiting to start")}
          </span>
        </div>
      </div>
      {isRunning && progress !== undefined && (
        <div className="dash-agent-progress">
          <div className="dash-progress-bar">
            <div
              className="dash-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      <span className="dash-agent-badge" style={{ color: statusColor(agent.status) }}>
        {agent.status}
      </span>
    </div>
  );
}

function ActivityItem({
  title,
  detail,
  timestamp,
  type,
}: {
  title: string;
  detail: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
}): JSX.Element {
  const colors = {
    info: "#6b7280",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
  };

  return (
    <div className="dash-activity-item">
      <div
        className="dash-activity-dot"
        style={{ background: colors[type] }}
      />
      <div className="dash-activity-content">
        <div className="dash-activity-title">{title}</div>
        <div className="dash-activity-detail">{detail}</div>
      </div>
      <div className="dash-activity-time">{timestamp}</div>
    </div>
  );
}

function InsightCard({
  title,
  detail,
  priority,
}: {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}): JSX.Element {
  return (
    <div className="dash-insight-card">
      <div className="dash-insight-header">
        <span
          className="dash-insight-priority"
          style={{ color: priorityColor(priority) }}
        >
          {priority}
        </span>
      </div>
      <h4 className="dash-insight-title">{title}</h4>
      <p className="dash-insight-detail">{detail}</p>
    </div>
  );
}

function CheckItem({ check }: { check: CheckResult }): JSX.Element {
  return (
    <div className="dash-check-item">
      <span style={{ color: checkColor(check.status) }}>{checkIcon(check.status)}</span>
      <div className="dash-check-content">
        <span className="dash-check-label">{check.label}</span>
        <span className="dash-check-detail">{check.detail}</span>
      </div>
    </div>
  );
}

function RoadmapCard({ step }: { step: ExecutionStep }): JSX.Element {
  const horizonColors = {
    now: "#10b981",
    next: "#f59e0b",
    later: "#6366f1",
  };

  return (
    <div className="dash-roadmap-card">
      <div className="dash-roadmap-header">
        <span
          className="dash-roadmap-horizon"
          style={{ color: horizonColors[step.horizon] }}
        >
          {horizonLabel(step.horizon)}
        </span>
        <span className="dash-roadmap-owner">{step.owner}</span>
      </div>
      <h4 className="dash-roadmap-title">{step.title}</h4>
      <p className="dash-roadmap-detail">{step.detail}</p>
    </div>
  );
}

function Tag({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "accent" | "success" | "warning" }): JSX.Element {
  const variantStyles = {
    default: "dash-tag-default",
    accent: "dash-tag-accent",
    success: "dash-tag-success",
    warning: "dash-tag-warning",
  };

  return <span className={`dash-tag ${variantStyles[variant]}`}>{children}</span>;
}

function LoadingState(): JSX.Element {
  return (
    <div className="dash-loading">
      <div className="dash-loading-spinner" />
      <span>Loading report...</span>
    </div>
  );
}

export function AgentDashboard({ reportId, initialReport }: AgentDashboardProps): JSX.Element {
  const [state, setState] = useState<{
    report: MarketingReport | null;
    error: string | null;
  }>({
    report: initialReport ?? null,
    error: null,
  });
  const { report, error } = state;

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    async function loadReport(): Promise<void> {
      try {
        const response = await fetch(`/api/report/${reportId}`, { cache: "no-store" });
        const payload = (await response.json()) as { error?: string; report?: MarketingReport };

        if (!response.ok || !payload.report) {
          throw new Error(payload.error ?? "Report not found.");
        }

        if (cancelled) return;

        setState({
          report: payload.report,
          error: null,
        });

        if (payload.report.status === "queued" || payload.report.status === "running") {
          timeoutId = window.setTimeout(() => {
            void loadReport();
          }, 2000);
        }
      } catch (nextError) {
        if (cancelled) return;

        setState((current) => ({
          report: current.report,
          error: nextError instanceof Error ? nextError.message : "Report not found.",
        }));
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [reportId]);

  const progress = useMemo(() => (report ? calculateProgress(report) : 0), [report]);

  const overviewScores = useMemo((): ScoreCard[] => {
    if (!report) return [];
    if (report.scores.length > 0) return report.scores;

    return [
      report.seo
        ? {
            id: "seo",
            label: "SEO",
            score: report.seo.score,
            summary: "Technical search fundamentals and metadata coverage.",
          }
        : null,
      report.geo
        ? {
            id: "geo",
            label: "GEO",
            score: report.geo.score,
            summary: "How legible the offer is to AI answer engines.",
          }
        : null,
      report.community
        ? {
            id: "community",
            label: "Community",
            score: report.community.score,
            summary: "Where demand and public conversation already exist.",
          }
        : null,
      report.content
        ? {
            id: "content",
            label: "Content",
            score: report.content.score,
            summary: "Narrative strength, hooks, and publishing angles.",
          }
        : null,
    ].filter((item): item is ScoreCard => item !== null);
  }, [report]);

  const dashboardSignals = useMemo(() => {
    if (!report) return [];
    return uniqueValues([
      ...(report.siteSnapshot?.primaryKeywords ?? []),
      ...(report.geo?.signals ?? []),
      ...(report.community?.watchedQueries ?? []),
      ...(report.content?.audiences ?? []),
    ]).slice(0, 12);
  }, [report]);

  const activityItems = useMemo(() => {
    if (!report) return [];

    const items: {
      title: string;
      detail: string;
      timestamp: string;
      type: "info" | "success" | "warning" | "error";
    }[] = [];

    report.agents.forEach((agent) => {
      if (agent.status === "completed") {
        items.push({
          title: `${agent.name} completed`,
          detail: agent.summary || "Analysis finished",
          timestamp: agent.completedAt ? formatRelativeTime(agent.completedAt) : "",
          type: "success",
        });
      } else if (agent.status === "failed") {
        items.push({
          title: `${agent.name} failed`,
          detail: "Check logs for details",
          timestamp: "",
          type: "error",
        });
      }
    });

    report.seo?.issues.slice(0, 3).forEach((issue) => {
      items.push({
        title: issue.title,
        detail: issue.detail,
        timestamp: "",
        type: issue.priority === "high" ? "error" : issue.priority === "medium" ? "warning" : "info",
      });
    });

    return items.slice(0, 10);
  }, [report]);

  const latestLogs = useMemo(() => {
    if (!report) return [];
    return [...report.logs].slice(-8).reverse();
  }, [report]);

  if (error) {
    return (
      <div className="dash-error">
        <div className="dash-error-icon">⚠</div>
        <h2>Report unavailable</h2>
        <p>{error}</p>
        <Link href="/" className="dash-btn dash-btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!report) {
    return <LoadingState />;
  }

  const overallScore = Math.round(
    overviewScores.reduce((acc, score) => acc + score.score, 0) / Math.max(overviewScores.length, 1)
  );

  return (
    <div className="dash-container">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-header-left">
          <Link href="/" className="dash-logo">
            <span className="dash-logo-icon">◆</span>
            <span className="dash-logo-text">Velocity</span>
          </Link>
          <nav className="dash-header-nav">
            <NavItem href="/" icon="⌂" label="Overview" />
            <NavItem href="#" icon="◈" label="Reports" active />
            <NavItem href="#" icon="⚐" label="Deployments" />
            <NavItem href="#" icon="◉" label="Analytics" />
          </nav>
        </div>
        <div className="dash-header-right">
          {process.env.NODE_ENV === "development" && (
            <span className="dash-dev-badge">DEV MODE</span>
          )}
          <div className="dash-team-badge">{monogram(report.hostname)}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dash-main">
        {/* Project Header */}
        <div className="dash-project-header">
          <div className="dash-project-info">
            <div className="dash-project-avatar">{monogram(report.hostname)}</div>
            <div className="dash-project-details">
              <h1 className="dash-project-name">{report.hostname}</h1>
              <div className="dash-project-meta">
                <Tag variant={report.status === "completed" ? "success" : report.status === "running" ? "warning" : "default"}>
                  {statusIcon(report.status)} {report.status}
                </Tag>
                <span className="dash-meta-dot">·</span>
                <span className="dash-meta-text">{report.submittedUrl}</span>
                <span className="dash-meta-dot">·</span>
                <span className="dash-meta-text">Updated {formatRelativeTime(report.updatedAt)}</span>
              </div>
            </div>
          </div>
          <div className="dash-project-actions">
            <Link href="/" className="dash-btn dash-btn-secondary">
              New Run
            </Link>
            <button className="dash-btn dash-btn-primary">Share Report</button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="dash-stats-row">
          <StatCard
            label="Overall Score"
            value={overallScore}
            trend={scoreLabel(overallScore)}
            trendUp={overallScore >= 55}
          />
          <StatCard
            label="Progress"
            value={`${progress}%`}
            trend={`${report.agents.filter((a) => a.status === "completed").length}/${report.agents.length} agents`}
            trendUp={progress >= 50}
          />
          <StatCard
            label="Word Count"
            value={report.siteSnapshot?.wordCount?.toLocaleString() ?? "-"}
          />
          <StatCard
            label="Issues Found"
            value={report.seo?.issues?.length ?? 0}
            trend={report.seo?.issues?.length ? "Action needed" : "All good"}
            trendUp={!report.seo?.issues?.length}
          />
        </div>

        {/* Content Grid */}
        <div className="dash-content-grid">
          {/* Left Column */}
          <div className="dash-column dash-column-wide">
            {/* Score Overview */}
            <section className="dash-section">
              <div className="dash-section-header">
                <h2 className="dash-section-title">Audit Overview</h2>
                <Link href="#" className="dash-link">View all</Link>
              </div>
              <div className="dash-scores-grid">
                {overviewScores.map((score) => (
                  <ScoreRing key={score.id} score={score.score} label={score.label} />
                ))}
                {overviewScores.length === 0 && (
                  <p className="dash-empty">Scores will appear as agents complete their analysis.</p>
                )}
              </div>
            </section>

            {/* Agent Status */}
            <section className="dash-section">
              <div className="dash-section-header">
                <h2 className="dash-section-title">Agent Status</h2>
                <span className="dash-badge">{report.agents.length} agents</span>
              </div>
              <div className="dash-agents-list">
                {report.agents.map((agent) => (
                  <AgentRow key={agent.id} agent={agent} progress={progress} />
                ))}
              </div>
            </section>

            {/* SEO Checks */}
            {report.seo && report.seo.checks.length > 0 && (
              <section className="dash-section">
                <div className="dash-section-header">
                  <h2 className="dash-section-title">SEO Diagnostics</h2>
                  <span className="dash-badge">{report.seo.checks.length} checks</span>
                </div>
                <div className="dash-checks-list">
                  {report.seo.checks.map((check) => (
                    <CheckItem key={check.id} check={check} />
                  ))}
                </div>
              </section>
            )}

            {/* Content Ideas */}
            {report.content && (report.content.contentIdeas.length > 0 || report.content.hooks.length > 0) && (
              <section className="dash-section">
                <div className="dash-section-header">
                  <h2 className="dash-section-title">Content Ideas</h2>
                </div>
                <div className="dash-content-ideas">
                  {report.content.hooks.slice(0, 2).map((hook, i) => (
                    <div key={i} className="dash-content-card">
                      <Tag variant="accent">Hook</Tag>
                      <p className="dash-content-text">{hook}</p>
                    </div>
                  ))}
                  {report.content.contentIdeas.slice(0, 3).map((idea, i) => (
                    <div key={i} className="dash-content-card">
                      <div className="dash-content-header">
                        <Tag variant="success">{idea.channel}</Tag>
                        <span className="dash-content-title">{idea.title}</span>
                      </div>
                      <p className="dash-content-text">{idea.angle}</p>
                      <span className="dash-content-reason">{idea.reason}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Roadmap */}
            {report.brief?.roadmap && report.brief.roadmap.length > 0 && (
              <section className="dash-section">
                <div className="dash-section-header">
                  <h2 className="dash-section-title">Execution Roadmap</h2>
                </div>
                <div className="dash-roadmap-list">
                  {report.brief.roadmap.map((step, i) => (
                    <RoadmapCard key={i} step={step} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column */}
          <div className="dash-column dash-column-narrow">
            {/* Site Snapshot */}
            <section className="dash-section">
              <div className="dash-section-header">
                <h2 className="dash-section-title">Site Snapshot</h2>
              </div>
              <div className="dash-snapshot">
                {report.siteSnapshot ? (
                  <>
                    <div className="dash-snapshot-field">
                      <span className="dash-snapshot-label">Title</span>
                      <span className="dash-snapshot-value">
                        {report.siteSnapshot.title || "No title"}
                      </span>
                    </div>
                    <div className="dash-snapshot-field">
                      <span className="dash-snapshot-label">Meta Description</span>
                      <span className="dash-snapshot-value dash-snapshot-muted">
                        {report.siteSnapshot.metaDescription || "No meta description"}
                      </span>
                    </div>
                    <div className="dash-snapshot-metrics">
                      <div className="dash-snapshot-metric">
                        <span className="dash-metric-value">{report.siteSnapshot.structuredDataCount}</span>
                        <span className="dash-metric-label">Schema items</span>
                      </div>
                      <div className="dash-snapshot-metric">
                        <span className="dash-metric-value">
                          {report.siteSnapshot.imagesTotal - report.siteSnapshot.imagesWithoutAlt}/{report.siteSnapshot.imagesTotal}
                        </span>
                        <span className="dash-metric-label">Alt coverage</span>
                      </div>
                      <div className="dash-snapshot-metric">
                        <span className="dash-metric-value">{report.siteSnapshot.internalLinkCount}</span>
                        <span className="dash-metric-label">Internal links</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="dash-empty">Snapshot will appear once crawling completes.</p>
                )}
              </div>
            </section>

            {/* Signals/Keywords */}
            {dashboardSignals.length > 0 && (
              <section className="dash-section">
                <div className="dash-section-header">
                  <h2 className="dash-section-title">Detected Signals</h2>
                  <span className="dash-badge">{dashboardSignals.length}</span>
                </div>
                <div className="dash-signals">
                  {dashboardSignals.map((signal) => (
                    <Tag key={signal} variant="default">
                      {signal}
                    </Tag>
                  ))}
                </div>
              </section>
            )}

            {/* Activity Feed */}
            <section className="dash-section">
              <div className="dash-section-header">
                <h2 className="dash-section-title">Activity</h2>
              </div>
              <div className="dash-activity-list">
                {activityItems.length > 0 ? (
                  activityItems.map((item, i) => (
                    <ActivityItem key={i} {...item} />
                  ))
                ) : (
                  <p className="dash-empty">Activity will appear as analysis progresses.</p>
                )}
              </div>
            </section>

            {/* Live Logs */}
            <section className="dash-section">
              <div className="dash-section-header">
                <h2 className="dash-section-title">Live Logs</h2>
                <span className="dash-badge pulse">Live</span>
              </div>
              <div className="dash-logs">
                {latestLogs.length > 0 ? (
                  latestLogs.map((log) => (
                    <div key={log.id} className="dash-log-row">
                      <span className="dash-log-time">{formatTimestamp(log.timestamp)}</span>
                      <span
                        className="dash-log-level"
                        style={{
                          color:
                            log.level === "error"
                              ? "#ef4444"
                              : log.level === "success"
                              ? "#10b981"
                              : log.level === "warning"
                              ? "#f59e0b"
                              : "#9ca3af",
                        }}
                      >
                        {log.level}
                      </span>
                      <span className="dash-log-message">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <p className="dash-empty">Waiting for first log entry...</p>
                )}
              </div>
            </section>

            {/* AI Brief */}
            {report.brief && (
              <section className="dash-section dash-section-highlight">
                <div className="dash-section-header">
                  <h2 className="dash-section-title">AI CMO Brief</h2>
                </div>
                <div className="dash-brief">
                  <p className="dash-brief-narrative">
                    {report.brief.narrative || "Brief will appear once analysis completes."}
                  </p>
                  {report.brief.priorities.length > 0 && (
                    <div className="dash-brief-priorities">
                      <h4>Top Priorities</h4>
                      {report.brief.priorities.slice(0, 3).map((priority, i) => (
                        <InsightCard
                          key={i}
                          title={priority.title}
                          detail={priority.detail}
                          priority={i === 0 ? "high" : i === 1 ? "medium" : "low"}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
