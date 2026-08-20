CREATE TABLE "ohlc_symbols" (
	"symbol" varchar(50) PRIMARY KEY NOT NULL,
	"dukascopy_symbol" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ohlc_symbols_dukascopy_symbol_unique" UNIQUE("dukascopy_symbol")
);
--> statement-breakpoint
CREATE TABLE "stream_symbols" (
	"symbol" varchar(50) PRIMARY KEY NOT NULL,
	"finnhub_symbol" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stream_symbols_finnhub_symbol_unique" UNIQUE("finnhub_symbol")
);
