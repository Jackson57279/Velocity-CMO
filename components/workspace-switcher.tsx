"use client"

import { useRouter } from "next/navigation"
import type { FormEvent, JSX } from "react"
import { useMemo, useState } from "react"

import { authClient } from "@/lib/auth-client"
import { slugify } from "@/lib/utils/slug"

interface WorkspaceSwitcherProps {
  readonly userName: string
  readonly userEmail: string
}

export function WorkspaceSwitcher({
  userName,
  userEmail,
}: WorkspaceSwitcherProps): JSX.Element {
  const router = useRouter()
  const organizationState = authClient.useListOrganizations()
  const activeOrganizationState = authClient.useActiveOrganization()
  const organizations = useMemo(() => organizationState.data ?? [], [organizationState.data])
  const activeOrganization = activeOrganizationState.data
  const [workspaceName, setWorkspaceName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [switchingOrganizationId, setSwitchingOrganizationId] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsCreating(true)

    const trimmedName = workspaceName.trim()
    const slug = slugify(trimmedName) || `workspace-${Date.now()}`
    const response = await authClient.organization.create({
      name: trimmedName,
      slug,
    })

    if (response.error) {
      setError(response.error.message ?? "Workspace creation failed.")
      setIsCreating(false)
      return
    }

    const organizationId = response.data?.id

    if (organizationId) {
      await authClient.organization.setActive({
        organizationId,
      })
    }

    setWorkspaceName("")
    setIsCreating(false)
    router.refresh()
  }

  async function handleSetActiveOrganization(organizationId: string): Promise<void> {
    setError(null)
    setSwitchingOrganizationId(organizationId)

    const response = await authClient.organization.setActive({
      organizationId,
    })

    if (response.error) {
      setError(response.error.message ?? "Could not switch workspaces.")
      setSwitchingOrganizationId(null)
      return
    }

    setSwitchingOrganizationId(null)
    router.refresh()
  }

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true)
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <div>
          <span className="workspace-label">Signed in</span>
          <h2>{userName}</h2>
          <p>{userEmail}</p>
        </div>
        <button className="workspace-signout" disabled={isSigningOut} onClick={handleSignOut} type="button">
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      <div className="workspace-active-card">
        <span className="workspace-label">Active workspace</span>
        <strong>{activeOrganization?.name ?? "No workspace selected"}</strong>
        <p>
          {activeOrganization
            ? "New audits and report history will be scoped to this workspace."
            : "Create or select a workspace to unlock report storage and analysis runs."}
        </p>
      </div>

      <div className="workspace-list">
        {organizations.length > 0 ? (
          organizations.map((organization) => {
            const isActive = organization.id === activeOrganization?.id
            const isSwitching = organization.id === switchingOrganizationId

            return (
              <button
                className={`workspace-chip ${isActive ? "workspace-chip-active" : ""}`}
                disabled={isActive || isSwitching}
                key={organization.id}
                onClick={() => void handleSetActiveOrganization(organization.id)}
                type="button"
              >
                <span>{organization.name}</span>
                <small>{isActive ? "Active" : isSwitching ? "Switching..." : "Switch"}</small>
              </button>
            )
          })
        ) : (
          <p className="empty-state">No workspace exists yet. Create the first one below.</p>
        )}
      </div>

      <form className="workspace-form" onSubmit={handleCreateWorkspace}>
        <label className="auth-field">
          <span>New workspace</span>
          <input
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Acme Growth Team"
            required
            value={workspaceName}
          />
        </label>
        <button className="auth-submit" disabled={isCreating} type="submit">
          {isCreating ? "Creating..." : "Create workspace"}
        </button>
      </form>

      {organizationState.isPending || activeOrganizationState.isPending ? (
        <p className="auth-muted">Loading workspace state...</p>
      ) : null}

      {error ? <p className="intake-error">{error}</p> : null}
    </section>
  )
}
