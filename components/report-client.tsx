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

interface ReportClientProps {
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

function statusClassName(status: string): string {
  return `status-badge status-${status}`;
}

function priorityClassName(priority: FeedTone): string {
  return `priority-pill priority-${priority}`;
}

function checkClassName(status: CheckResult["status"]): string {
  return `check-row check-${status}`;
}

function scoreTone(score: number): string {
  if (score >= 75) {
    return "score-strong";
  }

  if (score >= 55) {
    return "score-mid";
  }

  return "score-weak";
}

function scoreLabel(score: number): string {
  if (score >= 75) {
    return "Healthy";
  }

  if (score >= 55) {
    return "Mixed";
  }

  return "Needs work";
}

function horizonLabel(value: ExecutionStep["horizon"]): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function calculateProgress(report: MarketingReport): number {
  if (report.status === "completed") {
    return 100;
  }

  const settledAgents = report.agents.filter(
    (agent) => agent.status === "completed" || agent.status === "failed",
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

function OverviewGrid({ scores }: { scores: readonly ScoreCard[] }): JSX.Element {
  if (scores.length === 0) {
    return <p className="empty-state">Scored sections will appear once the agents finish.</p>;
  }

  return (
    <div className="dashboard-score-grid">
      {scores.map((score) => (
        <article className={`dashboard-score-card ${scoreTone(score.score)}`} key={score.id}>
          <div className="dashboard-score-head">
            <span>{score.label}</span>
            <strong>{score.score}</strong>
          </div>
          <div className="dashboard-score-bar" aria-hidden="true">
            <span style={{ width: `${Math.max(6, Math.min(score.score, 100))}%` }} />
          </div>
          <p>{score.summary}</p>
          <small>{scoreLabel(score.score)}</small>
        </article>
      ))}
    </div>
  );
}

function PriorityList({ priorities }: { priorities: readonly StrategicInsight[] }): JSX.Element {
  if (priorities.length === 0) {
    return <p className="empty-state">No explicit priorities were generated yet.</p>;
  }

  return (
    <div className="brief-list">
      {priorities.map((priority) => (
        <article className="brief-card" key={`${priority.title}-${priority.detail}`}>
          <strong>{priority.title}</strong>
          <p>{priority.detail}</p>
        </article>
      ))}
    </div>
  );
}

function RoadmapList({ roadmap }: { roadmap: readonly ExecutionStep[] }): JSX.Element {
  if (roadmap.length === 0) {
    return <p className="empty-state">The execution roadmap is still being assembled.</p>;
  }

  return (
    <div className="roadmap-list">
      {roadmap.map((step) => (
        <article className="roadmap-card" key={`${step.horizon}-${step.title}`}>
          <div className="stack-card-head">
            <strong>{step.title}</strong>
            <span className="priority-pill priority-neutral">{horizonLabel(step.horizon)}</span>
          </div>
          <p>{step.detail}</p>
          <small>{step.owner}</small>
        </article>
      ))}
    </div>
  );
}

function AgentTable({ agents }: { agents: readonly AgentDescriptor[] }): JSX.Element {
  if (agents.length === 0) {
    return <p className="empty-state">No agents have been scheduled for this report.</p>;
  }

  return (
    <div className="dashboard-table">
      <div className="dashboard-table-head">
        <span>Platform</span>
        <span>Status</span>
      </div>
      {agents.map((agent) => (
        <article className="dashboard-table-row" key={agent.id}>
          <div>
            <strong>{agent.name}</strong>
            <p>{agent.summary ?? "Waiting for this agent."}</p>
          </div>
          <span className={statusClassName(agent.status)}>{agent.status}</span>
        </article>
      ))}
    </div>
  );
}

function SignalList({
  signals,
  emptyMessage,
}: {
  signals: readonly string[];
  emptyMessage: string;
}): JSX.Element {
  if (signals.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="token-list">
      {signals.map((signal) => (
        <span className="token" key={signal}>
          {signal}
        </span>
      ))}
    </div>
  );
}

function FeedList({ items }: { items: readonly FeedItem[] }): JSX.Element {
  if (items.length === 0) {
    return <p className="empty-state">Fresh recommendations will land here as each agent finishes.</p>;
  }

  return (
    <div className="dashboard-feed-list">
      {items.map((item) => (
        <article className="dashboard-feed-item" key={item.id}>
          <div className="stack-card-head">
            <h4>{item.title}</h4>
            <span className={priorityClassName(item.tone)}>{item.badge}</span>
          </div>
          <p>{item.detail}</p>
          <small>{item.meta}</small>
          {item.href ? (
            <a className="inline-link" href={item.href} rel="noreferrer" target="_blank">
              Open source thread
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ContentIdeaList({
  ideas,
  hooks,
}: {
  ideas: readonly ContentIdea[];
  hooks: readonly string[];
}): JSX.Element {
  if (ideas.length === 0 && hooks.length === 0) {
    return <p className="empty-state">Content ideas and hooks will appear after the strategy pass.</p>;
  }

  return (
    <div className="dashboard-content-stack">
      {hooks.slice(0, 3).map((hook) => (
        <article className="dashboard-feed-item dashboard-feed-item-soft" key={hook}>
          <div className="stack-card-head">
            <h4>Hook</h4>
            <span className="priority-pill priority-neutral">Message</span>
          </div>
          <p>{hook}</p>
        </article>
      ))}
      {ideas.slice(0, 3).map((idea) => (
        <article className="dashboard-feed-item" key={`${idea.channel}-${idea.title}`}>
          <div className="stack-card-head">
            <h4>{idea.title}</h4>
            <span className="priority-pill priority-low">{idea.channel}</span>
          </div>
          <p>{idea.angle}</p>
          <small>{idea.reason}</small>
        </article>
      ))}
    </div>
  );
}

function LogFeed({ logs }: { logs: readonly AgentLogEntry[] }): JSX.Element {
  return (
    <div className="terminal-feed">
      {logs.length === 0 ? (
        <p className="empty-state">Waiting for the first agent log entry.</p>
      ) : (
        logs.map((entry) => (
          <div className={`terminal-row terminal-${entry.level}`} key={entry.id}>
            <span>{formatTimestamp(entry.timestamp)}</span>
            <code>{entry.agentId}</code>
            <p>{entry.message}</p>
          </div>
        ))
      )}
    </div>
  );
}

function SnapshotSummary({
  snapshot,
}: {
  snapshot: MarketingReport["siteSnapshot"];
}): JSX.Element {
  if (!snapshot) {
    return <p className="empty-state">The site crawler has not produced a structured snapshot yet.</p>;
  }

  const altCoverage =
    snapshot.imagesTotal === 0
      ? "No images"
      : `${Math.max(snapshot.imagesTotal - snapshot.imagesWithoutAlt, 0)}/${snapshot.imagesTotal}`;

  return (
    <div className="snapshot-stack">
      <div className="dashboard-copy-block">
        <span className="dashboard-copy-label">Title</span>
        <strong>{snapshot.title || "Untitled page"}</strong>
      </div>
      <div className="dashboard-copy-block">
        <span className="dashboard-copy-label">Meta description</span>
        <p>{snapshot.metaDescription || "No meta description detected."}</p>
      </div>
      <div className="snapshot-grid">
        <article className="snapshot-metric">
          <span>Brand term</span>
          <strong>{snapshot.brandTerm}</strong>
        </article>
        <article className="snapshot-metric">
          <span>Word count</span>
          <strong>{snapshot.wordCount}</strong>
        </article>
        <article className="snapshot-metric">
          <span>Structured data</span>
          <strong>{snapshot.structuredDataCount}</strong>
        </article>
        <article className="snapshot-metric">
          <span>Alt coverage</span>
          <strong>{altCoverage}</strong>
        </article>
        <article className="snapshot-metric">
          <span>Internal links</span>
          <strong>{snapshot.internalLinkCount}</strong>
        </article>
        <article className="snapshot-metric">
          <span>Linked domains</span>
          <strong>{snapshot.externalDomains.length}</strong>
        </article>
      </div>
    </div>
  );
}

function LoadingShell(): JSX.Element {
  return (
    <section className="report-shell report-console">
      <div className="loading-stack">
        <div className="loading-panel loading-panel-hero" />
        <div className="loading-grid">
          <div className="loading-panel" />
          <div className="loading-panel" />
          <div className="loading-panel" />
          <div className="loading-panel" />
        </div>
      </div>
    </section>
  );
}

export function ReportClient({ reportId, initialReport }: ReportClientProps): JSX.Element {
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

        if (cancelled) {
          return;
        }

        setState({
          report: payload.report,
          error: null,
        });

        if (payload.report.status === "queued" || payload.report.status === "running") {
          timeoutId = window.setTimeout(() => {
            void loadReport();
          }, 1500);
        }
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          report: current.report,
          error: nextError instanceof Error ? nextError.message : "Report not found.",
        }));
      }
    }

    void loadReport();

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [reportId]);

  const sortedAgents = useMemo(() => report?.agents ?? [], [report]);
  const progress = useMemo(() => (report ? calculateProgress(report) : 0), [report]);

  const overviewScores = useMemo((): ScoreCard[] => {
    if (!report) {
      return [];
    }

    if (report.scores.length > 0) {
      return report.scores;
    }

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
    if (!report) {
      return [];
    }

    return uniqueValues([
      ...(report.siteSnapshot?.primaryKeywords ?? []),
      ...(report.geo?.signals ?? []),
      ...(report.community?.watchedQueries ?? []),
      ...(report.content?.audiences ?? []),
    ]).slice(0, 12);
  }, [report]);

  const feedItems = useMemo((): FeedItem[] => {
    if (!report) {
      return [];
    }

    const items: FeedItem[] = [];

    report.community?.opportunities.slice(0, 3).forEach((opportunity, index) => {
      items.push({
        id: `community-${index}-${opportunity.title}`,
        title: opportunity.title,
        detail: opportunity.whyItMatters,
        badge: opportunity.channel,
        tone: "medium",
        meta: opportunity.suggestedAngle,
        href: opportunity.url,
      });
    });

    report.seo?.issues.slice(0, 3).forEach((recommendation, index) => {
      items.push({
        id: `seo-${index}-${recommendation.title}`,
        title: recommendation.title,
        detail: recommendation.detail,
        badge: "SEO",
        tone: recommendation.priority,
        meta: recommendation.impact,
      });
    });

    report.geo?.gaps.slice(0, 2).forEach((recommendation, index) => {
      items.push({
        id: `geo-${index}-${recommendation.title}`,
        title: recommendation.title,
        detail: recommendation.detail,
        badge: "GEO",
        tone: recommendation.priority,
        meta: recommendation.impact,
      });
    });

    return items.slice(0, 8);
  }, [report]);

  const latestLogs = useMemo(() => {
    if (!report) {
      return [];
    }

    return [...report.logs].slice(-6).reverse();
  }, [report]);

  if (error) {
    return (
      <section className="report-shell report-console">
        <div className="report-topbar">
          <Link className="back-link" href="/">
            Back
          </Link>
        </div>
        <div className="empty-panel">
          <h1>Report unavailable</h1>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!report) {
    return <LoadingShell />;
  }

  return (
    <section className="report-shell report-console">
      <div className="report-commandbar">
        <div className="report-commandbar-copy">
          <Link className="back-link back-link-subtle" href="/">
            New run
          </Link>
          <div>
            <span className="eyebrow">AI CMO Terminal</span>
            <p className="dashboard-kicker-copy">
              Report for {report.hostname} with live agent status and operator-ready recommendations.
            </p>
          </div>
        </div>
        <div className="report-commandbar-meta">
          <span className={statusClassName(report.status)}>{report.status}</span>
          <span className="command-chip">Updated {formatRunDate(report.updatedAt)}</span>
        </div>
      </div>

      <div className="dashboard-frame">
        <aside className="dashboard-column dashboard-column-profile">
          <section className="dashboard-card dashboard-profile-card">
            <div className="dashboard-card-head">
              <div className="dashboard-monogram" aria-hidden="true">
                {monogram(report.hostname)}
              </div>
              <div>
                <span className="dashboard-card-kicker">Zap dev</span>
                <h1>{report.hostname}</h1>
              </div>
            </div>
            <p className="dashboard-lead">{report.summary}</p>
            <div className="dashboard-pill-row">
              <span className="command-chip">URL crawl complete</span>
              <span className="command-chip">
                {sortedAgents.filter((agent) => agent.status === "completed").length}/{sortedAgents.length} agents done
              </span>
            </div>
            <div className="dashboard-stat-list">
              <div>
                <span>Submitted URL</span>
                <strong>{report.submittedUrl}</strong>
              </div>
              <div>
                <span>Progress</span>
                <strong>{progress}% complete</strong>
              </div>
              <div>
                <span>Brand term</span>
                <strong>{report.siteSnapshot?.brandTerm ?? "Pending"}</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-card-kicker">Documents</p>
                <h2>Site snapshot</h2>
              </div>
              <span className="panel-score">{progress}%</span>
            </div>
            <SnapshotSummary snapshot={report.siteSnapshot} />
          </section>

          <section className="dashboard-card">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-card-kicker">Detected signals</p>
                <h2>Keywords and audience cues</h2>
              </div>
            </div>
            <SignalList
              emptyMessage="Signals will populate here after crawl and strategy extraction."
              signals={dashboardSignals}
            />
          </section>
        </aside>

        <main className="dashboard-column dashboard-column-main">
          <section className="dashboard-card">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-card-kicker">Analytics overview</p>
                <h2>Audit posture</h2>
              </div>
              <div className="dashboard-health-strip">
                <span className="command-chip">Live</span>
                <span className="command-chip">4 surfaces tracked</span>
              </div>
            </div>
            <OverviewGrid scores={overviewScores} />
          </section>

          <section className="dashboard-card">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-card-kicker">Platform status</p>
                <h2>Agent coverage</h2>
              </div>
              <span className="command-chip">{sortedAgents.length} active tracks</span>
            </div>
            <AgentTable agents={sortedAgents} />
          </section>

          <section className="dashboard-card">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-card-kicker">Execution</p>
                <h2>Priority map</h2>
              </div>
            </div>
            <div className="dashboard-split-grid">
              <div>
                <div className="dashboard-mini-head">
                  <h3>Priorities</h3>
                </div>
                <PriorityList priorities={report.brief?.priorities ?? []} />
              </div>
              <div>
                <div className="dashboard-mini-head">
                  <h3>Roadmap</h3>
                </div>
                <RoadmapList roadmap={report.brief?.roadmap ?? []} />
              </div>
            </div>
          </section>
        </main>

        <section className="dashboard-column dashboard-column-feed">
          <section className="dashboard-card">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-card-kicker">AI CMO feed</p>
                <h2>Recommendations</h2>
              </div>
              <span className="command-chip">{feedItems.length} surfaced</span>
            </div>
            <FeedList items={feedItems} />
          </section>

          <section className="dashboard-card">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-card-kicker">Content queue</p>
                <h2>Hooks and ideas</h2>
              </div>
            </div>
            <ContentIdeaList
              hooks={report.content?.hooks ?? []}
              ideas={report.content?.contentIdeas ?? []}
            />
          </section>

          <section className="dashboard-card">
            <div className="dashboard-section-head">
              <div>
                <p className="dashboard-card-kicker">Live console</p>
                <h2>Recent logs</h2>
              </div>
            </div>
            <LogFeed logs={latestLogs} />
          </section>
        </section>

        <aside className="dashboard-column dashboard-column-chat">
          <section className="dashboard-card dashboard-chat-card">
            <div className="dashboard-chat-head">
              <div className="dashboard-chat-avatar">AI</div>
              <div>
                <p className="dashboard-card-kicker">Chat with AI CMO</p>
                <h2>Operator brief</h2>
              </div>
            </div>
            <p className="dashboard-chat-copy">
              {report.brief?.narrative ??
                "The executive brief will appear once the final strategy pass completes."}
            </p>
            <div className="dashboard-chat-callout">
              <span>Priority and likely impact</span>
              <p>
                {report.errorMessage ??
                  "Use the highest-priority recommendations first. The items above are already filtered toward the fastest lift."}
              </p>
            </div>
            <PriorityList priorities={(report.brief?.priorities ?? []).slice(0, 3)} />
            <div className="dashboard-chat-composer" aria-hidden="true">
              <span>Ask me anything...</span>
              <button type="button">Send</button>
            </div>
          </section>
        </aside>
      </div>

      <div className="dashboard-detail-grid">
        <section className="dashboard-card">
          <div className="dashboard-section-head">
            <div>
              <p className="dashboard-card-kicker">SEO + GEO</p>
              <h2>Diagnostics</h2>
            </div>
          </div>
          <p className="section-summary">
            {report.geo?.summary ?? "Detailed SEO and GEO diagnostics will continue to update here."}
          </p>
          <div className="check-stack">
            {report.seo?.checks.map((check) => (
              <div className={checkClassName(check.status)} key={check.id}>
                <strong>{check.label}</strong>
                <p>{check.detail}</p>
              </div>
            )) ?? <p className="empty-state">SEO results will appear here.</p>}
          </div>
          <div className="dashboard-detail-signals">
            <div>
              <div className="dashboard-mini-head">
                <h3>AI visibility signals</h3>
              </div>
              <SignalList
                emptyMessage="No GEO signals captured yet."
                signals={report.geo?.signals ?? []}
              />
            </div>
            <div>
              <div className="dashboard-mini-head">
                <h3>Watched queries</h3>
              </div>
              <SignalList
                emptyMessage="No public search angles were captured yet."
                signals={report.community?.watchedQueries ?? []}
              />
            </div>
          </div>
        </section>

        <section className="dashboard-card">
          <div className="dashboard-section-head">
            <div>
              <p className="dashboard-card-kicker">Messaging map</p>
              <h2>Audience and positioning</h2>
            </div>
          </div>
          <p className="section-summary">
            {report.content?.positioning ?? "Audience positioning will appear after the strategy pass."}
          </p>
          <div className="dashboard-detail-signals">
            <div>
              <div className="dashboard-mini-head">
                <h3>Audiences</h3>
              </div>
              <SignalList
                emptyMessage="No audience segments captured yet."
                signals={report.content?.audiences ?? []}
              />
            </div>
            <div>
              <div className="dashboard-mini-head">
                <h3>Messaging pillars</h3>
              </div>
              <SignalList
                emptyMessage="Messaging pillars will appear here."
                signals={report.content?.messagingPillars ?? []}
              />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
