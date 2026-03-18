import type { Metadata } from "next"
import type { JSX } from "react"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth-form"
import { isGoogleAuthConfigured } from "@/lib/auth/session"
import { getSession } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Velocity CMO | Sign In",
  description: "Access your Velocity CMO workspace and persistent growth reports.",
}

export default async function SignInPage(): Promise<JSX.Element> {
  const session = await getSession()

  if (session) {
    redirect("/")
  }

  return (
    <main className="auth-page-shell">
      <AuthForm googleEnabled={isGoogleAuthConfigured()} mode="sign-in" />
    </main>
  )
}
