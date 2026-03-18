import { randomUUID } from "node:crypto"

import { and, eq, sql } from "drizzle-orm"

import {
  BILLING_EVENT_NAME,
  type BillingPlanDefinition,
  type BillingPlanKey,
  type BillingSubscriptionStatus,
  getBillingPlan,
  getBillingPlanByProductId,
  isPaidPlan,
} from "@/lib/billing/config"
import { db } from "@/lib/db"
import { billingUsageEvents, organizationBilling } from "@/lib/db/schema"

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<BillingSubscriptionStatus>(["active", "trialing", "past_due", "canceled"])

export interface OrganizationBillingSummary {
  readonly organizationId: string
  readonly planKey: BillingPlanKey
  readonly planLabel: string
  readonly subscriptionStatus: BillingSubscriptionStatus
  readonly creditsIncluded: number
  readonly creditsUsed: number
  readonly creditsRemaining: number
  readonly currentPeriodStart: string
  readonly currentPeriodEnd: string
  readonly polarCustomerId: string | null
  readonly polarSubscriptionId: string | null
  readonly hasPaidPlan: boolean
}

interface BillingRecord {
  readonly organizationId: string
  readonly planKey: BillingPlanKey
  readonly subscriptionStatus: BillingSubscriptionStatus
  readonly polarCustomerId: string | null
  readonly polarSubscriptionId: string | null
  readonly polarProductId: string | null
  readonly polarCheckoutId: string | null
  readonly creditsIncluded: number
  readonly creditsUsed: number
  readonly currentPeriodStart: Date
  readonly currentPeriodEnd: Date
  readonly lastSyncedAt: Date | null
}

interface SubscriptionSyncInput {
  readonly organizationId: string
  readonly status: BillingSubscriptionStatus
  readonly polarCustomerId: string | null
  readonly polarSubscriptionId: string | null
  readonly polarProductId: string | null
  readonly polarCheckoutId: string | null
  readonly currentPeriodStart: Date
  readonly currentPeriodEnd: Date
}

function getMonthlyPeriod(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  return { start, end }
}

function toSummary(record: BillingRecord): OrganizationBillingSummary {
  const plan = getBillingPlan(record.planKey)
  const creditsRemaining = Math.max(record.creditsIncluded - record.creditsUsed, 0)

  return {
    organizationId: record.organizationId,
    planKey: record.planKey,
    planLabel: plan.label,
    subscriptionStatus: record.subscriptionStatus,
    creditsIncluded: record.creditsIncluded,
    creditsUsed: record.creditsUsed,
    creditsRemaining,
    currentPeriodStart: record.currentPeriodStart.toISOString(),
    currentPeriodEnd: record.currentPeriodEnd.toISOString(),
    polarCustomerId: record.polarCustomerId,
    polarSubscriptionId: record.polarSubscriptionId,
    hasPaidPlan: isPaidPlan(record.planKey),
  }
}

function buildDefaultBillingRow(
  organizationId: string,
  plan: BillingPlanDefinition,
  now = new Date(),
): Omit<typeof organizationBilling.$inferInsert, "createdAt" | "updatedAt"> {
  const period = getMonthlyPeriod(now)

  return {
    organizationId,
    planKey: plan.key,
    subscriptionStatus: "inactive",
    creditsIncluded: plan.creditsPerMonth,
    creditsUsed: 0,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
  }
}

async function getBillingRecord(organizationId: string): Promise<BillingRecord | null> {
  const [record] = await db
    .select()
    .from(organizationBilling)
    .where(eq(organizationBilling.organizationId, organizationId))
    .limit(1)

  return record ?? null
}

async function ensureBillingRecord(organizationId: string): Promise<BillingRecord> {
  const existing = await getBillingRecord(organizationId)

  if (existing) {
    return existing
  }

  await db
    .insert(organizationBilling)
    .values(buildDefaultBillingRow(organizationId, getBillingPlan("free")))
    .onConflictDoNothing()

  const created = await getBillingRecord(organizationId)

  if (!created) {
    throw new Error("Billing record could not be initialized.")
  }

  return created
}

async function rolloverBillingPeriod(record: BillingRecord, now = new Date()): Promise<BillingRecord> {
  if (record.currentPeriodEnd > now) {
    return record
  }

  const nextPlan = ACTIVE_SUBSCRIPTION_STATUSES.has(record.subscriptionStatus) ? record.planKey : "free"
  const periodDurationMs = record.currentPeriodEnd.getTime() - record.currentPeriodStart.getTime()
  const period = ACTIVE_SUBSCRIPTION_STATUSES.has(record.subscriptionStatus)
    ? {
        start: record.currentPeriodEnd,
        end: new Date(record.currentPeriodEnd.getTime() + Math.max(periodDurationMs, 1)),
      }
    : getMonthlyPeriod(now)
  const nextPlanConfig = getBillingPlan(nextPlan)
  const nextStatus = ACTIVE_SUBSCRIPTION_STATUSES.has(record.subscriptionStatus)
    ? record.subscriptionStatus
    : "inactive"

  await db
    .update(organizationBilling)
    .set({
      planKey: nextPlan,
      subscriptionStatus: nextStatus,
      creditsIncluded: nextPlanConfig.creditsPerMonth,
      creditsUsed: 0,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      updatedAt: new Date(),
    })
    .where(eq(organizationBilling.organizationId, record.organizationId))

  const rolled = await getBillingRecord(record.organizationId)

  if (!rolled) {
    throw new Error("Billing record could not be refreshed.")
  }

  return rolled
}

export async function getOrganizationBillingSummary(
  organizationId: string,
): Promise<OrganizationBillingSummary> {
  const record = await ensureBillingRecord(organizationId)
  const current = await rolloverBillingPeriod(record)

  return toSummary(current)
}

export async function syncOrganizationBillingFromSubscription(
  input: SubscriptionSyncInput,
): Promise<OrganizationBillingSummary> {
  const existing = await ensureBillingRecord(input.organizationId)
  const plan = getBillingPlanByProductId(input.polarProductId) ?? getBillingPlan(existing.planKey)
  const shouldResetCredits =
    existing.currentPeriodStart.getTime() !== input.currentPeriodStart.getTime() ||
    existing.currentPeriodEnd.getTime() !== input.currentPeriodEnd.getTime() ||
    existing.planKey !== plan.key

  await db
    .insert(organizationBilling)
    .values({
      organizationId: input.organizationId,
      planKey: plan.key,
      subscriptionStatus: input.status,
      polarCustomerId: input.polarCustomerId,
      polarSubscriptionId: input.polarSubscriptionId,
      polarProductId: input.polarProductId,
      polarCheckoutId: input.polarCheckoutId,
      creditsIncluded: plan.creditsPerMonth,
      creditsUsed: shouldResetCredits ? 0 : existing.creditsUsed,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: organizationBilling.organizationId,
      set: {
        planKey: plan.key,
        subscriptionStatus: input.status,
        polarCustomerId: input.polarCustomerId,
        polarSubscriptionId: input.polarSubscriptionId,
        polarProductId: input.polarProductId,
        polarCheckoutId: input.polarCheckoutId,
        creditsIncluded: plan.creditsPerMonth,
        creditsUsed: shouldResetCredits ? 0 : existing.creditsUsed,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    })

  return getOrganizationBillingSummary(input.organizationId)
}

export async function downgradeOrganizationToFree(
  organizationId: string,
  status: BillingSubscriptionStatus,
): Promise<OrganizationBillingSummary> {
  const current = await ensureBillingRecord(organizationId)
  const freePlan = getBillingPlan("free")
  const nextPeriod = getMonthlyPeriod()

  await db
    .update(organizationBilling)
    .set({
      planKey: "free",
      subscriptionStatus: status,
      polarSubscriptionId: null,
      polarProductId: null,
      polarCheckoutId: null,
      creditsIncluded: freePlan.creditsPerMonth,
      creditsUsed: 0,
      currentPeriodStart: nextPeriod.start,
      currentPeriodEnd: nextPeriod.end,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizationBilling.organizationId, current.organizationId))

  return getOrganizationBillingSummary(organizationId)
}

export async function recordCompletedReportCreditUsage({
  organizationId,
  reportId,
}: {
  organizationId: string
  reportId: string
}): Promise<{
  readonly status: "consumed" | "already-recorded" | "insufficient-credits"
  readonly summary: OrganizationBillingSummary
}> {
  const [existingUsage] = await db
    .select()
    .from(billingUsageEvents)
    .where(eq(billingUsageEvents.reportId, reportId))
    .limit(1)

  const currentSummary = await getOrganizationBillingSummary(organizationId)

  if (existingUsage) {
    return {
      status: "already-recorded",
      summary: currentSummary,
    }
  }

  await db.insert(billingUsageEvents).values({
    id: randomUUID(),
    organizationId,
    reportId,
    status: "pending",
  })

  if (currentSummary.creditsRemaining <= 0) {
    await markBillingUsageEventFailed(reportId, "No credits remained when the report completed.")

    return {
      status: "insufficient-credits",
      summary: currentSummary,
    }
  }

  await db
    .update(organizationBilling)
    .set({
      creditsUsed: sql`${organizationBilling.creditsUsed} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationBilling.organizationId, organizationId),
        sql`${organizationBilling.creditsUsed} < ${organizationBilling.creditsIncluded}`,
      ),
    )

  const updatedSummary = await getOrganizationBillingSummary(organizationId)

  await db
    .update(billingUsageEvents)
    .set({
      status: "consumed",
      updatedAt: new Date(),
    })
    .where(eq(billingUsageEvents.reportId, reportId))

  return {
    status: "consumed",
    summary: updatedSummary,
  }
}

export async function markBillingUsageEventIngested(reportId: string): Promise<void> {
  await db
    .update(billingUsageEvents)
    .set({
      status: "ingested",
      ingestedAt: new Date(),
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(billingUsageEvents.reportId, reportId))
}

export async function markBillingUsageEventSkipped(reportId: string, message: string): Promise<void> {
  await db
    .update(billingUsageEvents)
    .set({
      status: "skipped",
      errorMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(billingUsageEvents.reportId, reportId))
}

export async function markBillingUsageEventFailed(reportId: string, message: string): Promise<void> {
  await db
    .update(billingUsageEvents)
    .set({
      status: "failed",
      errorMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(billingUsageEvents.reportId, reportId))
}

export function getBillingUsageEventName(): string {
  return BILLING_EVENT_NAME
}
