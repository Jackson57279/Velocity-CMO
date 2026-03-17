# AI CMO App — Agent Guidelines

Agentic coding guide for the Signal CMO repository. This is a Next.js 16+ application with React 19 and TypeScript 5.9.

## Build & Development Commands

```bash
# Development
bun dev                 # Start dev server with Turbopack

# Production
bun build              # Build for production
bun start              # Start production server

# Quality checks
bun lint               # Run ESLint
bun typecheck          # TypeScript type checking (tsc --noEmit)
```

## Code Style Guidelines

### Imports
- Order: external libraries → internal modules (via `@/`)
- Use `import type { ... }` for type-only imports
- Prefer named imports over default imports
- Node built-ins use `node:` prefix: `import path from "node:path"`

```typescript
import { z } from "zod";                      // External
import type { NextConfig } from "next";       // Type import
import { runSeoAuditAgent } from "@/lib/agents/seoAuditAgent";  // Internal
```

### Formatting
- **No semicolons** (automatically handled)
- 2-space indentation
- Double quotes for strings
- Trailing commas in objects, arrays, function params
- Max line length: ~100 chars (soft)

### Naming Conventions
- `camelCase`: variables, functions, methods, properties
- `PascalCase`: components, types, interfaces, classes
- `UPPER_CASE`: constants, enum-like values
- `kebab-case`: file names, CSS classes

```typescript
// Good
const maxRetries = 3;
function formatUrl(value: string): string {}
interface AgentDescriptor {}
const API_TIMEOUT = 5000;
```

### TypeScript
- **Strict mode enabled** — no `any`, explicit types required
- Always provide explicit return types on exported functions
- Use `type` for unions/aliases, `interface` for object shapes
- Prefer `readonly` arrays and properties where immutable
- Use `satisfies` operator for type-safe constant assertions

```typescript
export async function fetchData(id: string): Promise<Result> {}
export type Status = "pending" | "running" | "completed";
export interface Config {
  readonly timeout: number;
  readonly endpoints: readonly string[];
}
```

### Error Handling
- Use try/catch with specific error messages
- Return early pattern for validation failures
- Never suppress errors silently

```typescript
try {
  const result = await fetchData();
  return result;
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return { error: message };
}
```

### React Patterns
- Components return `JSX.Element` explicitly
- Use `"use client"` directive for client components
- Import React hooks explicitly: `import { useState } from "react"`
- Destructure props in function signature

```typescript
"use client";

import type { JSX } from "react";
import { useState } from "react";

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  // ...
}
```

## Project Structure

```
app/                    # Next.js App Router
  api/                  # API route handlers
    analyze/route.ts
    report/[reportId]/route.ts
  agent/[reportId]/     # Dynamic report pages
  layout.tsx            # Root layout
  page.tsx              # Home page
  globals.css           # Global styles

components/             # React components
  url-intake-form.tsx
  report-client.tsx

lib/                    # Application logic
  agents/               # Analysis agents
  fetch/                # Data fetching utilities
  store/                # State management
  types/                # TypeScript definitions
  utils/                # Helper functions

next.config.ts          # Next.js configuration
eslint.config.mjs       # ESLint flat config
tsconfig.json           # TypeScript config
```

## Key Libraries

- **Framework**: Next.js 16, React 19
- **Validation**: Zod 4.x
- **Styling**: CSS Modules (globals.css) + CSS variables
- **Fonts**: next/font (Google Fonts)
- **HTTP**: Native fetch with AbortSignal.timeout()

## Environment Variables

See `.env.example` for required variables:
- `OPENROUTER_API_KEY` — AI model provider API key
- `OPENROUTER_MODEL` — Model identifier
- `OPENROUTER_BASE_URL` — API endpoint

## Path Aliases

All imports use `@/` prefix mapped to root:
- `@/lib/utils/url` → `./lib/utils/url`
- `@/components/button` → `./components/button`
- `@/lib/types/report` → `./lib/types/report`

## CSS Conventions

- CSS custom properties (variables) in `:root`
- Semantic naming: `--bg`, `--text`, `--accent`, `--danger`
- Utility-first classes with descriptive names
- Responsive breakpoints: 1024px, 720px

## Testing (Not Yet Configured)

To run a single test when testing is added:
```bash
# Vitest (recommended)
bun vitest run src/utils/url.test.ts

# Jest
bun jest src/utils/url.test.ts
```

## Notes for Agents

- Prefer pure functions with explicit inputs/outputs
- Use Zod schemas for runtime validation
- Keep API routes thin, delegate to lib/
- Always validate user input before processing
- Use `queueMicrotask` for non-blocking async work
- Global state managed via module-level Set/Map with `globalThis` pattern

## Learned User Preferences

- Prefer Bun for JavaScript package management; fall back to pnpm, then npm only if Bun cannot be used
- Do not start dev servers automatically; use production-style builds (for example, `bun run build`) to verify changes
- Avoid creating extra `.md` files; update existing docs like `AGENTS.md` or `README.md` only when necessary
- Avoid `any` in TypeScript and keep strict, explicit typing (including return types) throughout the codebase
- Keep comments minimal and focused on non-obvious intent, letting the code speak for itself
- Never hardcode API keys or external endpoints; always read them from `.env` files
- Use OpenRouter as the default AI provider, configured via `OPENROUTER_*` environment variables
- Use Exa (`exa.ai`) as the preferred fast research backend when adding external research capabilities
- Aim for premium, distinctive UI/UX; leverage design-taste/frontend skills and avoid generic AI-looking interfaces

## Learned Workspace Facts

- This repository implements an AI CMO / marketing console called Signal CMO using Next.js App Router, React, TypeScript, and Bun
- Marketing reports are persisted as JSON under the `.data/reports` directory and surfaced through API routes
- AI model integration is centralized in `lib/utils/model.ts` and uses OpenRouter via `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `OPENROUTER_BASE_URL`
- Exa fast research is integrated through a reusable wrapper and powers the community/research agent, with `EXA_API_KEY` configured via environment variables
- The analysis pipeline coordinates multiple agents (SEO, GEO/AI visibility, community research, content strategy) through an agent orchestrator
- Standard quality checks and builds are expected to run with Bun scripts: `bun run lint`, `bun run typecheck`, and `bun run build`
- The `.data` directory (including reports) is git-ignored and should not be tracked in version control
- The homepage and report dashboard have been restyled into a darker, terminal-like multi-panel console inspired by Okara’s AI CMO terminal
