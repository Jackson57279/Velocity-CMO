import type { Metadata } from "next";
import type { JSX } from "react";

import { ReportClient } from "@/components/report-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Signal CMO | Report",
  description: "Review the AI CMO report, agent logs, scorecards, and roadmap.",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}): Promise<JSX.Element> {
  const { reportId } = await params;

  return <ReportClient reportId={reportId} />;
}
