import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins/organization"
import { checkout, polar, portal, usage, webhooks } from "@polar-sh/better-auth"

import { getPolarCheckoutProducts } from "@/lib/billing/config"
import { getPolarClient } from "@/lib/billing/polar"
import {
  handlePolarOrderPaid,
  handlePolarSubscriptionActive,
  handlePolarSubscriptionCanceled,
  handlePolarSubscriptionRevoked,
  handlePolarSubscriptionUpdated,
} from "@/lib/billing/polar-webhooks"
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
const polarClient = getPolarClient()
const polarProducts = getPolarCheckoutProducts()
const polarPlugins = polarClient
  ? [
      polar({
        client: polarClient,
        createCustomerOnSignUp: true,
        use: [
          checkout({
            products: polarProducts.length > 0 ? polarProducts : undefined,
            successUrl: "/?checkout_id={CHECKOUT_ID}",
            returnUrl: baseURL,
            authenticatedUsersOnly: true,
            theme: "dark",
          }),
          portal({
            returnUrl: baseURL,
            theme: "dark",
          }),
          usage(),
          ...(process.env.POLAR_WEBHOOK_SECRET
            ? [
                webhooks({
                  secret: process.env.POLAR_WEBHOOK_SECRET,
                  onOrderPaid: handlePolarOrderPaid,
                  onSubscriptionActive: handlePolarSubscriptionActive,
                  onSubscriptionUpdated: handlePolarSubscriptionUpdated,
                  onSubscriptionCanceled: handlePolarSubscriptionCanceled,
                  onSubscriptionRevoked: handlePolarSubscriptionRevoked,
                }),
              ]
            : []),
        ],
      }),
    ]
  : []

export const auth = betterAuth({
  appName: "Velocity CMO",
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
  plugins: [organization(), ...polarPlugins],
})

export type AuthSession = typeof auth.$Infer.Session
