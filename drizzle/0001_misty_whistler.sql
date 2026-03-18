CREATE TABLE "billing_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"report_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"ingested_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_billing" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"plan_key" text DEFAULT 'free' NOT NULL,
	"subscription_status" text DEFAULT 'inactive' NOT NULL,
	"polar_customer_id" text,
	"polar_subscription_id" text,
	"polar_product_id" text,
	"polar_checkout_id" text,
	"credits_included" integer DEFAULT 3 NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_usage_events" ADD CONSTRAINT "billing_usage_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_usage_events" ADD CONSTRAINT "billing_usage_events_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_billing" ADD CONSTRAINT "organization_billing_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_usage_events_organization_idx" ON "billing_usage_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "billing_usage_events_status_idx" ON "billing_usage_events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_usage_events_report_uidx" ON "billing_usage_events" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "organization_billing_plan_idx" ON "organization_billing" USING btree ("plan_key");--> statement-breakpoint
CREATE INDEX "organization_billing_subscription_idx" ON "organization_billing" USING btree ("subscription_status");