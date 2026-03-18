"use client"

import type { JSX } from "react"
import { useMemo, useState } from "react"

import type { OrganizationBillingSummary } from "@/lib/billing/store"
import { authClient } from "@/lib/auth-client"

interface BillingPanelProps {
  readonly activeOrganizationId: string
  readonly summary: OrganizationBillingSummary
  readonly polarEnabled: boolean
  readonly canUpgradeToPro: boolean
  readonly canUpgradeToTeam: boolean
}

function formatCycleEnd(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

export function BillingPanel({
  activeOrganizationId,
  summary,
  polarEnabled,
  canUpgradeToPro,
  canUpgradeToTeam,
}: BillingPanelProps): JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const usagePercent = useMemo(() => {
    if (summary.creditsIncluded <= 0) {
      return 0
    }

    return Math.min((summary.creditsUsed / summary.creditsIncluded) * 100, 100)
  }, [summary.creditsIncluded, summary.creditsUsed])

  async function handleCheckout(slug: "pro" | "team"): Promise<void> {
    setError(null)
    setActiveAction(slug)

    try {
      await authClient.checkout({
        slug,
        referenceId: activeOrganizationId,
        metadata: {
          organizationId: activeOrganizationId,
        },
      })
    } catch {
      setError("The checkout could not be opened right now.")
      setActiveAction(null)
    }
  }

  async function handlePortal(): Promise<void> {
    setError(null)
    setActiveAction("portal")

    try {
      await authClient.customer.portal()
    } catch {
      setError("The billing portal is unavailable right now.")
      setActiveAction(null)
    }
  }

  return (
    <section className="workspace-panel billing-panel">
      <div className="workspace-panel-head">
        <div>
          <span className="workspace-label">Workspace billing</span>
          <h2>{summary.planLabel}</h2>
          <p>
            {summary.creditsRemaining} of {summary.creditsIncluded} credits remaining this cycle.
          </p>
        </div>
        <span className={`status-badge ${summary.hasPaidPlan ? "status-running" : "status-queued"}`}>
          {summary.hasPaidPlan ? "Paid plan" : "Free tier"}
        </span>
      </div>

      <div className="workspace-active-card">
        <span className="workspace-label">Credit pool</span>
        <strong>
          {summary.creditsUsed} used / {summary.creditsIncluded} total
        </strong>
        <div aria-hidden="true" className="billing-meter">
          <div className="billing-meter-fill" style={{ width: `${usagePercent}%` }} />
        </div>
        <p>Credits reset on {formatCycleEnd(summary.currentPeriodEnd)}. Every completed audit consumes one credit.</p>
      </div>

      <div className="billing-actions">
        {summary.hasPaidPlan ? (
          <button className="back-link" disabled={!polarEnabled || activeAction === "portal"} onClick={() => void handlePortal()} type="button">
            {activeAction === "portal" ? "Opening portal..." : "Manage subscription"}
          </button>
        ) : canUpgradeToPro ? (
          <button className="back-link" disabled={!polarEnabled || activeAction === "pro"} onClick={() => void handleCheckout("pro")} type="button">
            {activeAction === "pro" ? "Opening checkout..." : "Upgrade to Pro"}
          </button>
        ) : null}

        {!summary.hasPaidPlan && canUpgradeToTeam ? (
          <button className="hero-secondary-link" disabled={!polarEnabled || activeAction === "team"} onClick={() => void handleCheckout("team")} type="button">
            {activeAction === "team" ? "Opening checkout..." : "Talk to Team plan"}
          </button>
        ) : null}
      </div>

      {!polarEnabled ? (
        <p className="auth-muted billing-note">
          Polar env vars are not configured yet, so upgrade and portal actions stay hidden until the org token and product IDs are set.
        </p>
      ) : null}

      {error ? <p className="intake-error">{error}</p> : null}
    </section>
  )
}
