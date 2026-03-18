import { createAuthClient } from "better-auth/react"
import { polarClient } from "@polar-sh/better-auth/client"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient(), polarClient()],
})

export const { signIn, signOut, signUp, useSession } = authClient
