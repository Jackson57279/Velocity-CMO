import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"

type SessionData = NonNullable<typeof auth.$Infer.Session>

export async function getSession(): Promise<SessionData | null> {
  return auth.api.getSession({
    headers: await headers(),
  })
}

export async function requireSession(nextPath = "/sign-in"): Promise<SessionData> {
  const session = await getSession()

  if (!session) {
    redirect(nextPath)
  }

  return session
}

export function getActiveOrganizationId(session: SessionData): string | null {
  return session.session.activeOrganizationId ?? null
}

export async function requireActiveOrganization(nextPath = "/"): Promise<{
  session: SessionData
  activeOrganizationId: string
}> {
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
