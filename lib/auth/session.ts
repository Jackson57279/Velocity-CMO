import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"

type SessionData = NonNullable<typeof auth.$Infer.Session>

const DEV_ORG_ID = "dev-org-001"

const mockDevSession: SessionData = {
  session: {
    id: "dev-session-001",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "dev-user-001",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    token: "dev-token",
    ipAddress: "127.0.0.1",
    userAgent: "dev-agent",
    activeOrganizationId: DEV_ORG_ID,
  },
  user: {
    id: "dev-user-001",
    email: "dev@velocity.local",
    emailVerified: true,
    name: "Dev User",
    createdAt: new Date(),
    updatedAt: new Date(),
    image: null,
  },
}

function isDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS !== "false"
}

export async function getSession(): Promise<SessionData | null> {
  if (isDevBypassEnabled()) {
    return mockDevSession
  }

  return auth.api.getSession({
    headers: await headers(),
  })
}

export async function requireSession(nextPath = "/sign-in"): Promise<SessionData> {
  if (isDevBypassEnabled()) {
    return mockDevSession
  }

  const session = await getSession()

  if (!session) {
    redirect(nextPath)
  }

  return session
}

export function getActiveOrganizationId(session: SessionData): string | null {
  if (isDevBypassEnabled()) {
    return DEV_ORG_ID
  }
  return session.session.activeOrganizationId ?? null
}

export async function requireActiveOrganization(nextPath = "/"): Promise<{
  session: SessionData
  activeOrganizationId: string
}> {
  if (isDevBypassEnabled()) {
    return {
      session: mockDevSession,
      activeOrganizationId: DEV_ORG_ID,
    }
  }

  const session = await requireSession(nextPath)
  const activeOrganizationId = getActiveOrganizationId(session)

  if (!activeOrganizationId) {
    redirect("/")
  }

  return {
    session,
    activeOrganizationId,
  }
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}
