import type { Metadata } from "next"
import type { JSX } from "react"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth-form"
import { getSession, isGoogleAuthConfigured } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Signal CMO | Sign Up",
  description: "Create a Signal CMO account with a shared workspace and persistent reports.",
}

export default async function SignUpPage(): Promise<JSX.Element> {
  const session = await getSession()

  if (session) {
    redirect("/")
  }

  return (
    <main className="auth-page-shell">
      <AuthForm googleEnabled={isGoogleAuthConfigured()} mode="sign-up" />
    </main>
  )
}
