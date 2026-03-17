import { startMarketingAnalysis } from "@/lib/agents/orchestrator"
import { auth } from "@/lib/auth"
import { getReport } from "@/lib/store/report-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
): Promise<Response> {
  const session = await auth.api.getSession({
    headers: _request.headers,
  })

  if (!session) {
    return Response.json({ error: "Sign in to view this report." }, { status: 401 })
  }

  const activeOrganizationId = session.session.activeOrganizationId

  if (!activeOrganizationId) {
    return Response.json({ error: "Select a workspace to view reports." }, { status: 400 })
  }

  const { reportId } = await context.params
  const report = await getReport(reportId, activeOrganizationId)

  if (!report) {
    return Response.json({ error: "Report not found." }, { status: 404 })
  }

  if (report.status === "queued" || report.status === "running") {
    startMarketingAnalysis(reportId)
  }

  return Response.json(
    { report },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
