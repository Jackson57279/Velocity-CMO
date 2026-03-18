import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins/organization"

import { db } from "@/lib/db"
import {
  account,
  invitation,
  member,
  organization as organizationTable,
  session,
  user,
  verification,
} from "@/lib/db/auth-schema"

const baseURL =
  process.env.BETTER_AUTH_URL ?? process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000"

const trustedOriginsEnv = [
  process.env.BETTER_AUTH_URL,
  process.env.OPENROUTER_SITE_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : undefined,
].filter((value): value is string => typeof value === "string" && value.length > 0)

const trustedOrigins =
  trustedOriginsEnv.length > 0
    ? trustedOriginsEnv
    : [baseURL, "http://localhost:3000"]

const authSecret =
  process.env.BETTER_AUTH_SECRET ?? "development-only-secret-change-me-before-production"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

export const auth = betterAuth({
  appName: "Signal CMO",
  baseURL,
  trustedOrigins,
  secret: authSecret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      organization: organizationTable,
      member,
      invitation,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  plugins: [organization()],
})

export type AuthSession = typeof auth.$Infer.Session
