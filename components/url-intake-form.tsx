"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, JSX } from "react";
import { useState } from "react";

export function UrlIntakeForm(): JSX.Element {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = url.trim().length > 0 && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as {
        error?: string;
        reportId?: string;
      };

      if (!response.ok || !payload.reportId) {
        setError(payload.error ?? "The analysis could not be started.");
        return;
      }

      router.push(`/agent/${payload.reportId}`);
    } catch {
      setError("The analysis could not be started.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <label className="intake-label" htmlFor="url">
        Company URL
      </label>
      <div className="intake-row">
        <input
          aria-invalid={Boolean(error)}
          id="url"
          autoComplete="url"
          className="intake-input"
          name="url"
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://your-company.com"
          required
          type="url"
          value={url}
        />
        <button className="intake-button" disabled={!canSubmit} type="submit">
          {isSubmitting ? "Launching agents..." : "Run AI CMO audit"}
        </button>
      </div>
      <div className="intake-meta">
        <span>Public homepage URL</span>
        <span>Report history persists locally</span>
      </div>
      <p className="intake-hint">
        Real homepage crawl, production-style scoring, and a report with SEO, GEO, community, and
        content recommendations.
      </p>
      {error ? (
        <p aria-live="polite" className="intake-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
