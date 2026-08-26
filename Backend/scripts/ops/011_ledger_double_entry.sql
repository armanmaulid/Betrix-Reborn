-- T5.2 — Double-entry ledger for financial audit trail
-- Every credit mutation (add/deduct/reserve/settle/redeem/admin-adjust) gets
-- a ledger entry. Balance = derived sum, never directly written.

CREATE TABLE IF NOT EXISTS "money"."ledger_entries" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id UUID NOT NULL,
  account VARCHAR(255) NOT NULL,          -- 'user:{userId}' or 'system:{source}'
  direction VARCHAR(6) NOT NULL CHECK (direction IN ('debit','credit')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'CRC',
  reference VARCHAR(255),                  -- action code e.g. AI_CHAT_SETTLE
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ledger_tx_account_uniq UNIQUE (tx_id, account)
);

CREATE INDEX idx_ledger_account_created ON "money"."ledger_entries" (account, created_at DESC);
CREATE INDEX idx_ledger_tx_id ON "money"."ledger_entries" (tx_id);

-- Append-only enforcement: no UPDATE or DELETE allowed
CREATE TRIGGER ledger_append_only
  BEFORE UPDATE OR DELETE ON "money"."ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION block_mutation();
