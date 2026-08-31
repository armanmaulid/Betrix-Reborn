-- D1 Phase 2 Slice 1 + B-7 — Better Auth schema namespace (`auth.*`).
--
-- The TS definitions in `packages/infra/src/auth/schemas.ts` were added
-- in Phase 0/1 before the migration file. This is the SQL that
-- `drizzle-kit generate` would have produced; written by hand because the
-- sandbox cannot run drizzle-kit against a live DB.
--
-- Hand-written to match drizzle-kit 0.31 output format (CREATE TABLE +
-- inline `--> statement-breakpoint` separators + FK alters). The 3 new
-- columns on `auth.user` (credits, tier, status) mirror the BA
-- `additionalFields` (isAdmin was removed in B-1).
--
-- Better Auth core fields preserved per BA 1.7.2 contract:
--   user:        id, name, email, email_verified, image, created_at, updated_at
--   session:     id, expires_at, token, created_at, updated_at, ip_address,
--                user_agent, user_id
--   account:     id, account_id, provider_id, user_id, access_token, refresh_token,
--                id_token, access_token_expires_at, refresh_token_expires_at,
--                scope, password, created_at, updated_at
--   verification: id, identifier, value, expires_at, created_at, updated_at
--
-- Naming: lowercase snake_case SQL ids, `gen_random_uuid()` for uuid PK
-- defaults (matches repo convention), timestamptz with `now()` defaults.

CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint

CREATE TABLE "auth"."user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "credits" integer DEFAULT 100 NOT NULL,
  "tier" varchar(50) DEFAULT 'free' NOT NULL,
  "status" varchar(50) DEFAULT 'active' NOT NULL,
  CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint

CREATE TABLE "auth"."session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" uuid NOT NULL,
  CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint

CREATE TABLE "auth"."account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" uuid NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_token_expires_at" timestamp with time zone,
  "scope" text,
  "password" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "auth"."verification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Foreign keys
ALTER TABLE "auth"."session" ADD CONSTRAINT "session_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "auth"."account" ADD CONSTRAINT "account_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Indexes (from the schema's (t) => [...] array callbacks)
CREATE INDEX "session_user_id_idx" ON "auth"."session" USING btree ("user_id");
--> statement-breakpoint

CREATE INDEX "session_expires_at_idx" ON "auth"."session" USING btree ("expires_at");
--> statement-breakpoint

CREATE INDEX "account_user_id_idx" ON "auth"."account" USING btree ("user_id");
--> statement-breakpoint

CREATE INDEX "account_provider_account_idx" ON "auth"."account" USING btree ("provider_id","account_id");
--> statement-breakpoint

CREATE INDEX "verification_identifier_idx" ON "auth"."verification" USING btree ("identifier");
--> statement-breakpoint

CREATE INDEX "verification_expires_at_idx" ON "auth"."verification" USING btree ("expires_at");
