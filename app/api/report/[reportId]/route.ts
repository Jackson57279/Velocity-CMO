import { startMarketingAnalysis } from "@/lib/agents/orchestrator";
import { getReport } from "@/lib/store/report-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
): Promise<Response> {
  const { reportId } = await context.params;
  const report = getReport(reportId);

  if (!report) {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  if (report.status === "queued" || report.status === "running") {
    startMarketingAnalysis(reportId);
  }

  return Response.json(
    { report },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
