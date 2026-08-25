CREATE TABLE "worker_states" (
	"worker_id" varchar(100) PRIMARY KEY NOT NULL,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"last_command" varchar(20),
	"last_command_at" timestamp with time zone,
	"last_command_by" uuid,
	"last_report_at" timestamp with time zone,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"currency" varchar(10) NOT NULL,
	"event_code" varchar(150) NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"reference_period_date" varchar(20),
	"announcement_unix" integer NOT NULL,
	"announcement_datetime_utc" varchar(40) NOT NULL,
	"announcement_datetime_local" varchar(40) NOT NULL,
	"importance" varchar(10) NOT NULL,
	"market_tier" integer NOT NULL,
	"is_top_tier" boolean DEFAULT false NOT NULL,
	"source_name" varchar(255),
	"source_url" text,
	"before_value" double precision,
	"forecast_value" double precision,
	"forecast_type" varchar(30),
	"actual_value" double precision,
	"has_official_forecast" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_currency_code_unix_unique" UNIQUE("currency","event_code","announcement_unix")
);
--> statement-breakpoint
ALTER TABLE "worker_states" ADD CONSTRAINT "worker_states_last_command_by_users_id_fk" FOREIGN KEY ("last_command_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_currency_unix_idx" ON "calendar_events" USING btree ("currency","announcement_unix");