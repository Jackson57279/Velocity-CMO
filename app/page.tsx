import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";

import { UrlIntakeForm } from "@/components/url-intake-form";
import { isExaConfigured } from "@/lib/research/exa";
import { listReports } from "@/lib/store/report-store";
import { isModelConfigured } from "@/lib/utils/model";

const featureRows = [
  {
    label: "Site Crawler",
    detail: "Captures headings, metadata, internal links, and indexable copy from the submitted homepage.",
  },
  {
    label: "SEO Audit",
    detail: "Scores search fundamentals and gives prioritized fixes instead of generic advice.",
  },
  {
    label: "GEO Visibility",
    detail: "Checks whether the offer is legible to AI answer engines and generative search tools.",
  },
  {
    label: "Community Research",
    detail: "Runs fast Exa-backed research across public discussion surfaces, then falls back to direct Reddit and Hacker News lookups.",
  },
];

export const metadata: Metadata = {
  title: "Signal CMO | AI Growth Console",
  description: "Run a persistent AI CMO audit across SEO, AI visibility, community demand, and content strategy.",
};

function formatRunDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function HomePage(): JSX.Element {
  const recentRuns = listReports(5);
  const modelReady = isModelConfigured();
  const researchReady = isExaConfigured();

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="eyebrow">Autonomous Growth Console</div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              A founder-facing AI CMO that audits the site, writes the brief, and leaves a report you can reuse.
            </h1>
            <p className="hero-text">
              Drop in a company URL and the app runs a disk-backed analysis pipeline for SEO,
              AI-search visibility, community demand, and strategy. The output stays available as a
              working report instead of disappearing on refresh.
            </p>
            <UrlIntakeForm />
            <div className="hero-status-strip">
              <div className="hero-status-item">
                <span>Model</span>
                <strong>{modelReady ? "OpenRouter connected" : "Fallback mode active"}</strong>
              </div>
              <div className="hero-status-item">
                <span>Research</span>
                <strong>{researchReady ? "Exa fast search connected" : "Direct-source fallback"}</strong>
              </div>
              <div className="hero-status-item">
                <span>Storage</span>
                <strong>Disk-backed report history</strong>
              </div>
            </div>
          </div>

          <div className="hero-aside">
            <div className="hero-card hero-card-strong">
              <span className="hero-card-label">Command Surface</span>
              <h2>One run, four agents, persistent output.</h2>
              <p>
                The crawler extracts the homepage, the backend stores each report on disk, and the
                strategy layer upgrades from heuristics to structured AI output when your model
                credentials are set.
              </p>
              <div className="metric-cluster metric-cluster-single">
                <div className="metric-card">
                  <span>04</span>
                  <p>Specialized agents coordinated in one backend run.</p>
                </div>
                <div className="metric-card">
                  <span>{modelReady ? "ON" : "OFF"}</span>
                  <p>AI strategy enrichment with deterministic fallback behavior.</p>
                </div>
              </div>
            </div>

            <div className="hero-card recent-runs-panel">
              <div className="panel-head compact-head">
                <h2>Recent Runs</h2>
                <span className={`status-badge ${modelReady ? "status-completed" : "status-queued"}`}>
                  {modelReady ? "AI ready" : "Rules only"}
                </span>
              </div>
              {recentRuns.length > 0 ? (
                <div className="recent-runs-list">
                  {recentRuns.map((report) => (
                    <Link className="recent-run" href={`/agent/${report.id}`} key={report.id}>
                      <div>
                        <strong>{report.hostname}</strong>
                        <p>{report.summary}</p>
                      </div>
                      <div className="recent-run-meta">
                        <span className={`status-badge status-${report.status}`}>{report.status}</span>
                        <small>{formatRunDate(report.updatedAt)}</small>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="empty-state">
                  Your completed audits will show up here once the first run finishes.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="feature-panel">
        <div className="feature-layout">
          <div>
            <div className="section-heading">
              <span className="eyebrow">Agent Stack</span>
              <h2>What the backend now handles in one pass</h2>
            </div>
            <div className="feature-list">
              {featureRows.map((feature) => (
                <article className="feature-row" key={feature.label}>
                  <h3>{feature.label}</h3>
                  <p>{feature.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="ops-rail">
            <article className="feature-row">
              <h3>Persistent reports</h3>
              <p>Runs are written to disk so the terminal view still resolves after refreshes and restarts.</p>
            </article>
            <article className="feature-row">
              <h3>Safe reruns</h3>
              <p>The report endpoint can resume queued or interrupted jobs without duplicating active work.</p>
            </article>
            <article className="feature-row">
              <h3>Structured AI strategy</h3>
              <p>
                OpenRouter can now return positioning, hooks, and an operator brief as typed JSON,
                with deterministic fallbacks when the model is unavailable.
              </p>
            </article>
            <article className="feature-row">
              <h3>Fast research layer</h3>
              <p>
                Exa-backed search now feeds the research agent with fresher public discussion hits
                before falling back to direct source lookups.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
