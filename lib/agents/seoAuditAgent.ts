import type { CheckResult, Recommendation, SEOAuditReport, SiteSnapshot } from "@/lib/types/report";
import { clampNumber } from "@/lib/utils/text";

function addIssue(
  issues: Recommendation[],
  title: string,
  detail: string,
  priority: Recommendation["priority"],
  impact: string,
): void {
  issues.push({
    title,
    detail,
    priority,
    impact,
    owner: "Website",
  });
}

export async function runSeoAuditAgent(site: SiteSnapshot): Promise<SEOAuditReport> {
  const checks: CheckResult[] = [];
  const strengths: string[] = [];
  const issues: Recommendation[] = [];
  let score = 100;

  const titleLength = site.title.length;
  if (titleLength >= 30 && titleLength <= 60) {
    checks.push({
      id: "title-length",
      label: "Title length",
      status: "pass",
      detail: `The page title is ${titleLength} characters long and likely to render well in search.`,
    });
    strengths.push("Title length is in a healthy search snippet range.");
  } else {
    const status = titleLength === 0 ? "fail" : "warn";
    score -= status === "fail" ? 16 : 8;
    checks.push({
      id: "title-length",
      label: "Title length",
      status,
      detail:
        titleLength === 0
          ? "The page is missing a title tag."
          : `The page title is ${titleLength} characters long, which is outside the ideal search range.`,
    });
    addIssue(
      issues,
      "Tighten the title tag",
      titleLength === 0
        ? "Add a primary title tag that states the brand, category, and outcome."
        : "Rewrite the title so it lands between 30 and 60 characters while keeping the category clear.",
      "high",
      "Improves search visibility and click-through rate.",
    );
  }

  const descriptionLength = site.metaDescription.length;
  if (descriptionLength >= 80 && descriptionLength <= 170) {
    checks.push({
      id: "meta-description",
      label: "Meta description",
      status: "pass",
      detail: "The page has a descriptive meta description in a usable length range.",
    });
    strengths.push("Meta description is present and gives search engines context.");
  } else {
    const status = descriptionLength === 0 ? "fail" : "warn";
    score -= status === "fail" ? 14 : 6;
    checks.push({
      id: "meta-description",
      label: "Meta description",
      status,
      detail:
        descriptionLength === 0
          ? "No meta description was detected."
          : `The meta description is ${descriptionLength} characters long and could be refined.`,
    });
    addIssue(
      issues,
      "Improve the meta description",
      "Write a concise summary that names the audience, problem, and main outcome in one sentence.",
      "high",
      "Makes the page easier to understand in search results.",
    );
  }

  if (site.headings.h1.length === 1) {
    checks.push({
      id: "h1",
      label: "Primary H1 heading",
      status: "pass",
      detail: "The page has a single H1, which gives crawlers a clear content anchor.",
    });
    strengths.push("One primary H1 creates a clean content hierarchy.");
  } else {
    const status = site.headings.h1.length === 0 ? "fail" : "warn";
    score -= status === "fail" ? 12 : 6;
    checks.push({
      id: "h1",
      label: "Primary H1 heading",
      status,
      detail:
        site.headings.h1.length === 0
          ? "No H1 heading was found on the page."
          : `The page has ${site.headings.h1.length} H1 headings, which can dilute the primary topic.`,
    });
    addIssue(
      issues,
      "Clarify the page hierarchy",
      "Use one H1 that states the core offer, then move supporting statements to H2/H3 headings.",
      "high",
      "Helps both crawlers and visitors understand the main topic faster.",
    );
  }

  if (site.canonicalUrl) {
    checks.push({
      id: "canonical",
      label: "Canonical URL",
      status: "pass",
      detail: `Canonical tag detected: ${site.canonicalUrl}.`,
    });
    strengths.push("Canonical URL is set, which reduces duplicate indexing risk.");
  } else {
    score -= 6;
    checks.push({
      id: "canonical",
      label: "Canonical URL",
      status: "warn",
      detail: "No canonical tag was detected on the page.",
    });
    addIssue(
      issues,
      "Add a canonical URL",
      "Set a canonical tag on core landing pages so search engines consolidate authority to one preferred URL.",
      "medium",
      "Reduces duplicate indexing and improves crawl consistency.",
    );
  }

  if (site.robots?.toLowerCase().includes("noindex")) {
    score -= 20;
    checks.push({
      id: "robots",
      label: "Indexability",
      status: "fail",
      detail: `Robots meta contains "${site.robots}", which may block indexing.`,
    });
    addIssue(
      issues,
      "Fix indexing directives",
      "Remove noindex from pages that should rank and verify staging directives are not leaking to production.",
      "high",
      "Prevents hidden pages from disappearing from search.",
    );
  } else {
    checks.push({
      id: "robots",
      label: "Indexability",
      status: "pass",
      detail: "No blocking robots directive was detected in the page metadata.",
    });
    strengths.push("No obvious meta-level indexability blockers were detected.");
  }

  if (site.wordCount >= 250) {
    checks.push({
      id: "copy-depth",
      label: "Indexable copy depth",
      status: "pass",
      detail: `The page exposes about ${site.wordCount} words of crawlable text.`,
    });
    strengths.push("The page has enough text to explain the offer to search engines.");
  } else {
    score -= 10;
    checks.push({
      id: "copy-depth",
      label: "Indexable copy depth",
      status: "warn",
      detail: `Only about ${site.wordCount} words of crawlable text were detected.`,
    });
    addIssue(
      issues,
      "Add more indexable copy",
      "Expand the page with benefit-driven copy, proof points, use cases, and FAQs around the core topic.",
      "medium",
      "Gives the page more semantic coverage for search queries.",
    );
  }

  if (site.structuredDataCount > 0) {
    checks.push({
      id: "structured-data",
      label: "Structured data",
      status: "pass",
      detail: `Detected ${site.structuredDataCount} structured data block(s).`,
    });
    strengths.push("Structured data is present, which improves machine readability.");
  } else {
    score -= 6;
    checks.push({
      id: "structured-data",
      label: "Structured data",
      status: "warn",
      detail: "No JSON-LD structured data block was detected.",
    });
    addIssue(
      issues,
      "Add structured data",
      "Ship Organization, Product, FAQ, or Article schema where relevant so search engines understand the page context faster.",
      "medium",
      "Improves eligibility for rich results and machine parsing.",
    );
  }

  if (site.imagesWithoutAlt === 0) {
    checks.push({
      id: "image-alt",
      label: "Image alt text",
      status: "pass",
      detail: "No missing image alt text was detected.",
    });
    strengths.push("Images appear to include alt text, which supports accessibility and image search.");
  } else {
    score -= Math.min(site.imagesWithoutAlt * 2, 8);
    checks.push({
      id: "image-alt",
      label: "Image alt text",
      status: "warn",
      detail: `${site.imagesWithoutAlt} image(s) are missing alt text.`,
    });
    addIssue(
      issues,
      "Backfill image alt text",
      "Add concise alt text to product visuals, logos, and UI screenshots that matter for accessibility and topical relevance.",
      "low",
      "Improves accessibility and gives search engines more context for media assets.",
    );
  }

  if (site.internalLinkCount >= 5) {
    checks.push({
      id: "internal-links",
      label: "Internal linking",
      status: "pass",
      detail: `Detected ${site.internalLinkCount} internal links, which helps crawl paths.`,
    });
    strengths.push("Internal linking is present, which helps discovery and navigation.");
  } else {
    score -= 6;
    checks.push({
      id: "internal-links",
      label: "Internal linking",
      status: "warn",
      detail: `Only ${site.internalLinkCount} internal link(s) were detected.`,
    });
    addIssue(
      issues,
      "Improve internal linking",
      "Link out to pricing, docs, use cases, comparison pages, and FAQs from the main landing page.",
      "medium",
      "Strengthens crawl depth and distributes page authority.",
    );
  }

  return {
    score: clampNumber(Math.round(score), 0, 100),
    strengths,
    checks,
    issues,
  };
}
