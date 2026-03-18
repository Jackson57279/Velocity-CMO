import { relations, sql } from "drizzle-orm"
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

import type { BillingPlanKey, BillingSubscriptionStatus } from "@/lib/billing/config"
import type { JobStatus, MarketingReport } from "@/lib/types/report"
import { organization, user } from "@/lib/db/auth-schema"

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    submittedUrl: text("submitted_url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    hostname: text("hostname").notNull(),
    status: text("status").$type<JobStatus>().notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload").$type<MarketingReport>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("reports_organization_updated_idx").on(table.organizationId, table.updatedAt),
    index("reports_created_by_user_idx").on(table.createdByUserId),
  ],
)

export const analysisJobs = pgTable(
  "analysis_jobs",
  {
    reportId: text("report_id")
      .primaryKey()
      .references(() => reports.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: text("status").$type<JobStatus>().notNull().default("queued"),
    lockedAt: timestamp("locked_at"),
    lockedBy: text("locked_by"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("analysis_jobs_organization_status_idx").on(table.organizationId, table.status)],
)

export const organizationBilling = pgTable(
  "organization_billing",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    planKey: text("plan_key").$type<BillingPlanKey>().notNull().default("free"),
    subscriptionStatus: text("subscription_status")
      .$type<BillingSubscriptionStatus>()
      .notNull()
      .default("inactive"),
    polarCustomerId: text("polar_customer_id"),
    polarSubscriptionId: text("polar_subscription_id"),
    polarProductId: text("polar_product_id"),
    polarCheckoutId: text("polar_checkout_id"),
    creditsIncluded: integer("credits_included").notNull().default(3),
    creditsUsed: integer("credits_used").notNull().default(0),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("organization_billing_plan_idx").on(table.planKey),
    index("organization_billing_subscription_idx").on(table.subscriptionStatus),
  ],
)

export const billingUsageEvents = pgTable(
  "billing_usage_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    reportId: text("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    ingestedAt: timestamp("ingested_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("billing_usage_events_organization_idx").on(table.organizationId),
    index("billing_usage_events_status_idx").on(table.status),
    uniqueIndex("billing_usage_events_report_uidx").on(table.reportId),
  ],
)

export const reportRelations = relations(reports, ({ one }) => ({
  organization: one(organization, {
    fields: [reports.organizationId],
    references: [organization.id],
  }),
  createdByUser: one(user, {
    fields: [reports.createdByUserId],
    references: [user.id],
  }),
  analysisJob: one(analysisJobs, {
    fields: [reports.id],
    references: [analysisJobs.reportId],
  }),
}))

export const analysisJobRelations = relations(analysisJobs, ({ one }) => ({
  report: one(reports, {
    fields: [analysisJobs.reportId],
    references: [reports.id],
  }),
  organization: one(organization, {
    fields: [analysisJobs.organizationId],
    references: [organization.id],
  }),
}))

export const organizationBillingRelations = relations(organizationBilling, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationBilling.organizationId],
    references: [organization.id],
  }),
}))

export const billingUsageEventRelations = relations(billingUsageEvents, ({ one }) => ({
  organization: one(organization, {
    fields: [billingUsageEvents.organizationId],
    references: [organization.id],
  }),
  report: one(reports, {
    fields: [billingUsageEvents.reportId],
    references: [reports.id],
  }),
}))

export const staleJobInterval = sql.raw("interval '20 minutes'")
