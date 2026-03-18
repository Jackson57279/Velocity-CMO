import type { Metadata } from "next"
import type { JSX } from "react"
import { notFound } from "next/navigation"

import { AgentDashboard } from "@/components/agent-dashboard"
import { requireActiveOrganization } from "@/lib/auth/session"
import { getReport } from "@/lib/store/report-store"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Velocity CMO | Dashboard",
  description: "AI CMO dashboard with real-time agent status, scores, and insights.",
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>
}): Promise<JSX.Element> {
  const { reportId } = await params
  const { activeOrganizationId } = await requireActiveOrganization(
    `/sign-in?next=${encodeURIComponent(`/agent/${reportId}`)}`,
  )
  const report = await getReport(reportId, activeOrganizationId)

  if (!report) {
    notFound()
  }

  return <AgentDashboard initialReport={report} reportId={reportId} />
}
