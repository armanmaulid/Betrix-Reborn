-- T6 market-data tables (FX spot, COT, commodities) — sourced from
-- FXMacroData's Professional tier (gated on FXMACRODATA_API_KEY in app code).
-- All three live in the `content` schema, consistent with calendar_events and
-- news_articles.
--
-- Index strategy: composite primary key (id) provides per-pair / per-day
-- uniqueness. The secondary (base, quote, trade_date) index supports the
-- most common read pattern (single pair + date range). The (currency,
-- trade_date) and (indicator, trade_date) indexes mirror that for COT
-- and commodities.

-- ── FX spot prices ────────────────────────────────────────────────────────
CREATE TABLE "content"."fx_spot_prices" (
  "id"            VARCHAR(64)     NOT NULL,
  "base"          VARCHAR(8)      NOT NULL,
  "quote"         VARCHAR(8)      NOT NULL,
  "trade_date"    DATE            NOT NULL,
  "open"          DOUBLE PRECISION,
  "high"          DOUBLE PRECISION,
  "low"           DOUBLE PRECISION,
  "close"         DOUBLE PRECISION NOT NULL,
  "unit"          VARCHAR(16),
  "sma_20"        DOUBLE PRECISION,
  "sma_50"        DOUBLE PRECISION,
  "sma_200"       DOUBLE PRECISION,
  "rsi_14"        DOUBLE PRECISION,
  "macd"          DOUBLE PRECISION,
  "macd_signal"   DOUBLE PRECISION,
  "macd_hist"     DOUBLE PRECISION,
  "ema_12"        DOUBLE PRECISION,
  "ema_26"        DOUBLE PRECISION,
  "bb_upper"      DOUBLE PRECISION,
  "bb_middle"     DOUBLE PRECISION,
  "bb_lower"      DOUBLE PRECISION,
  "created_at"    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT "fx_spot_prices_pkey" PRIMARY KEY ("id")
);
--> statement-breakpoint
CREATE INDEX "fx_spot_prices_pair_date_idx"
  ON "content"."fx_spot_prices" ("base", "quote", "trade_date");

-- ── COT positions ────────────────────────────────────────────────────────
CREATE TABLE "content"."cot_positions" (
  "id"                    VARCHAR(32)   NOT NULL,
  "currency"              VARCHAR(8)    NOT NULL,
  "trade_date"            DATE          NOT NULL,
  "commercial_long"       BIGINT,
  "commercial_short"      BIGINT,
  "commercial_net"        BIGINT,
  "noncommercial_long"    BIGINT,
  "noncommercial_short"   BIGINT,
  "noncommercial_net"     BIGINT,
  "total_open_interest"   BIGINT,
  "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT "cot_positions_pkey" PRIMARY KEY ("id")
);
--> statement-breakpoint
CREATE INDEX "cot_positions_currency_date_idx"
  ON "content"."cot_positions" ("currency", "trade_date");

-- ── Commodities ──────────────────────────────────────────────────────────
CREATE TABLE "content"."commodity_prices" (
  "id"            VARCHAR(64)     NOT NULL,
  "indicator"     VARCHAR(16)     NOT NULL,
  "trade_date"    DATE            NOT NULL,
  "close"         DOUBLE PRECISION NOT NULL,
  "open"          DOUBLE PRECISION,
  "high"          DOUBLE PRECISION,
  "low"           DOUBLE PRECISION,
  "unit"          VARCHAR(16),
  "created_at"    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT "commodity_prices_pkey" PRIMARY KEY ("id")
);
--> statement-breakpoint
CREATE INDEX "commodity_prices_indicator_date_idx"
  ON "content"."commodity_prices" ("indicator", "trade_date");
