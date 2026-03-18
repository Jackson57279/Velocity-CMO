import { z } from "zod"

import { startMarketingAnalysis } from "@/lib/agents/orchestrator"
import { auth } from "@/lib/auth"
import { getOrganizationBillingSummary } from "@/lib/billing/store"
import { createReport } from "@/lib/store/report-store"
import { hostnameFromUrl, normalizeSubmittedUrl } from "@/lib/utils/url"

export const runtime = "nodejs"

const requestSchema = z.object({
  url: z.string().min(3),
})

function formatCycleResetDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return Response.json({ error: "Sign in to start an analysis." }, { status: 401 })
  }

  const activeOrganizationId = session.session.activeOrganizationId

  if (!activeOrganizationId) {
    return Response.json({ error: "Create or select a workspace before starting an analysis." }, { status: 400 })
  }

  const billingSummary = await getOrganizationBillingSummary(activeOrganizationId)

  if (billingSummary.creditsRemaining <= 0) {
    return Response.json(
      {
        error: `${billingSummary.planLabel} has no credits left right now. Credits reset on ${formatCycleResetDate(billingSummary.currentPeriodEnd)}.`,
        planKey: billingSummary.planKey,
        creditsRemaining: billingSummary.creditsRemaining,
      },
      { status: 402 },
    )
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return Response.json(
      { error: "Submit a valid website URL to start the analysis." },
      { status: 400 },
    )
  }

  try {
    const normalizedUrl = normalizeSubmittedUrl(parsed.data.url)
    const report = await createReport({
      submittedUrl: parsed.data.url,
      normalizedUrl,
      hostname: hostnameFromUrl(normalizedUrl),
      organizationId: activeOrganizationId,
      createdByUserId: session.user.id,
    })

    startMarketingAnalysis(report.id)

    return Response.json({
      reportId: report.id,
      status: report.status,
    })
  } catch {
    return Response.json(
      { error: "The URL could not be parsed. Try a full website address like https://example.com." },
      { status: 400 },
    )
  }
}
