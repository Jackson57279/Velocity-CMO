export type JobStatus = "queued" | "running" | "completed" | "failed";
export type AgentStatus = "pending" | "running" | "completed" | "failed";
export type LogLevel = "info" | "success" | "warning" | "error";
export type RecommendationPriority = "high" | "medium" | "low";
export type CheckStatus = "pass" | "warn" | "fail";
export type CommunityChannel = "Reddit" | "Hacker News" | "GitHub" | "Indie Hackers" | "Web";

export interface AgentDescriptor {
  id: string;
  name: string;
  status: AgentStatus;
  summary?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentLogEntry {
  id: string;
  agentId: string;
  level: LogLevel;
  message: string;
  timestamp: string;
}

export interface SiteSnapshot {
  sourceUrl: string;
  finalUrl: string;
  hostname: string;
  brandTerm: string;
  title: string;
  metaDescription: string;
  canonicalUrl?: string;
  robots?: string;
  language?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  textContent: string;
  wordCount: number;
  primaryKeywords: string[];
  hasOpenGraph: boolean;
  structuredDataCount: number;
  imagesTotal: number;
  imagesWithoutAlt: number;
  internalLinkCount: number;
  externalLinkCount: number;
  externalDomains: string[];
}

export interface Recommendation {
  title: string;
  detail: string;
  priority: RecommendationPriority;
  owner: string;
  impact: string;
}

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface SEOAuditReport {
  score: number;
  strengths: string[];
  checks: CheckResult[];
  issues: Recommendation[];
}

export interface GeoVisibilityReport {
  score: number;
  summary: string;
  strengths: string[];
  signals: string[];
  gaps: Recommendation[];
}

export interface CommunityOpportunity {
  channel: CommunityChannel;
  query: string;
  title: string;
  url?: string;
  whyItMatters: string;
  suggestedAngle: string;
}

export interface CommunityResearchReport {
  score: number;
  summary: string;
  watchedQueries: string[];
  opportunities: CommunityOpportunity[];
  recommendations: Recommendation[];
}

export interface ContentIdea {
  channel: string;
  title: string;
  angle: string;
  reason: string;
}

export interface ContentStrategyReport {
  score: number;
  positioning: string;
  audiences: string[];
  messagingPillars: string[];
  hooks: string[];
  contentIdeas: ContentIdea[];
}

export type RoadmapHorizon = "now" | "next" | "later";

export interface StrategicInsight {
  title: string;
  detail: string;
}

export interface ExecutionStep {
  horizon: RoadmapHorizon;
  title: string;
  detail: string;
  owner: string;
}

export interface ExecutiveBrief {
  narrative: string;
  priorities: StrategicInsight[];
  roadmap: ExecutionStep[];
}

export interface ScoreCard {
  id: string;
  label: string;
  score: number;
  summary: string;
}

export interface MarketingReport {
  id: string;
  submittedUrl: string;
  normalizedUrl: string;
  hostname: string;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;
  summary: string;
  agents: AgentDescriptor[];
  logs: AgentLogEntry[];
  scores: ScoreCard[];
  siteSnapshot?: SiteSnapshot;
  seo?: SEOAuditReport;
  geo?: GeoVisibilityReport;
  community?: CommunityResearchReport;
  content?: ContentStrategyReport;
  brief?: ExecutiveBrief;
  errorMessage?: string;
}

export const reportAgentBlueprint: AgentDescriptor[] = [
  { id: "siteCrawlerAgent", name: "Site Crawler", status: "pending" },
  { id: "seoAuditAgent", name: "SEO Audit", status: "pending" },
  { id: "geoVisibilityAgent", name: "GEO Visibility", status: "pending" },
  { id: "communityResearchAgent", name: "Community Research", status: "pending" },
  { id: "contentStrategyAgent", name: "Content Strategy", status: "pending" },
];
