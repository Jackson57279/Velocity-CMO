import type { Metadata } from "next"
import type { JSX } from "react"
import Link from "next/link"

import { UrlIntakeForm } from "@/components/url-intake-form"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { getActiveOrganizationId, getSession } from "@/lib/auth/session"
import { isExaConfigured } from "@/lib/research/exa"
import { listReports } from "@/lib/store/report-store"
import { isModelConfigured } from "@/lib/utils/model"

export const dynamic = "force-dynamic"

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
]

export const metadata: Metadata = {
  title: "Signal CMO | AI Growth Console",
  description: "Run a persistent AI CMO audit across SEO, AI visibility, community demand, and content strategy.",
}

function formatRunDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export default async function HomePage(): Promise<JSX.Element> {
  const session = await getSession()
  const activeOrganizationId = session ? getActiveOrganizationId(session) : null
  const recentRuns = activeOrganizationId ? await listReports(activeOrganizationId, 5) : []
  const modelReady = isModelConfigured()
  const researchReady = isExaConfigured()

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="eyebrow">Autonomous Growth Console</div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              {session
                ? "Run audits inside a shared workspace with durable report history."
                : "A founder-facing AI CMO with real accounts, workspaces, and persistent reports."}
            </h1>
            <p className="hero-text">
              {session
                ? "Every run now lands in a Better Auth workspace backed by Neon Postgres, so your SEO, GEO, community, and strategy reports survive refreshes, Railway deploys, and team handoffs."
                : "Sign in to launch the AI CMO inside a team workspace. The stack now uses Better Auth, organizations, and Neon-backed persistence instead of local JSON files."}
            </p>

            {session ? (
              activeOrganizationId ? (
                <UrlIntakeForm />
              ) : (
                <p className="intake-hint">
                  Create or select a workspace first, then the URL intake will unlock automatically.
                </p>
              )
            ) : (
              <div className="hero-action-row">
                <Link className="back-link" href="/sign-up">
                  Create account
                </Link>
                <Link className="hero-secondary-link" href="/sign-in">
                  Sign in
                </Link>
              </div>
            )}

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
                <strong>{session ? "Neon workspace persistence" : "Sign in to unlock persistence"}</strong>
              </div>
            </div>
          </div>

          <div className="hero-aside">
            {session ? (
              <WorkspaceSwitcher userEmail={session.user.email} userName={session.user.name} />
            ) : (
              <div className="hero-card hero-card-strong">
                <span className="hero-card-label">Command Surface</span>
                <h2>One run, four agents, shared workspace memory.</h2>
                <p>
                  The crawler extracts the homepage, Better Auth manages accounts and organizations,
                  and Neon stores the report so your team can reopen it later on Railway.
                </p>
                <div className="metric-cluster metric-cluster-single">
                  <div className="metric-card">
                    <span>04</span>
                    <p>Specialized agents coordinated in one backend run.</p>
                  </div>
                  <div className="metric-card">
                    <span>DB</span>
                    <p>Workspace-scoped report history with authenticated access control.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="hero-card recent-runs-panel">
              <div className="panel-head compact-head">
                <h2>Recent Runs</h2>
                <span className={`status-badge ${modelReady ? "status-completed" : "status-queued"}`}>
                  {session ? "Workspace feed" : "Sign-in required"}
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
                  {session
                    ? activeOrganizationId
                      ? "This workspace has no completed audits yet."
                      : "Select a workspace to see recent runs."
                    : "Sign in to see workspace reports and persistent run history."}
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
              <h3>Workspace persistence</h3>
              <p>Reports now live in Neon Postgres and stay scoped to the active Better Auth organization.</p>
            </article>
            <article className="feature-row">
              <h3>Safer reruns</h3>
              <p>Database-backed job claims prevent duplicate runs when Railway restarts or multiple requests race.</p>
            </article>
            <article className="feature-row">
              <h3>Structured AI strategy</h3>
              <p>
                OpenRouter returns positioning, hooks, and an operator brief as typed JSON with deterministic fallbacks.
              </p>
            </article>
            <article className="feature-row">
              <h3>Railway-ready auth stack</h3>
              <p>
                Better Auth now supports Google OAuth, email/password, and shared workspaces without Redis.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  )
}
