import { z } from "zod";

import { startMarketingAnalysis } from "@/lib/agents/orchestrator";
import { createReport } from "@/lib/store/report-store";
import { hostnameFromUrl, normalizeSubmittedUrl } from "@/lib/utils/url";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().min(3),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json(
      { error: "Submit a valid website URL to start the analysis." },
      { status: 400 },
    );
  }

  try {
    const normalizedUrl = normalizeSubmittedUrl(parsed.data.url);
    const report = createReport(parsed.data.url, normalizedUrl, hostnameFromUrl(normalizedUrl));

    startMarketingAnalysis(report.id);

    return Response.json({
      reportId: report.id,
      status: report.status,
    });
  } catch {
    return Response.json(
      { error: "The URL could not be parsed. Try a full website address like https://example.com." },
      { status: 400 },
    );
  }
}
