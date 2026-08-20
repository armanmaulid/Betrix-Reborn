CREATE TABLE "ai_agents" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"model_name" varchar(255) NOT NULL,
	"base_url" varchar(500),
	"api_key" text,
	"task_type" varchar(100) DEFAULT 'trade_reasoning' NOT NULL,
	"system_prompt" text,
	"tier" varchar(50) DEFAULT 'deep' NOT NULL,
	"credits_per_1k_tokens" integer DEFAULT 1 NOT NULL,
	"max_tokens" integer DEFAULT 8192 NOT NULL,
	"temperature" integer DEFAULT 70 NOT NULL,
	"supports_thinking" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
