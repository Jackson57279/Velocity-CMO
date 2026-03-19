import type { Metadata } from "next"
import type { JSX } from "react"
import Link from "next/link"

import { BillingPanel } from "@/components/billing-panel"
import { UrlIntakeForm } from "@/components/url-intake-form"
import { getPolarCheckoutProducts } from "@/lib/billing/config"
import { getPolarClient } from "@/lib/billing/polar"
import { getOrganizationBillingSummary } from "@/lib/billing/store"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { getActiveOrganizationId, getSession } from "@/lib/auth/session"
import { isExaConfigured } from "@/lib/research/exa"
import { listReports } from "@/lib/store/report-store"
import { isModelConfigured } from "@/lib/utils/model"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Velocity CMO | AI Growth Console",
  description: "Run a persistent AI CMO audit across SEO, AI visibility, community demand, and content strategy.",
}

function formatRunDate(value: string): string {
  const date = new Date(value)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function getScoreColorClass(score: number): string {
  if (score >= 90) return "success"
  if (score >= 70) return "warning"
  return "danger"
}

export default async function HomePage(): Promise<JSX.Element> {
  const session = await getSession()
  const activeOrganizationId = session ? getActiveOrganizationId(session) : null
  const recentRuns = activeOrganizationId ? await listReports(activeOrganizationId, 10) : []
  const billingSummary = activeOrganizationId
    ? await getOrganizationBillingSummary(activeOrganizationId)
    : null
  const polarEnabled = Boolean(getPolarClient())
  const checkoutSlugs = new Set(getPolarCheckoutProducts().map((product) => product.slug))
  const modelReady = isModelConfigured()
  const researchReady = isExaConfigured()

  if (!session) {
    return (
      <div className="vercel-layout" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="vercel-card" style={{ padding: "40px", maxWidth: "500px", textAlign: "center" }}>
          <div className="vercel-sidebar-logo" style={{ width: "48px", height: "48px", margin: "0 auto 24px", fontSize: "24px" }}>V</div>
          <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>Velocity CMO</h1>
          <p style={{ color: "#888", marginBottom: "32px", lineHeight: "1.6" }}>
            A founder-facing AI CMO with real accounts, workspaces, and persistent reports.
            Sign in to launch the AI CMO inside a team workspace.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <Link href="/sign-up" className="vercel-button vercel-button-primary">
              Create account
            </Link>
            <Link href="/sign-in" className="vercel-button vercel-button-secondary">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="vercel-layout">
      {/* Sidebar */}
      <aside className="vercel-sidebar">
        <div className="vercel-sidebar-header">
          <div className="vercel-sidebar-logo">V</div>
          <span className="vercel-sidebar-title">Velocity CMO</span>
        </div>
        
        <div className="vercel-sidebar-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          Search...
        </div>

        <nav className="vercel-sidebar-nav">
          <Link href="/" className="vercel-nav-item active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Audits
          </Link>
          <Link href="#" className="vercel-nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Agents
          </Link>
          <Link href="#" className="vercel-nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Analytics
          </Link>
          <Link href="#" className="vercel-nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings
          </Link>
        </nav>

        <div className="vercel-sidebar-footer">
          <div className="vercel-user-profile">
            <div className="vercel-avatar"></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "13px", fontWeight: "500", color: "#fff" }}>{session.user.name || "User"}</span>
              <span style={{ fontSize: "11px", color: "#888" }}>{session.user.email}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="vercel-main">
        <header className="vercel-topbar">
          <div className="vercel-breadcrumbs">
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="vercel-avatar" style={{ width: "20px", height: "20px" }}></div>
              {session.user.name}&apos;s Workspace
            </span>
            <span style={{ margin: "0 8px", color: "#333" }}>/</span>
            <strong>Overview</strong>
          </div>
          <div className="vercel-topbar-actions">
            <input type="text" className="vercel-search-bar" placeholder="Search Audits..." />
            <button className="vercel-button vercel-button-primary">Add New...</button>
          </div>
        </header>

        <div className="vercel-content">
          {/* Left Column */}
          <div className="vercel-left-col">
            <div>
              <h2 className="vercel-section-title">
                Usage
                <span style={{ color: "#888", fontSize: "12px", fontWeight: "normal" }}>Last 30 days</span>
              </h2>
              <div className="vercel-card">
                <div className="vercel-usage-list">
                  <div className="vercel-usage-item">
                    <div className="vercel-usage-label">
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0070f3" }}></div>
                      Audits Run
                    </div>
                    <div className="vercel-usage-value">{billingSummary?.creditsUsed || 0} / {billingSummary?.creditsIncluded || 3}</div>
                  </div>
                  <div className="vercel-usage-item">
                    <div className="vercel-usage-label">
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></div>
                      Plan
                    </div>
                    <div className="vercel-usage-value">{billingSummary?.planLabel || "Free"}</div>
                  </div>
                  <div className="vercel-usage-item">
                    <div className="vercel-usage-label">
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8b5cf6" }}></div>
                      Model Status
                    </div>
                    <div className="vercel-usage-value">{modelReady ? "Connected" : "Fallback"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="vercel-section-title">Workspace</h2>
              <WorkspaceSwitcher userEmail={session.user.email} userName={session.user.name} />
            </div>
            
            {activeOrganizationId && billingSummary && (
              <BillingPanel
                activeOrganizationId={activeOrganizationId}
                canUpgradeToPro={checkoutSlugs.has("pro")}
                canUpgradeToTeam={checkoutSlugs.has("team")}
                polarEnabled={polarEnabled}
                summary={billingSummary}
              />
            )}
          </div>

          {/* Right Column */}
          <div className="vercel-right-col">
            {activeOrganizationId ? (
              <div className="vercel-card" style={{ padding: "20px", marginBottom: "8px" }}>
                <UrlIntakeForm />
              </div>
            ) : (
              <div className="vercel-card" style={{ padding: "20px", marginBottom: "8px" }}>
                <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
                  Create or select a workspace first, then the URL intake will unlock automatically.
                </p>
              </div>
            )}

            <div className="vercel-projects-grid">
              {recentRuns.length > 0 ? (
                recentRuns.map((report) => {
                  // Find SEO score if available, otherwise calculate average or show pending
                  const seoScore = report.scores?.find(s => s.id === "seo")?.score
                  const avgScore = report.scores?.length 
                    ? Math.round(report.scores.reduce((acc, s) => acc + s.score, 0) / report.scores.length)
                    : null
                  
                  const displayScore = seoScore ?? avgScore
                  const scoreClass = displayScore !== null ? getScoreColorClass(displayScore) : "queued"

                  return (
                    <Link href={`/agent/${report.id}`} key={report.id} className="vercel-project-card">
                      <div className="vercel-project-header">
                        <div className="vercel-project-info">
                          <div className="vercel-project-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                          </div>
                          <div>
                            <h3 className="vercel-project-name">{report.hostname}</h3>
                            <div className="vercel-project-url">{report.submittedUrl}</div>
                          </div>
                        </div>
                        <div className={`vercel-project-score ${scoreClass}`}>
                          {displayScore !== null ? displayScore : "..."}
                        </div>
                      </div>
                      
                      <div className="vercel-project-meta">
                        <div className="vercel-project-branch">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>
                          <span className="vercel-project-commit">{report.status === "completed" ? "Audit Complete" : report.status}</span>
                        </div>
                        <div className="vercel-project-time">
                          {formatRunDate(report.updatedAt)} on <span style={{ color: "#fff" }}>main</span>
                        </div>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="vercel-card" style={{ padding: "40px", textAlign: "center", gridColumn: "1 / -1" }}>
                  <p style={{ color: "#888", margin: 0 }}>
                    {activeOrganizationId
                      ? "This workspace has no completed audits yet. Run your first audit above."
                      : "Select a workspace to see recent runs."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
