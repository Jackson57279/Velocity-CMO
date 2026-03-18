import type { Metadata } from "next"
import type { JSX } from "react"
import { notFound } from "next/navigation"

import { ReportClient } from "@/components/report-client"
import { requireActiveOrganization } from "@/lib/auth/session"
import { getReport } from "@/lib/store/report-store"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Velocity CMO | Report",
  description: "Review the AI CMO report, agent logs, scorecards, and roadmap.",
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

  return <ReportClient initialReport={report} reportId={reportId} />
}
