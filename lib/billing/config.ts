export const BILLING_EVENT_NAME = "report-analyzed"
export const DEFAULT_FREE_CREDITS = 3
export const DEFAULT_PRO_CREDITS = 10
export const DEFAULT_TEAM_CREDITS = 50
export const DEFAULT_POLAR_SERVER = process.env.NODE_ENV === "production" ? "production" : "sandbox"

export type BillingPlanKey = "free" | "pro" | "team"
export type BillingSubscriptionStatus =
  | "inactive"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "revoked"

export interface BillingPlanDefinition {
  readonly key: BillingPlanKey
  readonly label: string
  readonly creditsPerMonth: number
  readonly productId: string | null
  readonly slug: string
}

export const BILLING_PLANS: Record<BillingPlanKey, BillingPlanDefinition> = {
  free: {
    key: "free",
    label: "Free",
    creditsPerMonth: DEFAULT_FREE_CREDITS,
    productId: process.env.POLAR_PRODUCT_ID_FREE ?? null,
    slug: "free",
  },
  pro: {
    key: "pro",
    label: "Pro",
    creditsPerMonth: DEFAULT_PRO_CREDITS,
    productId: process.env.POLAR_PRODUCT_ID_PRO ?? null,
    slug: "pro",
  },
  team: {
    key: "team",
    label: "Team",
    creditsPerMonth: DEFAULT_TEAM_CREDITS,
    productId: process.env.POLAR_PRODUCT_ID_TEAM ?? null,
    slug: "team",
  },
}

export function getBillingPlan(key: BillingPlanKey): BillingPlanDefinition {
  return BILLING_PLANS[key]
}

export function getBillingPlanByProductId(productId: string | null | undefined): BillingPlanDefinition | null {
  if (!productId) {
    return null
  }

  return Object.values(BILLING_PLANS).find((plan) => plan.productId === productId) ?? null
}

export function isPaidPlan(planKey: BillingPlanKey): boolean {
  return planKey !== "free"
}

export function getPolarCheckoutProducts(): Array<{ productId: string; slug: string }> {
  return Object.values(BILLING_PLANS)
    .filter((plan) => plan.productId)
    .map((plan) => ({
      productId: plan.productId!,
      slug: plan.slug,
    }))
}

export function getPolarServer(): "production" | "sandbox" {
  return process.env.POLAR_SERVER === "production" ? "production" : DEFAULT_POLAR_SERVER
}
