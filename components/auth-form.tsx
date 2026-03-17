"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import type { FormEvent, JSX } from "react"
import { useMemo, useState } from "react"

import { authClient } from "@/lib/auth-client"

interface AuthFormProps {
  readonly mode: "sign-in" | "sign-up"
  readonly googleEnabled: boolean
}

export function AuthForm({ mode, googleEnabled }: AuthFormProps): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const redirectTo = useMemo(() => searchParams.get("next") ?? "/", [searchParams])
  const alternateHref = useMemo(() => {
    const nextQuery = searchParams.get("next")
    const basePath = mode === "sign-in" ? "/sign-up" : "/sign-in"

    return nextQuery ? `${basePath}?next=${encodeURIComponent(nextQuery)}` : basePath
  }, [mode, searchParams])

  const isSignUp = mode === "sign-up"

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const response = isSignUp
      ? await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: redirectTo,
        })
      : await authClient.signIn.email({
          email,
          password,
          callbackURL: redirectTo,
        })

    if (response.error) {
      setError(response.error.message ?? "Authentication failed.")
      setIsSubmitting(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  async function handleGoogleSignIn(): Promise<void> {
    setError(null)
    setIsSubmitting(true)

    const response = await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    })

    if (response.error) {
      setError(response.error.message ?? "Google sign-in is unavailable right now.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-card-shell">
      <div className="eyebrow">Workspace Access</div>
      <h1>{isSignUp ? "Create your Signal CMO workspace." : "Sign in to your Signal CMO workspace."}</h1>
      <p className="auth-copy">
        Use Better Auth with Neon-backed persistence so reports, workspaces, and access stay durable
        across Railway deploys.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {isSignUp ? (
          <label className="auth-field">
            <span>Name</span>
            <input
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada Lovelace"
              required
              value={name}
            />
          </label>
        ) : null}

        <label className="auth-field">
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="founder@company.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            required
            type="password"
            value={password}
          />
        </label>

        <button className="auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Working..." : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      {googleEnabled ? (
        <button className="auth-google-button" disabled={isSubmitting} onClick={handleGoogleSignIn} type="button">
          Continue with Google
        </button>
      ) : (
        <p className="auth-muted">Google OAuth will appear once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.</p>
      )}

      {error ? <p className="intake-error">{error}</p> : null}

      <p className="auth-switch-copy">
        {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <Link className="inline-link" href={alternateHref}>
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  )
}
