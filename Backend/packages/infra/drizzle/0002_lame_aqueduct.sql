CREATE TABLE "credit_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"amount" integer NOT NULL,
	"created_by_id" uuid,
	"is_redeemed" boolean DEFAULT false NOT NULL,
	"redeemed_by_id" uuid,
	"redeemed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_vouchers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "credit_vouchers" ADD CONSTRAINT "credit_vouchers_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_vouchers" ADD CONSTRAINT "credit_vouchers_redeemed_by_id_users_id_fk" FOREIGN KEY ("redeemed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;