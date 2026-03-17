import type {
  CommunityOpportunity,
  CommunityResearchReport,
  Recommendation,
  SiteSnapshot,
} from "@/lib/types/report";
import { isExaConfigured, searchFastCommunityResearch } from "@/lib/research/exa";
import { clampNumber, titleCase, uniqueStrings } from "@/lib/utils/text";

interface HNSearchHit {
  objectID: string;
  title: string;
  url: string | null;
}

interface RedditListingChild {
  data: {
    title: string;
    permalink: string;
    subreddit_name_prefixed?: string;
  };
}

async function searchHackerNews(query: string): Promise<CommunityOpportunity[]> {
  const response = await fetch(
    `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=3&query=${encodeURIComponent(query)}`,
    {
      signal: AbortSignal.timeout(7000),
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { hits?: HNSearchHit[] };
  const hits = payload.hits ?? [];

  return hits
    .filter((hit) => Boolean(hit.title))
    .map((hit) => ({
      channel: "Hacker News" as const,
      query,
      title: hit.title,
      url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
      whyItMatters: "This topic already surfaces on Hacker News, which is useful for technical distribution and product launches.",
      suggestedAngle:
        "Lead with a sharp product insight, benchmark, or build story instead of a generic promotion post.",
    }));
}

async function searchReddit(query: string): Promise<CommunityOpportunity[]> {
  const response = await fetch(
    `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=3&sort=relevance&t=year`,
    {
      headers: {
        "User-Agent": "ai-cmo-app/0.1 (+https://localhost)",
      },
      signal: AbortSignal.timeout(7000),
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    data?: {
      children?: RedditListingChild[];
    };
  };
  const children = payload.data?.children ?? [];

  return children.map((child) => ({
    channel: "Reddit" as const,
    query,
    title: child.data.title,
    url: child.data.permalink ? `https://www.reddit.com${child.data.permalink}` : undefined,
    whyItMatters: `${
      child.data.subreddit_name_prefixed ?? "A relevant subreddit"
    } is already discussing the problem space around this query.`,
    suggestedAngle:
      "Answer the concrete question first, disclose your affiliation, and only link the product when the thread invites it.",
  }));
}

function recommendation(title: string, detail: string, impact: string): Recommendation {
  return {
    title,
    detail,
    impact,
    owner: "Growth",
    priority: "medium",
  };
}

function buildQueries(site: SiteSnapshot): string[] {
  const keywordPhrase = site.primaryKeywords.slice(0, 2).join(" ");

  return uniqueStrings(
    [
      site.brandTerm,
      keywordPhrase,
      `${keywordPhrase} alternatives`,
      `${titleCase(site.brandTerm)} review`,
    ].filter((value) => value.trim().length >= 3),
  ).slice(0, 4);
}

function dedupeOpportunities(opportunities: CommunityOpportunity[]): CommunityOpportunity[] {
  const seen = new Set<string>();

  return opportunities.filter((opportunity) => {
    const key = opportunity.url ?? `${opportunity.channel}:${opportunity.title}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function runCommunityResearchAgent(
  site: SiteSnapshot,
): Promise<CommunityResearchReport> {
  const watchedQueries = buildQueries(site);
  const exaOpportunities = await searchFastCommunityResearch(watchedQueries);
  const fallbackResults =
    exaOpportunities.length >= 4
      ? []
      : await Promise.allSettled(
          watchedQueries.flatMap((query) => [searchReddit(query), searchHackerNews(query)]),
        );
  const fallbackOpportunities = fallbackResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const opportunities = dedupeOpportunities([...exaOpportunities, ...fallbackOpportunities]);
  const score = clampNumber(38 + opportunities.length * 7 + (exaOpportunities.length > 0 ? 10 : 0), 25, 94);
  const recommendations: Recommendation[] = [
    recommendation(
      "Create founder-level response templates",
      "Prepare short, honest replies for community questions so the team can respond consistently without sounding automated.",
      "Makes community participation repeatable without turning it into spam.",
    ),
    recommendation(
      "Track proof-bearing threads",
      "Log threads that mention pain points, alternatives, or budgets and feed those phrases back into landing page and content copy.",
      "Turns community language into sharper positioning and demand capture.",
    ),
  ];

  if (exaOpportunities.length > 0) {
    recommendations.unshift(
      recommendation(
        "Use Exa to refresh live research weekly",
        "Re-run the fast research sweep each week and feed the strongest new threads, repos, and comparisons back into copy and content planning.",
        "Keeps positioning tied to current language instead of stale assumptions.",
      ),
    );
  }

  if (opportunities.length === 0) {
    recommendations.unshift(
      recommendation(
        "Seed your first distribution loops manually",
        "Start with 10-15 manual comments in relevant communities and turn the best-performing themes into repeatable playbooks.",
        "Creates the initial signal set this agent can learn from later.",
      ),
    );
  }

  const summary =
    opportunities.length > 0
      ? exaOpportunities.length > 0
        ? `Found ${opportunities.length} fast research hits across Exa-backed web search and public community sources that overlap with the site's category language.`
        : `Found ${opportunities.length} community touchpoints across Reddit and Hacker News that overlap with the site's category language.`
      : isExaConfigured()
        ? "Fast Exa research did not surface strong public discussion patterns on the first pass, so the next best move is to test a small set of manual posts and compare language from live search later."
      : "No strong public community hits were detected from the first pass, so the next best move is to test a small set of high-context manual posts.";

  return {
    score,
    summary,
    watchedQueries,
    opportunities: opportunities.slice(0, 10),
    recommendations,
  };
}
