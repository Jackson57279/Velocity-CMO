import { relations, sql } from "drizzle-orm"
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

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

export const staleJobInterval = sql.raw("interval '20 minutes'")
