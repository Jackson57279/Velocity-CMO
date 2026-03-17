import Exa from "exa-js";

import type { CommunityChannel, CommunityOpportunity } from "@/lib/types/report";
import { cleanWhitespace } from "@/lib/utils/text";

const COMMUNITY_DOMAINS = [
  "reddit.com",
  "news.ycombinator.com",
  "github.com",
  "indiehackers.com",
];

function getExaClient(): Exa | null {
  const apiKey = process.env.EXA_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new Exa(apiKey);
}

export function isExaConfigured(): boolean {
  return getExaClient() !== null;
}

function channelFromUrl(url: string): CommunityChannel {
  const hostname = new URL(url).hostname.replace(/^www\./, "");

  if (hostname === "reddit.com" || hostname.endsWith(".reddit.com")) {
    return "Reddit";
  }

  if (hostname === "news.ycombinator.com") {
    return "Hacker News";
  }

  if (hostname === "github.com" || hostname.endsWith(".github.com")) {
    return "GitHub";
  }

  if (hostname === "indiehackers.com" || hostname.endsWith(".indiehackers.com")) {
    return "Indie Hackers";
  }

  return "Web";
}

function buildPrompt(query: string): string {
  if (/(discussion|review|alternatives|comparison|compare)/i.test(query)) {
    return query;
  }

  return `${query} discussion`;
}

function buildWhyItMatters(channel: CommunityChannel, excerpt: string): string {
  if (channel === "Reddit") {
    return "Relevant Reddit threads are already discussing this problem space, which is useful for pain-point discovery and honest positioning.";
  }

  if (channel === "Hacker News") {
    return "Hacker News is surfacing technical discussion around this topic, which is useful for launches, benchmarks, and product narratives.";
  }

  if (channel === "GitHub") {
    return "GitHub discussions and repos can expose implementation friction, ecosystem expectations, and comparison language.";
  }

  if (channel === "Indie Hackers") {
    return "Indie Hackers discussions often reveal founder language, distribution tactics, and buyer objections in plain English.";
  }

  if (excerpt.length > 0) {
    return excerpt;
  }

  return "This result overlaps with the category language and can be mined for positioning, objections, and distribution angles.";
}

function buildSuggestedAngle(channel: CommunityChannel): string {
  if (channel === "Reddit") {
    return "Answer the concrete question first, disclose your affiliation, and only link the product when the thread invites it.";
  }

  if (channel === "Hacker News") {
    return "Lead with a sharp product insight, benchmark, or build story instead of a generic promotion post.";
  }

  if (channel === "GitHub") {
    return "Turn implementation pain points into docs, examples, and comparison pages instead of generic feature messaging.";
  }

  if (channel === "Indie Hackers") {
    return "Use candid founder language and share what changed in the product or funnel rather than posting polished brand copy.";
  }

  return "Pull recurring phrases, objections, and proof points from this source into your landing page and content strategy.";
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

export async function searchFastCommunityResearch(
  queries: string[],
): Promise<CommunityOpportunity[]> {
  const exa = getExaClient();

  if (!exa) {
    return [];
  }

  const results = await Promise.allSettled(
    queries.map((query) =>
      exa.searchAndContents(buildPrompt(query), {
        includeDomains: COMMUNITY_DOMAINS,
        numResults: 3,
        text: { maxCharacters: 700 },
        useAutoprompt: true,
      }),
    ),
  );

  const opportunities = results.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    return result.value.results
      .filter((entry) => Boolean(entry.title))
      .map((entry) => {
        const excerpt = cleanWhitespace(typeof entry.text === "string" ? entry.text : "").slice(0, 240);
        const channel = channelFromUrl(entry.url);

        return {
          channel,
          query: queries[index] ?? "",
          title: entry.title ?? entry.url,
          url: entry.url,
          whyItMatters: buildWhyItMatters(channel, excerpt),
          suggestedAngle: buildSuggestedAngle(channel),
        } satisfies CommunityOpportunity;
      });
  });

  return dedupeOpportunities(opportunities).slice(0, 10);
}
