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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>New Audit</h3>
        <span style={{ fontSize: "12px", color: "#888" }}>Runs in active workspace</span>
      </div>
      
      <div style={{ display: "flex", gap: "12px" }}>
        <input
          aria-invalid={Boolean(error)}
          id="url"
          autoComplete="url"
          name="url"
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://your-company.com"
          required
          type="url"
          value={url}
          style={{
            flex: 1,
            background: "#000",
            border: "1px solid #333",
            borderRadius: "6px",
            padding: "10px 16px",
            color: "#fff",
            fontSize: "14px",
            outline: "none",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#fff"}
          onBlur={(e) => e.target.style.borderColor = "#333"}
        />
        <button 
          disabled={!canSubmit} 
          type="submit"
          className="vercel-button vercel-button-primary"
          style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
        >
          {isSubmitting ? "Launching..." : "Run Audit"}
        </button>
      </div>
      
      {error ? (
        <p aria-live="polite" style={{ margin: 0, color: "#ef4444", fontSize: "13px" }}>
          {error}
        </p>
      ) : (
        <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>
          Crawls homepage, scores SEO/GEO, and generates content strategy.
        </p>
      )}
    </form>
  );
}
